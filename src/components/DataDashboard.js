import React, { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaWater, FaEye, FaExpand, FaCompress } from 'react-icons/fa';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import dataSourceService from '../services/dataSourceService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DataDashboard = ({ addNotification }) => {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChart, setActiveChart] = useState('waterLevel');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Update every minute
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await dataSourceService.fetchAllData();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (addNotification) {
        addNotification('error', 'Dashboard Error', 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getWaterLevelChartData = () => {
    if (!dashboardData.rawData?.ping?.data?.waterLevel) return null;

    const data = dashboardData.rawData.ping.data.waterLevel.slice(0, 20);

    return {
      labels: data.map(item => new Date(item.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Water Level (m)',
          data: data.map(item => item.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  const getRainfallChartData = () => {
    if (!dashboardData.rawData?.ping?.data?.rainfall) return null;

    const data = dashboardData.rawData.ping.data.rainfall.slice(0, 12);

    return {
      labels: data.map(item => new Date(item.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Rainfall (mm)',
          data: data.map(item => item.value),
          backgroundColor: [
            '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
            '#f97316', '#84cc16', '#6366f1', '#64748b'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  const getStationStatusData = () => {
    if (!dashboardData.stations) return null;

    const statusCounts = dashboardData.stations.reduce((acc, station) => {
      acc[station.status] = (acc[station.status] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      normal: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      low: '#06b6d4'
    };

    return {
      labels: Object.keys(statusCounts).map(status => status.charAt(0).toUpperCase() + status.slice(1)),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(status => colors[status] || '#64748b'),
          borderWidth: 2,
          borderColor: '#1e293b'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e2e8f0' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#e2e8f0' }
      }
    }
  };

  const getActiveChartComponent = () => {
    switch (activeChart) {
      case 'waterLevel':
        const waterData = getWaterLevelChartData();
        return waterData ? (
          <Line data={waterData} options={chartOptions} />
        ) : (
          <div className="no-data">No water level data available</div>
        );

      case 'rainfall':
        const rainData = getRainfallChartData();
        return rainData ? (
          <Bar data={rainData} options={chartOptions} />
        ) : (
          <div className="no-data">No rainfall data available</div>
        );

      case 'stations':
        const stationData = getStationStatusData();
        return stationData ? (
          <Doughnut data={stationData} options={doughnutOptions} />
        ) : (
          <div className="no-data">No station data available</div>
        );

      default:
        return <div className="no-data">Select a chart to view</div>;
    }
  };

  const getDataSummary = () => {
    if (!dashboardData.stations) return null;

    const totalStations = dashboardData.stations.length;
    const normalStations = dashboardData.stations.filter(s => s.status === 'normal').length;
    const warningStations = dashboardData.stations.filter(s => s.status === 'warning').length;
    const dangerStations = dashboardData.stations.filter(s => s.status === 'danger').length;

    return {
      total: totalStations,
      normal: normalStations,
      warning: warningStations,
      danger: dangerStations
    };
  };

  const summary = getDataSummary();

  return (
    <div className="data-dashboard">
      <div className="dashboard-header">
        <h3>
          <FaChartLine style={{ marginRight: '8px' }} />
          Data Analytics Dashboard
        </h3>
        <button
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse Dashboard' : 'Expand Dashboard'}
        >
          {isExpanded ? <FaCompress /> : <FaExpand />}
        </button>
      </div>

      {summary && (
        <div className="data-summary">
          <div className="summary-card">
            <div className="summary-value">{summary.total}</div>
            <div className="summary-label">Total Stations</div>
          </div>
          <div className="summary-card normal">
            <div className="summary-value">{summary.normal}</div>
            <div className="summary-label">Normal</div>
          </div>
          <div className="summary-card warning">
            <div className="summary-value">{summary.warning}</div>
            <div className="summary-label">Warning</div>
          </div>
          <div className="summary-card danger">
            <div className="summary-value">{summary.danger}</div>
            <div className="summary-label">Danger</div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="dashboard-content">
          <div className="chart-selector">
            <button
              className={`selector-btn ${activeChart === 'waterLevel' ? 'active' : ''}`}
              onClick={() => setActiveChart('waterLevel')}
            >
              <FaWater /> Water Level
            </button>
            <button
              className={`selector-btn ${activeChart === 'rainfall' ? 'active' : ''}`}
              onClick={() => setActiveChart('rainfall')}
            >
              <FaChartBar /> Rainfall
            </button>
            <button
              className={`selector-btn ${activeChart === 'stations' ? 'active' : ''}`}
              onClick={() => setActiveChart('stations')}
            >
              <FaEye /> Station Status
            </button>
          </div>

          <div className="chart-container">
            {loading ? (
              <div className="loading-chart">
                <div className="spinner"></div>
                <p>Loading chart data...</p>
              </div>
            ) : (
              getActiveChartComponent()
            )}
          </div>

          {dashboardData.lastUpdate && (
            <div className="dashboard-footer">
              <small>Last updated: {new Date(dashboardData.lastUpdate).toLocaleString()}</small>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .data-dashboard {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #333;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .dashboard-header h3 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .expand-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .expand-button:hover {
          background: #0056b3;
        }

        .data-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          border: 1px solid #555;
        }

        .summary-card.normal {
          border-color: #10b981;
        }

        .summary-card.warning {
          border-color: #f59e0b;
        }

        .summary-card.danger {
          border-color: #ef4444;
        }

        .summary-value {
          font-size: 20px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 4px;
        }

        .summary-label {
          font-size: 12px;
          color: #ccc;
        }

        .chart-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .selector-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #ccc;
          border: 1px solid #555;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .selector-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .selector-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .chart-container {
          height: 300px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .loading-chart {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #ccc;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        .no-data {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          font-style: italic;
        }

        .dashboard-footer {
          text-align: center;
          color: #999;
          border-top: 1px solid #333;
          padding-top: 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .data-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .chart-selector {
            flex-direction: column;
          }

          .chart-container {
            height: 250px;
          }
        }
      `}</style>
    </div>
  );
};

export default DataDashboard;