import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';
import 'font-awesome/css/font-awesome.min.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import PingRiver from './PingRiver';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapCenter, setMapCenter] = useState([18.7883, 98.9853]);
  const [userLocation, setUserLocation] = useState(null);
  const [stationData, setStationData] = useState({});
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(false);

  const stations = [
    { name: 'P.1 สะพานนวรัฐ', coords: [18.788450, 99.004095], code: 'P.1', weather: 'Null' },
    { name: 'P.75 บ้านแม่แต', coords: [19.007223, 98.964551], code: 'P.75', weather: 'Null' },
    { name: 'P.20 เชียงดาว', coords: [19.369551, 98.969101], code: 'P.20', weather: 'Null' },
    { name: 'P.67 สันทราย', coords: [18.933161, 99.033818], code: 'P.67', weather: 'Null' },
  ];

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleHomeClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);
        setUserLocation([lat, lng]);
      }, () => {
        alert('Unable to retrieve location.');
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const query = encodeURIComponent(e.target.value.trim());
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.length > 0) {
            const lat = data[0].lat;
            const lon = data[0].lon;
            setMapCenter([lat, lon]);
          } else {
            alert('Location not found');
          }
        })
        .catch(() => {
          alert('An error occurred while searching for the location.');
        });
    }
  };

  const fetchStationData = async (stationCode) => {
    try {
      const response = await fetch('https://hyd-app-db.rid.go.th/webservice/SWOCService.svc/getHourlyWaterLevelFromStationCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hydro: { stationcode: stationCode } }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const textData = await response.text();
      if (!textData || textData.trim() === '') return { stationCode, error: 'No data available.' };
      try {
        const jsonData = JSON.parse(textData);
        return { stationCode, data: jsonData };
      } catch {
        return { stationCode, error: 'Invalid JSON format.' };
      }
    } catch (error) {
      return { stationCode, error: error.message };
    }
  };

  useEffect(() => {
    if (selectedStation && selectedStation.code) {
      setLoading(true);
      fetchStationData(selectedStation.code).then(data => {
        setStationData(prevData => ({ ...prevData, [selectedStation.code]: data }));
        setLoading(false);
      });
    }
  }, [selectedStation]);

  useEffect(() => {
    stations.forEach(station => {
      fetchStationData(station.code).then(data => {
        setStationData(prevData => ({ ...prevData, [station.code]: data }));
      });
    });

    const interval = setInterval(() => {
      stations.forEach(station => {
        fetchStationData(station.code).then(data => {
          setStationData(prevData => ({ ...prevData, [station.code]: data }));
        });
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const refreshData = () => {
    if (selectedStation && selectedStation.code) {
      setLoading(true);
      fetchStationData(selectedStation.code).then(data => {
        setStationData(prevData => ({ ...prevData, [selectedStation.code]: data }));
        setLoading(false);
      });
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className={isDarkMode ? 'dark-mode' : ''}>
            <div className="right-menu">
              <div className="menu-buttons">
                <button className="home-button" onClick={handleHomeClick}><i className="fa fa-home"></i> Home</button>
                <p>Jxxn03 - FloodMap</p>
                <button className="dark-mode-button" onClick={toggleDarkMode}><i className={isDarkMode ? 'fa fa-sun-o' : 'fa fa-moon-o'}></i></button>
                <button className="refresh-button" onClick={refreshData}><i className="fa fa-refresh"></i></button>
              </div>
              <input type="text" className="search-bar" placeholder="Search for a place..." onKeyPress={handleSearch} />
              <h2>Station Details</h2>
              {loading ? (
                <p>Loading...</p>
              ) : selectedStation && stationData[selectedStation.code] ? (
                <>
                  <h3>{selectedStation.name}</h3>
                  <p><strong>Station Code:</strong> {selectedStation.code}</p>
                  <p><strong>Current Water Level:</strong> {getWaterHeight(selectedStation.code)} m</p>
                  <p><strong>Weather:</strong> {selectedStation.weather}</p>
                  {stationData[selectedStation.code].error ? (
                    <p>{stationData[selectedStation.code].error}</p>
                  ) : (
                    <>
                      <p><strong>Flow Rate (Q):</strong> {stationData[selectedStation.code].data[0]?.Q ?? 'N/A'} m³/s</p>
                      <p><strong>Province:</strong> {stationData[selectedStation.code].data[0]?.provincename ?? 'N/A'}</p>
                      <p><strong>Last Updated:</strong> {stationData[selectedStation.code].data[0]?.hourlydateString ?? 'N/A'}</p>
                      <p><strong>Ground Level (ZG):</strong> {stationData[selectedStation.code].data[0]?.ZG ?? 'N/A'} m</p>
                      <p style={{ color: getMarkerColor(selectedStation.code) }}>{getMarkerColor(selectedStation.code) === 'red' ? 'Danger' : getMarkerColor(selectedStation.code) === 'orange' ? 'Warning' : 'Normal'}</p>
                    </>
                  )}
                </>
              ) : (
                <p>Select a station on the map to see details.</p>
              )}
            </div>
            <MapContainer center={mapCenter} zoom={10} className="map-container">
              <TileLayer
                url={isDarkMode ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                attribution="Made with 🩷 by Jxxn03"
              />
              <TileLayer url="https://www.floodmap.net/getFMTile.ashx?x={x}&y={y}&z={z}&e=311" opacity={0.5} />
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
              {userLocation && <Marker position={userLocation} />}
            </MapContainer>
            <div className="top-menu">
              <Link to="/ping-river" className="ping-river-button"><i className="fa fa-water"></i> Ping River Level 💧</Link>
            </div>
            <div className="middle-menu">
              <p>Jxxn03 - FloodMap</p>
              <p>P.1 Water Height: {getWaterHeight('P.1')} m</p>
              <p>P.20 Water Height: {getWaterHeight('P.20')} m</p>
              <p>P.67 Water Height: {getWaterHeight('P.67')} m</p>
              <p>P.75 Water Height: {getWaterHeight('P.75')} m</p>
            </div>
          </div>
        } />
        <Route path="/ping-river" element={<PingRiver />} />
      </Routes>
    </Router>
  );
};

export default App;
