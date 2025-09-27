import React, { useState, useEffect } from 'react';
import { FaCloudRain, FaSync, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import dataSourceService from '../services/dataSourceService';

const WeatherPanel = ({ addNotification }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [rainfallSummary, setRainfallSummary] = useState(null);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      const allData = await dataSourceService.fetchAllData();

      if (allData.success && allData.rawData?.ping?.data?.rainfall) {
        const rainfallData = allData.rawData.ping.data.rainfall;
        const summary = dataSourceService.getRainfallSummary(rainfallData);

        setWeatherData(allData.rawData.ping.data);
        setRainfallSummary(summary);

        if (addNotification) {
          addNotification('success', 'Weather Updated', 'Latest weather data loaded');
        }
      } else {
        throw new Error('No weather data available');
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      if (addNotification) {
        addNotification('error', 'Weather Error', 'Failed to load weather data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();

    // Auto-refresh every 1 minute
    const interval = setInterval(() => {
      if (!loading) {
        fetchWeatherData();
      }
    }, 60000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRainfallIcon = (status) => {
    switch (status) {
      case 'No rain': return '☀️';
      case 'Light rain': return '🌦️';
      case 'Moderate rain': return '🌧️';
      case 'Heavy rain': return '⛈️';
      default: return '🌤️';
    }
  };

  const getRainfallColor = (status) => {
    switch (status) {
      case 'No rain': return '#ffd700';
      case 'Light rain': return '#87ceeb';
      case 'Moderate rain': return '#4169e1';
      case 'Heavy rain': return '#dc143c';
      default: return '#ccc';
    }
  };

  return (
    <div className="weather-panel">
      <div className="weather-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FaCloudRain style={{ marginRight: '8px' }} />
          Weather & Rainfall
        </h3>
        <div className="weather-controls">
          <button
            className="refresh-button"
            onClick={(e) => {
              e.stopPropagation();
              fetchWeatherData();
            }}
            disabled={loading}
            title="Refresh Weather Data"
          >
            <FaSync className={loading ? 'spinning' : ''} />
          </button>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      {isExpanded && (
        <div className="weather-content">
          {rainfallSummary ? (
            <>
              <div className="weather-summary">
                <div className="weather-current">
                  <div className="weather-icon">
                    {getRainfallIcon(rainfallSummary.status)}
                  </div>
                  <div className="weather-info">
                    <div className="current-rainfall">
                      {rainfallSummary.current} mm
                    </div>
                    <div
                      className="rainfall-status"
                      style={{ color: getRainfallColor(rainfallSummary.status) }}
                    >
                      {rainfallSummary.status}
                    </div>
                  </div>
                </div>

                <div className="weather-stats">
                  <div className="stat-item">
                    <div className="stat-label">Today</div>
                    <div className="stat-value">{rainfallSummary.today.toFixed(1)} mm</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Last 24h</div>
                    <div className="stat-value">{rainfallSummary.last24h.toFixed(1)} mm</div>
                  </div>
                </div>
              </div>

              {rainfallSummary.timestamp && (
                <div className="weather-timestamp">
                  Last updated: {new Date(rainfallSummary.timestamp).toLocaleString()}
                </div>
              )}

              <div className="rainfall-chart">
                <h4>Rainfall Trend</h4>
                <div className="chart-placeholder">
                  {weatherData?.rainfall?.slice(0, 12).map((item, index) => (
                    <div key={index} className="rainfall-bar">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${Math.min((item.value / 50) * 100, 100)}%`,
                          backgroundColor: getRainfallColor(dataSourceService.getRainfallStatus(item.value))
                        }}
                        title={`${item.value}mm at ${new Date(item.timestamp).toLocaleTimeString()}`}
                      ></div>
                      <div className="bar-time">
                        {new Date(item.timestamp).toLocaleTimeString('en', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="weather-alerts">
                {rainfallSummary.current > 30 && (
                  <div className="alert alert-warning">
                    ⚠️ Heavy rainfall detected! Monitor water levels closely.
                  </div>
                )}
                {rainfallSummary.today > 100 && (
                  <div className="alert alert-danger">
                    🚨 Extreme rainfall today! High flood risk!
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="weather-loading">
              <FaSync className={loading ? 'spinning' : ''} />
              <p>{loading ? 'Loading weather data...' : 'No weather data available'}</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .weather-panel {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #333;
        }

        .weather-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .weather-header h3 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .weather-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .refresh-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .refresh-button:hover {
          background: #0056b3;
        }

        .weather-content {
          margin-top: 15px;
        }

        .weather-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .weather-current {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .weather-icon {
          font-size: 48px;
        }

        .weather-info .current-rainfall {
          font-size: 24px;
          font-weight: bold;
          color: #fff;
        }

        .weather-info .rainfall-status {
          font-size: 14px;
          font-weight: 500;
        }

        .weather-stats {
          display: flex;
          gap: 20px;
        }

        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 10px 15px;
          border-radius: 8px;
          min-width: 80px;
        }

        .stat-label {
          color: #ccc;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .stat-value {
          color: #fff;
          font-size: 16px;
          font-weight: bold;
        }

        .weather-timestamp {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .rainfall-chart h4 {
          color: #fff;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .chart-placeholder {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          height: 80px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
          padding: 10px;
        }

        .rainfall-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar-fill {
          width: 100%;
          background: #4169e1;
          border-radius: 2px;
          min-height: 2px;
          transition: height 0.3s ease;
        }

        .bar-time {
          color: #999;
          font-size: 9px;
          margin-top: 5px;
          transform: rotate(-45deg);
          white-space: nowrap;
        }

        .weather-alerts {
          margin-top: 15px;
        }

        .alert {
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .alert-warning {
          background: rgba(255, 193, 7, 0.2);
          border: 1px solid #ffc107;
          color: #ffc107;
        }

        .alert-danger {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid #dc3545;
          color: #dc3545;
        }

        .weather-loading {
          text-align: center;
          padding: 20px;
          color: #ccc;
        }

        .weather-loading svg {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WeatherPanel;