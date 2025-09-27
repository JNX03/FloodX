import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import moment from 'moment';
import { FaDownload, FaArrowLeft, FaSync } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './PingRiver.css';
import dataSourceService from './services/dataSourceService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PingRiver = ({ addNotification }) => {
  const [data, setData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generatePredictions = useCallback((historicalData) => {
    const waterLevels = historicalData.map(entry => {
      const waterLevelKey = Object.keys(entry).find(key => key.includes('ระดับน้ำ'));
      return parseFloat(entry[waterLevelKey]);
    }).filter(level => !isNaN(level));

    const recentTrend = calculateRecentTrend(waterLevels);
    const lastWaterLevel = waterLevels[waterLevels.length - 1];

    const predictions = [];
    const lastTimestamp = moment(historicalData[historicalData.length - 1]['เวลา'], ['DD/MM/YYYY HH:mm', 'HH:mm น.']);

    for (let i = 1; i <= 24; i++) {
      const predictedTimestamp = lastTimestamp.clone().add(i, 'hours');
      let predictedValue = lastWaterLevel + (recentTrend * i) + (Math.random() - 0.5) * 0.05;
      const maxChange = 0.1;
      predictedValue = Math.max(lastWaterLevel - maxChange, Math.min(lastWaterLevel + maxChange, predictedValue));
      
      predictions.push({
        time: predictedTimestamp.isValid() ? predictedTimestamp.format('DD/MM/YYYY HH:mm') : 'Invalid date',
        value: Number(predictedValue.toFixed(2))
      });
    }

    return predictions;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the data source service with caching
        const allData = await dataSourceService.fetchPingData();

        if (!allData.success) {
          throw new Error(allData.error || 'Failed to fetch data');
        }

        // Transform the new API data to match the old format
        const transformedData = [];

        if (allData.data.waterLevel) {
          allData.data.waterLevel.forEach(item => {
            transformedData.push({
              'เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
              'ระดับน้ำ (ม.)': item.value.toString(),
              station_id: item.station_id,
              data_type: 'water_level'
            });
          });
        }

        // Sort by timestamp (most recent first)
        transformedData.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        setData(transformedData);
        setDisplayData(transformedData.slice(0, visibleCount));

        const predictedData = generatePredictions(transformedData);
        setPredictions(predictedData);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        if (addNotification) {
          addNotification('error', 'Data Fetch Failed', 'Unable to load Ping River data');
        }
      }
    };
    fetchData();
  }, [visibleCount, addNotification, generatePredictions]);

  const calculateRecentTrend = (waterLevels) => {
    const recentLevels = waterLevels.slice(-24);
    let totalChange = 0;
    for (let i = 1; i < recentLevels.length; i++) {
      totalChange += recentLevels[i] - recentLevels[i-1];
    }
    return totalChange / (recentLevels.length - 1);
  };

  const loadMoreData = () => {
    setVisibleCount(visibleCount + 10);
  };

  const exportToExcel = () => {
    try {
      const exportData = data.map(entry => {
        const waterLevelKey = Object.keys(entry).find(key => key.includes('ระดับน้ำ'));
        return {
          'Time': entry['เวลา'],
          'Water Level (m)': entry[waterLevelKey]
        };
      });

      const predictionsData = predictions.map(pred => ({
        'Time': pred.time,
        'Predicted Water Level (m)': pred.value
      }));

      const workbook = XLSX.utils.book_new();
      
      // Historical data sheet
      const historySheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, historySheet, 'Historical Data');
      
      // Predictions sheet
      const predictionsSheet = XLSX.utils.json_to_sheet(predictionsData);
      XLSX.utils.book_append_sheet(workbook, predictionsSheet, 'Predictions');
      
      // Summary sheet
      const summaryData = [{
        'Export Date': new Date().toLocaleString(),
        'Total Historical Records': data.length,
        'Total Predictions': predictions.length,
        'Data Source': 'Ping River Level - FloodX',
        'Prediction Algorithm': 'Trend-based with random variance'
      }];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      const fileName = `ping-river-data-${moment().format('YYYY-MM-DD-HHmm')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      if (addNotification) {
        addNotification('success', 'Data Exported', `Downloaded as ${fileName}`);
      }
    } catch (error) {
      if (addNotification) {
        addNotification('error', 'Export Failed', 'Unable to export data to Excel');
      }
    }
  };

  const exportToJSON = () => {
    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          source: 'Ping River Level - FloodX',
          totalRecords: data.length,
          totalPredictions: predictions.length
        },
        historicalData: data.map(entry => {
          const waterLevelKey = Object.keys(entry).find(key => key.includes('ระดับน้ำ'));
          return {
            time: entry['เวลา'],
            waterLevel: parseFloat(entry[waterLevelKey]),
            raw: entry
          };
        }),
        predictions: predictions.map(pred => ({
          time: pred.time,
          predictedWaterLevel: pred.value
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ping-river-data-${moment().format('YYYY-MM-DD-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (addNotification) {
        addNotification('success', 'Data Exported', 'Downloaded as JSON file');
      }
    } catch (error) {
      if (addNotification) {
        addNotification('error', 'Export Failed', 'Unable to export data to JSON');
      }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache to force fresh data on manual refresh
      dataSourceService.cache = {};

      // Use the data source service
      const allData = await dataSourceService.fetchPingData();

      if (!allData.success) {
        throw new Error(allData.error || 'Failed to fetch data');
      }

      // Transform the new API data to match the old format
      const transformedData = [];

      if (allData.data.waterLevel) {
        allData.data.waterLevel.forEach(item => {
          transformedData.push({
            'เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
            'ระดับน้ำ (ม.)': item.value.toString(),
            station_id: item.station_id,
            data_type: 'water_level'
          });
        });
      }

      // Sort by timestamp (most recent first)
      transformedData.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setData(transformedData);
      setDisplayData(transformedData.slice(0, visibleCount));

      const predictedData = generatePredictions(transformedData);
      setPredictions(predictedData);
      setError(null);

      if (addNotification) {
        addNotification('success', 'Data Refreshed', 'Latest data has been loaded');
      }
    } catch (err) {
      setError('Failed to refresh data. Please try again later.');
      if (addNotification) {
        addNotification('error', 'Refresh Failed', 'Unable to load latest data');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const chartData = {
    labels: [...data.map(entry => entry['เวลา']), ...predictions.map(pred => pred.time)],
    datasets: [
      {
        label: 'Historical Water Level',
        data: data.map(entry => {
          const waterLevelKey = Object.keys(entry).find(key => key.includes('ระดับน้ำ'));
          return parseFloat(entry[waterLevelKey]);
        }).filter(level => !isNaN(level)),
        borderColor: 'blue',
        fill: false,
      },
      {
        label: 'Predicted Water Level',
        data: [...Array(data.length).fill(null), ...predictions.map(pred => pred.value)],
        borderColor: 'red',
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff'
        }
      },
      title: {
        display: true,
        text: 'Ping River Water Level - Historical and Predicted',
        color: '#ffffff'
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: '#ffffff'
        },
        ticks: {
          color: '#ffffff'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Water Level (m)',
          color: '#ffffff'
        },
        ticks: {
          color: '#ffffff'
        }
      },
    },
  };

  return (
    <div className="ping-river-container">
      <div className="ping-river-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            <FaArrowLeft /> Back to Map
          </Link>
          <div className="page-title">
            <h2>📊 Ping River Analytics</h2>
            <p>AI-Powered Water Level Prediction & Analysis</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="action-button refresh-btn" 
            onClick={refreshData}
            disabled={isRefreshing}
            title="Refresh Data"
          >
            <FaSync className={isRefreshing ? 'spinning' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="export-dropdown">
            <button className="action-button export-btn">
              <FaDownload /> Export Data
            </button>
            <div className="dropdown-content">
              <button onClick={exportToExcel}>📊 Excel Format</button>
              <button onClick={exportToJSON}>💾 JSON Format</button>
            </div>
          </div>
        </div>
      </div>
      {error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <div className="chart-container">
            <Line data={chartData} options={options} />
          </div>
          <div className="table-container">
            <h3>Previous Water Level Data</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Water Level (m)</th>
                </tr>
              </thead>
              <tbody>
                {displayData.slice().reverse().map((entry, index) => {
                  const waterLevelKey = Object.keys(entry).find(key => key.includes('ระดับน้ำ'));
                  return (
                    <tr 
                      key={index} 
                      className={index === 0 ? 'highlight-row' : ''}
                    >
                      <td>{entry['เวลา']}</td>
                      <td>{entry[waterLevelKey]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleCount < data.length && (
              <button onClick={loadMoreData} className="load-more-button">Load More</button>
            )}
          </div>
          <div className="predictions-container">
            <h3>Predicted Water Levels (Next 24 Hours)</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Predicted Water Level (m)</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred, index) => (
                  <tr key={index}>
                    <td>{pred.time}</td>
                    <td>{pred.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PingRiver;
