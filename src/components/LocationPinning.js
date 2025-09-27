import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaHome, FaSchool, FaBriefcase, FaPlus, FaClock, FaWater, FaExclamationTriangle } from 'react-icons/fa';

const LocationPinning = ({ addNotification }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pinnedLocations, setPinnedLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: 'home',
    lat: '',
    lng: '',
    address: ''
  });

  useEffect(() => {
    // Load pinned locations from localStorage
    const saved = localStorage.getItem('floodx-pinned-locations');
    if (saved) {
      setPinnedLocations(JSON.parse(saved));
    }
  }, []);

  const saveLocations = (locations) => {
    localStorage.setItem('floodx-pinned-locations', JSON.stringify(locations));
    setPinnedLocations(locations);
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'home': return <FaHome />;
      case 'school': return <FaSchool />;
      case 'work': return <FaBriefcase />;
      default: return <FaMapMarkerAlt />;
    }
  };

  const getLocationTypeText = (type) => {
    switch (type) {
      case 'home': return 'บ้าน';
      case 'school': return 'โรงเรียน';
      case 'work': return 'ที่ทำงาน';
      default: return 'สถานที่';
    }
  };

  const calculateFloodPrediction = (lat, lng) => {
    // Mock flood prediction algorithm based on coordinates
    const baseRisk = Math.random() * 100;
    const proximityToRiver = Math.abs(lat - 18.7883) * 100; // Distance from main river
    const elevation = (lng - 98.9853) * 1000; // Mock elevation

    const riskScore = Math.min(100, baseRisk + proximityToRiver - elevation);

    if (riskScore < 20) {
      return {
        risk: 'ปลอดภัย',
        color: '#10b981',
        hoursUntilFlood: null,
        expectedHeight: 0,
        icon: '✅'
      };
    } else if (riskScore < 50) {
      return {
        risk: 'เสี่ยงต่ำ',
        color: '#f59e0b',
        hoursUntilFlood: 12 + Math.floor(Math.random() * 24),
        expectedHeight: 0.2 + Math.random() * 0.3,
        icon: '⚠️'
      };
    } else if (riskScore < 80) {
      return {
        risk: 'เสี่ยงสูง',
        color: '#ef4444',
        hoursUntilFlood: 3 + Math.floor(Math.random() * 8),
        expectedHeight: 0.5 + Math.random() * 0.5,
        icon: '🚨'
      };
    } else {
      return {
        risk: 'อันตรายมาก',
        color: '#dc2626',
        hoursUntilFlood: 1 + Math.floor(Math.random() * 3),
        expectedHeight: 1.0 + Math.random() * 1.0,
        icon: '☣️'
      };
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      addNotification('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อสถานที่และพิกัด');
      return;
    }

    const lat = parseFloat(newLocation.lat);
    const lng = parseFloat(newLocation.lng);

    if (isNaN(lat) || isNaN(lng)) {
      addNotification('error', 'พิกัดไม่ถูกต้อง', 'กรุณากรอกพิกัดเป็นตัวเลข');
      return;
    }

    const locationData = {
      id: Date.now().toString(),
      ...newLocation,
      lat: lat,
      lng: lng,
      createdAt: Date.now()
    };

    const updatedLocations = [...pinnedLocations, locationData];
    saveLocations(updatedLocations);

    setNewLocation({ name: '', type: 'home', lat: '', lng: '', address: '' });
    setShowAddForm(false);

    addNotification('success', 'เพิ่มสถานที่สำเร็จ', `ปักหมุด ${locationData.name} แล้ว`);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          }));
          addNotification('success', 'ใช้ตำแหน่งปัจจุบัน', 'พิกัดถูกกรอกอัตโนมัติ');
        },
        () => {
          addNotification('error', 'ไม่สามารถหาตำแหน่ง', 'กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        }
      );
    }
  };

  const removeLocation = (id) => {
    const updated = pinnedLocations.filter(loc => loc.id !== id);
    saveLocations(updated);
    addNotification('info', 'ลบสถานที่แล้ว', 'ยกเลิกการปักหมุดสถานที่');
  };

  return (
    <div className="location-pinning">
      <div className="pinning-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FaMapMarkerAlt style={{ color: '#3b82f6', marginRight: '8px' }} />
          ปักหมุดสถานที่สำคัญ
        </h3>
        <div className="pinning-actions">
          <button
            className="add-location-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddForm(true);
            }}
          >
            <FaPlus /> เพิ่ม
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pinning-content">
          <div className="info-text">
            📍 ปักหมุดบ้าน/โรงเรียน/ที่ทำงานของคุณ → ระบบจะบอกเลยว่า "อีกกี่ชั่วโมงน้ำจะถึง และจะสูงประมาณไหน"
          </div>

          {pinnedLocations.length === 0 ? (
            <div className="empty-locations">
              <FaMapMarkerAlt className="empty-icon" />
              <p>ยังไม่มีสถานที่ที่ปักหมุด</p>
              <button
                className="add-first-location"
                onClick={() => setShowAddForm(true)}
              >
                ปักหมุดสถานที่แรก
              </button>
            </div>
          ) : (
            <div className="locations-list">
              {pinnedLocations.map((location) => {
                const prediction = calculateFloodPrediction(location.lat, location.lng);
                return (
                  <div key={location.id} className="location-card">
                    <div className="location-header">
                      <div className="location-icon">
                        {getLocationIcon(location.type)}
                      </div>
                      <div className="location-info">
                        <div className="location-name">{location.name}</div>
                        <div className="location-type">{getLocationTypeText(location.type)}</div>
                      </div>
                      <button
                        className="remove-location"
                        onClick={() => removeLocation(location.id)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="flood-prediction">
                      <div className="prediction-header">
                        <span className="prediction-icon">{prediction.icon}</span>
                        <span className="risk-level" style={{ color: prediction.color }}>
                          {prediction.risk}
                        </span>
                      </div>

                      {prediction.hoursUntilFlood && (
                        <div className="prediction-details">
                          <div className="prediction-item">
                            <FaClock style={{ marginRight: '6px' }} />
                            <span>น้ำจะถึงใน: <strong>{prediction.hoursUntilFlood} ชั่วโมง</strong></span>
                          </div>
                          <div className="prediction-item">
                            <FaWater style={{ marginRight: '6px' }} />
                            <span>ระดับน้ำคาด: <strong>{prediction.expectedHeight.toFixed(1)} เมตร</strong></span>
                          </div>
                        </div>
                      )}

                      {prediction.risk === 'ปลอดภัย' && (
                        <div className="safe-message">
                          ✅ สถานที่นี้ปลอดภัยจากน้ำท่วม
                        </div>
                      )}
                    </div>

                    <div className="location-coords">
                      📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Location Form */}
      {showAddForm && (
        <div className="add-form-overlay">
          <div className="add-form-modal">
            <div className="form-header">
              <h4>📍 เพิ่มสถานที่ใหม่</h4>
              <button
                className="close-form"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <div className="form-content">
              <div className="form-group">
                <label>ชื่อสถานที่</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น บ้านของฉัน, โรงเรียน"
                />
              </div>

              <div className="form-group">
                <label>ประเภทสถานที่</label>
                <select
                  value={newLocation.type}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="home">🏠 บ้าน</option>
                  <option value="school">🏫 โรงเรียน</option>
                  <option value="work">🏢 ที่ทำงาน</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ละติจูด</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLocation.lat}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="18.788450"
                  />
                </div>
                <div className="form-group">
                  <label>ลองจิจูด</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newLocation.lng}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, lng: e.target.value }))}
                    placeholder="99.004095"
                  />
                </div>
              </div>

              <button
                className="current-location-button"
                onClick={getCurrentLocation}
              >
                📍 ใช้ตำแหน่งปัจจุบัน
              </button>

              <div className="form-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowAddForm(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="save-button"
                  onClick={handleAddLocation}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .location-pinning {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
        }

        .pinning-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: ${isExpanded ? '15px' : '0'};
        }

        .pinning-header h3 {
          color: #3b82f6;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .add-location-button {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.3s;
        }

        .add-location-button:hover {
          background: #2563eb;
        }

        .info-text {
          background: rgba(59, 130, 246, 0.2);
          padding: 10px;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 13px;
          margin-bottom: 15px;
          border-left: 3px solid #3b82f6;
        }

        .empty-locations {
          text-align: center;
          padding: 30px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .add-first-location {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 15px;
          transition: background-color 0.3s;
        }

        .add-first-location:hover {
          background: #2563eb;
        }

        .locations-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .location-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          border: 1px solid #334155;
        }

        .location-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .location-icon {
          color: #3b82f6;
          font-size: 18px;
          margin-right: 12px;
        }

        .location-info {
          flex: 1;
        }

        .location-name {
          color: #f1f5f9;
          font-weight: 500;
          font-size: 14px;
        }

        .location-type {
          color: #94a3b8;
          font-size: 12px;
        }

        .remove-location {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flood-prediction {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .prediction-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .prediction-icon {
          font-size: 16px;
        }

        .risk-level {
          font-weight: bold;
          font-size: 14px;
        }

        .prediction-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .prediction-item {
          display: flex;
          align-items: center;
          color: #e2e8f0;
          font-size: 13px;
        }

        .safe-message {
          color: #10b981;
          font-size: 13px;
          font-weight: 500;
        }

        .location-coords {
          color: #64748b;
          font-family: monospace;
          font-size: 11px;
        }

        .add-form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2500;
          padding: 20px;
        }

        .add-form-modal {
          background: #1e293b;
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #334155;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #334155;
        }

        .form-header h4 {
          color: #f1f5f9;
          margin: 0;
          font-size: 16px;
        }

        .close-form {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-content {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          color: #e2e8f0;
          font-size: 13px;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          background: rgba(51, 65, 85, 0.5);
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 8px 12px;
          color: #f1f5f9;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .current-location-button {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .current-location-button:hover {
          background: #059669;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #334155;
        }

        .cancel-button {
          background: #475569;
          color: #f1f5f9;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .cancel-button:hover {
          background: #64748b;
        }

        .save-button {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .save-button:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .location-pinning {
            padding: 12px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .add-form-modal {
            margin: 10px;
            padding: 16px;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default LocationPinning;