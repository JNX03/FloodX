import React, { useState, useEffect } from 'react';
import { FaMapMarkedAlt, FaWater, FaExclamationTriangle, FaEye, FaExpand, FaCompress } from 'react-icons/fa';
// import dataSourceService from '../services/dataSourceService'; // Future use

const FloodZoneVisualization = ({ addNotification, stationData }) => {
  const [floodZones, setFloodZones] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  // Mock flood zones data based on water levels
  useEffect(() => {
    if (stationData && Object.keys(stationData).length > 0) {
      const zones = Object.entries(stationData).map(([code, data], index) => {
        const waterLevel = parseFloat(data.data?.[0]?.waterlevelvalue) || 0;
        let riskLevel = 'low';
        let riskColor = '#10b981';

        if (waterLevel > 305) {
          riskLevel = 'extreme';
          riskColor = '#dc2626';
        } else if (waterLevel > 304.5) {
          riskLevel = 'high';
          riskColor = '#ea580c';
        } else if (waterLevel > 304) {
          riskLevel = 'medium';
          riskColor = '#d97706';
        } else if (waterLevel > 303.5) {
          riskLevel = 'low';
          riskColor = '#059669';
        }

        return {
          id: code,
          name: `Zone ${code}`,
          waterLevel,
          riskLevel,
          riskColor,
          population: Math.floor(Math.random() * 50000) + 10000,
          area: Math.floor(Math.random() * 100) + 20,
          lastUpdate: data.data?.[0]?.hourlydateString || new Date().toLocaleString()
        };
      });

      setFloodZones(zones);
    }
  }, [stationData]);

  const getRiskDescription = (level) => {
    switch (level) {
      case 'extreme': return 'Immediate evacuation required';
      case 'high': return 'High flood risk - stay alert';
      case 'medium': return 'Moderate flood risk - monitor';
      case 'low': return 'Low flood risk - normal conditions';
      default: return 'Unknown risk level';
    }
  };

  const getZoneStats = () => {
    const stats = floodZones.reduce((acc, zone) => {
      acc[zone.riskLevel] = (acc[zone.riskLevel] || 0) + 1;
      acc.totalPopulation = (acc.totalPopulation || 0) + zone.population;
      acc.totalArea = (acc.totalArea || 0) + zone.area;
      return acc;
    }, {});

    return stats;
  };

  const stats = getZoneStats();

  return (
    <div className="flood-zone-visualization">
      <div className="zone-header">
        <h3>
          <FaMapMarkedAlt style={{ marginRight: '8px' }} />
          Flood Risk Zones
        </h3>
        <button
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse Zones' : 'Expand Zones'}
        >
          {isExpanded ? <FaCompress /> : <FaExpand />}
        </button>
      </div>

      <div className="zone-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-value">{floodZones.length}</div>
            <div className="stat-label">Zones</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.floor((stats.totalPopulation || 0) / 1000)}K</div>
            <div className="stat-label">Population</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.totalArea || 0}</div>
            <div className="stat-label">km²</div>
          </div>
        </div>

        <div className="risk-indicators">
          {['extreme', 'high', 'medium', 'low'].map(level => (
            <div key={level} className={`risk-indicator ${level}`}>
              <div className="risk-count">{stats[level] || 0}</div>
              <div className="risk-name">{level}</div>
            </div>
          ))}
        </div>
      </div>

      {isExpanded && (
        <div className="zone-content">
          <div className="zones-grid">
            {floodZones.map(zone => (
              <div
                key={zone.id}
                className={`zone-card ${selectedZone?.id === zone.id ? 'selected' : ''}`}
                onClick={() => setSelectedZone(zone)}
                style={{ borderLeftColor: zone.riskColor }}
              >
                <div className="zone-header-card">
                  <div className="zone-name">{zone.name}</div>
                  <div className="zone-level" style={{ color: zone.riskColor }}>
                    {zone.waterLevel.toFixed(2)}m
                  </div>
                </div>

                <div className="zone-risk">
                  <div
                    className="risk-badge"
                    style={{ backgroundColor: zone.riskColor }}
                  >
                    {zone.riskLevel.toUpperCase()}
                  </div>
                  <div className="risk-desc">{getRiskDescription(zone.riskLevel)}</div>
                </div>

                <div className="zone-details">
                  <div className="detail-row">
                    <span>Population:</span>
                    <span>{zone.population.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Area:</span>
                    <span>{zone.area} km²</span>
                  </div>
                  <div className="detail-row">
                    <span>Updated:</span>
                    <span>{new Date(zone.lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedZone && (
            <div className="zone-detail-panel">
              <h4>Zone Details: {selectedZone.name}</h4>
              <div className="detail-grid">
                <div className="detail-section">
                  <h5><FaWater /> Water Level</h5>
                  <div className="detail-value" style={{ color: selectedZone.riskColor }}>
                    {selectedZone.waterLevel.toFixed(3)} meters
                  </div>
                </div>

                <div className="detail-section">
                  <h5><FaExclamationTriangle /> Risk Assessment</h5>
                  <div className="detail-value">
                    <span className="risk-badge-large" style={{ backgroundColor: selectedZone.riskColor }}>
                      {selectedZone.riskLevel.toUpperCase()}
                    </span>
                    <p>{getRiskDescription(selectedZone.riskLevel)}</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h5><FaEye /> Demographics</h5>
                  <div className="detail-value">
                    <p>Population: {selectedZone.population.toLocaleString()}</p>
                    <p>Area: {selectedZone.area} km²</p>
                    <p>Density: {Math.floor(selectedZone.population / selectedZone.area)} people/km²</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .flood-zone-visualization {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #333;
        }

        .zone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .zone-header h3 {
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

        .zone-summary {
          margin-bottom: 15px;
        }

        .summary-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 10px;
          border-radius: 8px;
          flex: 1;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #fff;
        }

        .stat-label {
          font-size: 12px;
          color: #ccc;
          margin-top: 4px;
        }

        .risk-indicators {
          display: flex;
          gap: 10px;
        }

        .risk-indicator {
          flex: 1;
          text-align: center;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid;
        }

        .risk-indicator.extreme {
          border-color: #dc2626;
          background: rgba(220, 38, 38, 0.1);
        }

        .risk-indicator.high {
          border-color: #ea580c;
          background: rgba(234, 88, 12, 0.1);
        }

        .risk-indicator.medium {
          border-color: #d97706;
          background: rgba(217, 119, 6, 0.1);
        }

        .risk-indicator.low {
          border-color: #059669;
          background: rgba(5, 150, 105, 0.1);
        }

        .risk-count {
          font-size: 16px;
          font-weight: bold;
          color: #fff;
        }

        .risk-name {
          font-size: 11px;
          color: #ccc;
          text-transform: uppercase;
        }

        .zones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .zone-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          border-left: 4px solid #333;
          cursor: pointer;
          transition: all 0.3s;
        }

        .zone-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .zone-card.selected {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }

        .zone-header-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .zone-name {
          font-weight: bold;
          color: #fff;
        }

        .zone-level {
          font-size: 18px;
          font-weight: bold;
        }

        .zone-risk {
          margin-bottom: 15px;
        }

        .risk-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .risk-desc {
          color: #ccc;
          font-size: 12px;
        }

        .zone-details {
          border-top: 1px solid #444;
          padding-top: 10px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .detail-row span:first-child {
          color: #999;
        }

        .detail-row span:last-child {
          color: #fff;
        }

        .zone-detail-panel {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #444;
        }

        .zone-detail-panel h4 {
          color: #fff;
          margin-bottom: 20px;
          font-size: 18px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .detail-section h5 {
          color: #ccc;
          font-size: 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .detail-value {
          color: #fff;
        }

        .risk-badge-large {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        @media (max-width: 768px) {
          .zones-grid {
            grid-template-columns: 1fr;
          }

          .summary-stats {
            flex-direction: column;
            gap: 10px;
          }

          .risk-indicators {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default FloodZoneVisualization;