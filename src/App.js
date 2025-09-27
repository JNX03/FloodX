import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';
import 'font-awesome/css/font-awesome.min.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { FaHome, FaSearch, FaSync, FaMoon, FaSun, FaQuestionCircle, FaDownload, FaBell, FaCog } from 'react-icons/fa';
import PingRiver from './PingRiver';
// import realTimeService from './services/realTimeService'; // Disabled for now
import dataSourceService from './services/dataSourceService';
import NotificationSystem from './components/NotificationSystem';
import HelpModal from './components/HelpModal';
import StatusIndicator from './components/StatusIndicator';
import CCTVPanel from './components/CCTVPanel';
import WeatherPanel from './components/WeatherPanel';
import DataDashboard from './components/DataDashboard';
import FloodZoneVisualization from './components/FloodZoneVisualization';
import PhotoTimeline from './components/PhotoTimeline';
import PhotoUpload from './components/PhotoUpload';
import EmergencyHelp from './components/EmergencyHelp';
import LocationPinning from './components/LocationPinning';
import OfficialAnnouncements from './components/OfficialAnnouncements';
import cmuMonitoringService from './services/cmuMonitoringService';
import FloodZoneMapSimple from './components/FloodZoneMapSimple';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [mapCenter, setMapCenter] = useState([18.7883, 98.9853]);
  const [userLocation, setUserLocation] = useState(null);
  const [stationData, setStationData] = useState({});
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, reconnectAttempts: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [apiFailureCount, setApiFailureCount] = useState(0);
  const [, setLastApiError] = useState(null);
  const [isApiRequestInProgress, setIsApiRequestInProgress] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [cmuPoles, setCmuPoles] = useState([]);

  const stations = useMemo(() => [
    // Only stations that can actually fetch data from ping API
    { name: 'Station 89', coords: [18.7883, 98.9853], code: '89', weather: 'Null' },
    { name: 'TP.1 Traffic Point 1', coords: [18.788450, 99.004095], code: 'TP.1', weather: 'Null' }
  ], []);

  const addNotification = useCallback((type, message, details = null, priority = 'normal') => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type,
      message,
      details,
      priority,
      timestamp: Date.now()
    };

    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep max 10 notifications

    // Auto remove non-critical notifications after 5 seconds
    if (type !== 'flood-alert' && priority !== 'high') {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Load CMU monitoring poles
  useEffect(() => {
    const loadCMUPoles = async () => {
      try {
        const polesData = cmuMonitoringService.getAllMonitoringPoles();
        if (polesData.success) {
          setCmuPoles(polesData.poles);
          const eastCount = polesData.poles.filter(p => p.id.startsWith('E')).length;
          const westCount = polesData.poles.filter(p => p.id.startsWith('W')).length;
          addNotification('success', 'โหลดหลักระดับน้ำท่วม CMU', `โหลดข้อมูลจริง ${polesData.total} หลัก (${eastCount} ฝั่งตะวันออก + ${westCount} ฝั่งตะวันตก) จากระบบ CMU`);
        }
      } catch (error) {
        console.error('Failed to load CMU poles:', error);
        addNotification('error', 'ไม่สามารถโหลดข้อมูล CMU', 'เกิดข้อผิดพลาดในการโหลดหลักวัดระดับน้ำ');
      }
    };

    loadCMUPoles();
  }, [addNotification]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    addNotification('success', `${newMode ? 'Dark' : 'Light'} mode activated`, 'Theme preference saved');
  };

  const handleHomeClick = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);
        setUserLocation([lat, lng]);
        setLoading(false);
        addNotification('success', 'Location found!', `Centered map to your current location`);
      }, (error) => {
        setLoading(false);
        let errorMsg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timeout.';
        }
        addNotification('error', 'Location Error', errorMsg);
      });
    } else {
      addNotification('error', 'Geolocation Not Supported', 'Your browser does not support geolocation.');
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (!query) return;
      
      setLoading(true);
      const encodedQuery = encodeURIComponent(query);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}`)
        .then((response) => response.json())
        .then((data) => {
          setLoading(false);
          if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setMapCenter([lat, lon]);
            addNotification('success', 'Location Found', `Navigated to ${data[0].display_name.split(',')[0]}`);
            e.target.value = '';
          } else {
            addNotification('warning', 'Location Not Found', 'Try a more specific search term');
          }
        })
        .catch((error) => {
          setLoading(false);
          addNotification('error', 'Search Error', 'Failed to search location. Please try again.');
        });
    }
  };


  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Reset API failure count after 10 minutes of no requests
  useEffect(() => {
    if (apiFailureCount >= 5) {
      const resetTimer = setTimeout(() => {
        setApiFailureCount(0);
        setLastApiError(null);
        addNotification('info', 'API Reset', 'API connection restored. You can try refreshing data again.');
      }, 600000); // 10 minutes

      return () => clearTimeout(resetTimer);
    }
  }, [apiFailureCount, addNotification]);

  const fetchStationData = async (stationCode, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch('https://ping.nothingtodo.me/api/water-level', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const jsonData = await response.json();

        if (!jsonData.success || !jsonData.data) {
          return { stationCode, error: 'No data available from API.' };
        }

        // Transform the new API response to match the old format
        const stationData = jsonData.data.filter(item =>
          item.station_id === stationCode || item.station_id === `TP.${stationCode.replace('P.', '')}`
        );

        if (stationData.length === 0) {
          return { stationCode, error: 'No data for this station.' };
        }

        // Transform to old format for compatibility
        const transformedData = [{
          waterlevelvalue: stationData[0].value.toString(),
          Q: 'N/A',
          provincename: 'Chiang Mai',
          ZG: 'N/A',
          hourlydateString: new Date(stationData[0].timestamp).toLocaleString()
        }];

        setLastUpdate(Date.now());
        setApiFailureCount(0); // Reset failure count on success
        setLastApiError(null);
        return { stationCode, data: transformedData };

      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for station ${stationCode}:`, error.message);

        if (attempt === retries) {
          // Final attempt failed - update failure tracking
          setApiFailureCount(prev => prev + 1);
          setLastApiError(error.message);

          if (error.name === 'AbortError') {
            return { stationCode, error: 'Request timeout - API server is slow.' };
          } else if (error.message.includes('ERR_INSUFFICIENT_RESOURCES') || error.message.includes('429')) {
            // Add exponential backoff for insufficient resources
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            return { stationCode, error: 'API overloaded. Retrying in 10 seconds.' };
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return { stationCode, error: 'Network connection error.' };
          } else {
            return { stationCode, error: `Connection failed: ${error.message}` };
          }
        }

        // Wait before retry (exponential backoff) - reduced delay
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        }
      }
    }
  };

  useEffect(() => {
    if (selectedStation && selectedStation.code && !isApiRequestInProgress) {
      setLoading(true);
      fetchStationData(selectedStation.code, 1).then(data => {
        setStationData(prevData => ({ ...prevData, [selectedStation.code]: data }));
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [selectedStation, isApiRequestInProgress]);

  // Real-time service integration - DISABLED to prevent connection errors
  useEffect(() => {
    // Real-time service disabled to prevent localhost connection errors
    // This eliminates the "Failed to load resource: net::ERR_CONNECTION_REFUSED" errors
    
    // Set connection status to show we're in manual mode
    setConnectionStatus({ connected: false, reconnectAttempts: 0 });
    
    // No cleanup needed since real-time service is disabled
    return () => {};
  }, [addNotification]);

  // Fetch station data using new data source service
  const fetchAllStationsDataWithRateLimit = useCallback(async () => {
    // Prevent multiple simultaneous API requests
    if (isApiRequestInProgress) {
      addNotification('warning', 'Request In Progress', 'Please wait for current request to complete.');
      return;
    }

    // Circuit breaker - stop making requests if too many failures
    if (apiFailureCount >= 5) {
      addNotification('error', 'API Temporarily Unavailable',
        'Too many failed requests. Please wait a few minutes before trying again.');
      return;
    }

    setIsApiRequestInProgress(true);
    setLoading(true);

    try {
      const allData = await dataSourceService.fetchAllData();

      if (allData.success) {
        const newStationData = {};

        // Transform the unified data back to the expected format
        allData.stations.forEach(station => {
          newStationData[station.id] = {
            stationCode: station.id,
            data: [{
              waterlevelvalue: station.waterLevel.value.toString(),
              Q: 'N/A',
              provincename: 'Chiang Mai',
              ZG: 'N/A',
              hourlydateString: new Date(station.waterLevel.timestamp).toLocaleString()
            }]
          };
        });

        // Note: Station coordinates are already updated via the API data

        setStationData(newStationData);
        setLastUpdate(Date.now());
        setApiFailureCount(0);
        setLastApiError(null);

        addNotification('success', 'Data Updated', `Loaded data from ${allData.stations.length} stations`);
      } else {
        throw new Error(allData.error || 'Failed to fetch data');
      }

      setLoading(false);
      setIsApiRequestInProgress(false);
    } catch (error) {
      setLoading(false);
      setIsApiRequestInProgress(false);
      setApiFailureCount(prev => prev + 1);
      setLastApiError(error.message);
      addNotification('error', 'Data Fetch Failed', 'Unable to retrieve station data');
    }
  }, [addNotification, apiFailureCount, isApiRequestInProgress]);

  // Initial data fetch and periodic updates
  useEffect(() => {
    let isMounted = true;
    let interval;

    // Initial fetch with rate limiting
    const initialFetch = async () => {
      if (isMounted) {
        await fetchAllStationsDataWithRateLimit();
      }
    };

    initialFetch();

    // Set up interval for fallback updates (only if auto-refresh is enabled and not using real-time)
    if (autoRefresh && !connectionStatus.connected) {
      interval = setInterval(() => {
        if (isMounted && !connectionStatus.connected && !isApiRequestInProgress) {
          fetchAllStationsDataWithRateLimit();
        }
      }, 60000); // Set to 1 minute (60 seconds) as requested
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, connectionStatus.connected, fetchAllStationsDataWithRateLimit, isApiRequestInProgress]);

  const handleMarkerClick = (station) => {
    setSelectedStation(station);
  };

  const getWaterHeight = (code) => {
    const data = stationData[code];
    return data?.data?.[0]?.waterlevelvalue ? parseFloat(data.data[0].waterlevelvalue).toFixed(3) : 'N/A';
  };

  const getMarkerColor = (code) => {
    const height = parseFloat(getWaterHeight(code));
    if (isNaN(height)) return 'blue';
    if (height < 5) return 'green';
    if (height < 8) return 'orange';
    return 'red';
  };

  const getPoleColor = (type) => {
    switch (type) {
      case 'standard': return '#3b82f6'; // Blue
      case 'advanced': return '#10b981'; // Green
      case 'basic': return '#6b7280'; // Gray
      case 'flood_warning': return '#f59e0b'; // Orange
      case 'emergency': return '#ef4444'; // Red
      default: return '#3b82f6';
    }
  };

  const refreshData = async () => {
    if (isApiRequestInProgress) {
      addNotification('warning', 'Refresh In Progress', 'Please wait for current request to complete.');
      return;
    }
    addNotification('info', 'Refreshing data...', 'Fetching latest information');
    await fetchAllStationsDataWithRateLimit();
    addNotification('success', 'Data refreshed', 'All station data updated');
  };

  const exportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      stations: stations.map(station => ({
        ...station,
        currentData: stationData[station.code],
        waterLevel: getWaterHeight(station.code),
        status: getMarkerColor(station.code)
      }))
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodx-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addNotification('success', 'Data exported', 'Download started');
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className={isDarkMode ? 'dark-mode' : ''}>
            <div className="right-menu">
              <StatusIndicator 
                connectionStatus={connectionStatus}
                lastUpdate={lastUpdate}
                isLoading={loading}
              />
              <div className="menu-buttons">
                <div className="menu-row">
                  <button className="icon-button home-button" onClick={handleHomeClick} title="Go to my location">
                    <FaHome />
                  </button>
                  <button className="icon-button dark-mode-button" onClick={toggleDarkMode} title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
                    {isDarkMode ? <FaSun /> : <FaMoon />}
                  </button>
                  <button 
                    className={`icon-button refresh-button ${apiFailureCount >= 5 ? 'disabled' : ''}`} 
                    onClick={refreshData} 
                    title={apiFailureCount >= 5 ? 'API temporarily disabled due to errors' : 'Refresh data'}
                    disabled={apiFailureCount >= 5}
                  >
                    <FaSync className={loading ? 'spinning' : ''} />
                  </button>
                </div>
                <div className="menu-row">
                  <button className="icon-button help-button" onClick={() => setShowHelp(true)} title="Help & Documentation">
                    <FaQuestionCircle />
                  </button>
                  <button className="icon-button export-button" onClick={exportData} title="Export data">
                    <FaDownload />
                  </button>
                  <button className="icon-button settings-button" onClick={() => setAutoRefresh(!autoRefresh)} title={`Auto-refresh: ${autoRefresh ? 'ON' : 'OFF'}`}>
                    <FaCog className={autoRefresh ? 'active' : ''} />
                  </button>
                </div>
              </div>
              <div className="app-title">
                <h3>FloodX Monitor</h3>
                <p>Real-time Flood Monitoring System</p>
              </div>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input 
                  type="text" 
                  className="search-bar" 
                  placeholder="Search for a location..." 
                  onKeyPress={handleSearch}
                  disabled={loading}
                />
              </div>
              <div className="station-details">
                <h2>🏭 Station Details</h2>
                {loading && !selectedStation ? (
                  <div className="loading-indicator">
                    <FaSync className="spinning" />
                    <p>Loading station data...</p>
                  </div>
                ) : selectedStation && stationData[selectedStation.code] ? (
                  <div className="station-info">
                    <div className="station-header">
                      <h3>{selectedStation.name}</h3>
                      <div className={`status-badge status-${getMarkerColor(selectedStation.code)}`}>
                        {getMarkerColor(selectedStation.code) === 'red' ? '🚨 DANGER' : 
                         getMarkerColor(selectedStation.code) === 'orange' ? '⚠️ WARNING' : '✅ NORMAL'}
                      </div>
                    </div>
                    
                    <div className="station-metrics">
                      <div className="metric-card primary">
                        <div className="metric-value">{getWaterHeight(selectedStation.code)}</div>
                        <div className="metric-label">Water Level (m)</div>
                      </div>
                    </div>
                    
                    {stationData[selectedStation.code].error ? (
                      <div className="error-message">
                        <p>⚠️ {stationData[selectedStation.code].error}</p>
                      </div>
                    ) : (
                      <div className="station-data">
                        <div className="data-row">
                          <span className="data-label">Station Code:</span>
                          <span className="data-value">{selectedStation.code}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Flow Rate (Q):</span>
                          <span className="data-value">{stationData[selectedStation.code].data[0]?.Q ?? 'N/A'} m³/s</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Province:</span>
                          <span className="data-value">{stationData[selectedStation.code].data[0]?.provincename ?? 'N/A'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Ground Level (ZG):</span>
                          <span className="data-value">{stationData[selectedStation.code].data[0]?.ZG ?? 'N/A'} m</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Last Updated:</span>
                          <span className="data-value">{stationData[selectedStation.code].data[0]?.hourlydateString ?? 'N/A'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Weather:</span>
                          <span className="data-value">{selectedStation.weather}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-selection">
                    <FaBell className="no-selection-icon" />
                    <p>Click on a station marker to view detailed information</p>
                  </div>
                )}
              </div>

              <WeatherPanel addNotification={addNotification} />
              <CCTVPanel addNotification={addNotification} />
              <DataDashboard addNotification={addNotification} />
              <FloodZoneVisualization addNotification={addNotification} stationData={stationData} />
              <PhotoTimeline
                addNotification={addNotification}
                onUploadClick={() => setShowPhotoUpload(true)}
              />
              <EmergencyHelp addNotification={addNotification} />
              <LocationPinning addNotification={addNotification} />
              <OfficialAnnouncements addNotification={addNotification} />
            </div>
            <MapContainer center={mapCenter} zoom={10} className="map-container">
              <TileLayer
                url={isDarkMode ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                attribution="Made with 🩷 by Jxxn03"
              />
              {stations.map((station, index) => (
                <Marker
                  key={index}
                  position={station.coords}
                  icon={L.divIcon({
                    className: `custom-marker-${getMarkerColor(station.code)}`,
                    html: `<i class='fa fa-map-marker' style='color:${getMarkerColor(station.code)}; font-size: 24px;'></i>`,
                  })}
                  eventHandlers={{ click: () => handleMarkerClick(station) }}
                >
                  <Popup>
                    <h3>{station.name}</h3>
                    <p><strong>Station Code:</strong> {station.code}</p>
                    <p><strong>Weather:</strong> {station.weather}</p>
                    <p><strong>Current Water Level:</strong> {getWaterHeight(station.code)} m</p>
                  </Popup>
                </Marker>
              ))}

              {/* CMU Monitoring Poles */}
              {cmuPoles.map((pole, index) => (
                <Marker
                  key={`cmu-${pole.id}`}
                  position={[pole.lat, pole.lng]}
                  icon={L.divIcon({
                    className: `cmu-pole-marker ${pole.type}`,
                    html: `<div class='cmu-pole-icon' style='background-color: ${getPoleColor(pole.type)}; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px; position: relative;'>
                             <div style='position: absolute; top: -20px; left: -8px; width: 4px; height: 20px; background-color: ${getPoleColor(pole.type)};'></div>
                           </div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  })}
                  eventHandlers={{
                    click: () => {
                      addNotification('info', 'หลักวัดระดับน้ำ CMU', `${pole.name} - ${pole.area}, ${pole.district}`);
                    }
                  }}
                >
                  <Popup>
                    <div className="cmu-pole-popup">
                      <h4>{pole.name}</h4>
                      <p><strong>รหัส:</strong> {pole.id}</p>
                      <p><strong>พื้นที่:</strong> {pole.area}</p>
                      <p><strong>อำเภอ:</strong> {pole.district}</p>
                      <p><strong>สถานะ:</strong> <span className={pole.status}>{pole.status === 'active' ? '🟢 ใช้งานได้' : '🔴 ไม่ใช้งาน'}</span></p>
                      {pole.specifications && (
                        <div className="pole-specs">
                          <strong>ข้อมูลเทคนิค:</strong>
                          <p>• ความสูง: {pole.specifications.height} เมตร</p>
                          <p>• วัสดุ: คอนกรีต</p>
                          <p>• ระดับน้ำฐาน: {pole.specifications.baseWaterLevel?.toFixed(2)} ม.</p>
                          <p>• ระดับน้ำท่วมสูงสุด: {pole.specifications.maxFloodLevel?.toFixed(2)} ม.</p>
                        </div>
                      )}
                      <div className="pole-sensors">
                        <strong>การติดตาม:</strong>
                        {pole.sensors.waterLevel && ' 🌊 ระดับน้ำ'}
                        {pole.sensors.floodMarker && ' 📏 เครื่องหมายน้ำท่วม'}
                      </div>
                      <div className="pole-usage">
                        <small>💡 เปรียบเทียบกับ P.1 สะพานนวรัฐ เพื่อคาดการณ์น้ำท่วม</small>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {userLocation && <Marker position={userLocation} />}
            </MapContainer>
            <div className="top-menu">
              <Link to="/ping-river" className="ping-river-button">
                <span className="button-icon">📊</span>
                <span>Ping River Analytics</span>
                <span className="button-badge">AI Predictions</span>
              </Link>
            </div>
            <div className="bottom-stats">
              <div className="stats-header">
                <h4>📍 Station Overview</h4>
                <div className="stats-toggle">
                  <span className={`toggle-item ${!connectionStatus.connected ? 'active' : ''}`}>Manual</span>
                  <span className={`toggle-item ${connectionStatus.connected ? 'active' : ''}`}>Live</span>
                </div>
              </div>
              <div className="stats-grid">
                {stations.map(station => (
                  <div key={station.code} className={`stat-card stat-${getMarkerColor(station.code)}`}>
                    <div className="stat-header">
                      <span className="stat-code">{station.code}</span>
                      <div className={`stat-indicator ${getMarkerColor(station.code)}`}></div>
                    </div>
                    <div className="stat-value">{getWaterHeight(station.code)} m</div>
                    <div className="stat-label">{station.name.split(' ')[1] || station.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CMU Flood Zone Map with 221 poles */}
            <div className="flood-zone-container" style={{ margin: '20px', height: '500px' }}>
              <FloodZoneMapSimple currentWaterLevel={getWaterHeight('TP.1')} />
            </div>

            <NotificationSystem
              notifications={notifications}
              onRemove={removeNotification}
              onClearAll={clearAllNotifications}
            />
            
            <HelpModal
              isOpen={showHelp}
              onClose={() => setShowHelp(false)}
            />

            {showPhotoUpload && (
              <PhotoUpload
                onClose={() => setShowPhotoUpload(false)}
                onUploaded={(photoData) => {
                  // Photo uploaded successfully
                  addNotification('success', 'Photo Uploaded', 'Your flood report has been added');
                }}
                addNotification={addNotification}
              />
            )}
          </div>
        } />
        <Route path="/ping-river" element={<PingRiver addNotification={addNotification} />} />
      </Routes>
    </Router>
  );
};

export default App;
