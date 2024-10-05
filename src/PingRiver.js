import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import moment from 'moment';
import './PingRiver.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PingRiver = () => {
  const [data, setData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dateToday = moment().format('YYYY-MM-DD');
        const dateStart = moment().subtract(7, 'days').format('YYYY-MM-DD');
        const downloadUrl = `http://localhost:5000/proxy?datestart=${dateStart}&dateend=${dateToday}`;
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) {
          throw new Error('Failed to download file');
        }
        const fileResponse = await fetch('http://localhost:5000/download');
        if (!fileResponse.ok) {
          throw new Error('Failed to fetch the saved file');
        }
        const arrayBuffer = await fileResponse.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setData(jsonData);
        setDisplayData(jsonData.slice(0, visibleCount));
        
        const predictedData = generatePredictions(jsonData);
        setPredictions(predictedData);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
      }
    };
    fetchData();
  }, [visibleCount]);

  const generatePredictions = (historicalData) => {
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
  };

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
      <h3>Ping River Water Level Prediction</h3>
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
