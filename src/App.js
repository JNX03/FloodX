import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';
import 'font-awesome/css/font-awesome.min.css';

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
    {
      name: 'สถานี P.1 สะพานนวรัฐ แม่น้ำปิง ต.วัดเกต อ.เมือง จ.เชียงใหม่',
      coords: [18.788450, 99.004095],
      code: 'P.1',
    },
    {
      name: 'สถานี P.75 บ้านแม่แต แม่น้ำปิง ต.แม่แฝกเก่า อ.สันทราย จ.เชียงใหม่',
      coords: [19.007223200081377, 98.96455139541524],
      code: 'P.75',
    },
    {
      name: 'สถานี P.20 อ.เชียงดาว จ.เชียงใหม่',
      coords: [19.369550704956055, 98.969100952148438],
      code: 'P.20',
    },
    {
      name: 'สถานี P.67 อ.สันทราย จ.เชียงใหม่',
      coords: [18.933161, 99.033818],
      code: 'P.67',
    },
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
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value;
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
        .catch((error) => {
          console.error('Error:', error);
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

      if (!response.ok) {
        throw new Error(`Failed to fetch data for station ${stationCode}. Status: ${response.status}`);
      }

      const textData = await response.text();
      if (!textData || textData.trim() === '') {
        return { stationCode, error: 'No data available.' };
      }

      try {
        const jsonData = JSON.parse(textData);
        return { stationCode, data: jsonData };
      } catch (error) {
        return { stationCode, error: 'Invalid JSON format.' };
      }
    } catch (error) {
      return { stationCode, error: error.message };
    }
  };

  useEffect(() => {
    if (selectedStation && selectedStation.code) {
      const fetchSelectedStationData = async () => {
        setLoading(true);
        const data = await fetchStationData(selectedStation.code);
        setStationData((prevData) => ({
          ...prevData,
          [selectedStation.code]: data,
        }));
        setLoading(false);
      };

      fetchSelectedStationData();
    }
  }, [selectedStation]);

  useEffect(() => {
    const fetchAllStations = async () => {
      for (let station of stations) {
        const data = await fetchStationData(station.code);
        setStationData((prevData) => ({
          ...prevData,
          [station.code]: data,
        }));
      }
    };
    fetchAllStations();

    const interval = setInterval(() => {
      fetchAllStations();
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleMarkerClick = (station) => {
    setSelectedStation(station);
  };

  const getWaterHeight = (code) => {
    const data = stationData[code];
    if (data && data.data && data.data.length > 0) {
      const height = data.data[0]?.waterlevelvalue;
      return height ? parseFloat(height).toFixed(3) : 'N/A';
    }
    return 'N/A';
  };

  const getMarkerColor = (code) => {
    const height = parseFloat(getWaterHeight(code));
    if (isNaN(height)) return 'blue';
    if (height < 5) return 'green';
    if (height >= 5 && height < 8) return 'orange';
    if (height >= 8) return 'red';
    return 'blue';
  };

  const refreshData = () => {
    if (selectedStation && selectedStation.code) {
      const fetchSelectedStationData = async () => {
        setLoading(true);
        const data = await fetchStationData(selectedStation.code);
        setStationData((prevData) => ({
          ...prevData,
          [selectedStation.code]: data,
        }));
        setLoading(false);
      };

      fetchSelectedStationData();
    }
  };

  return (
    <div className={isDarkMode ? 'dark-mode' : ''}>
      <div className="right-menu">
        <div className="menu-buttons">
          <button className="home-button" onClick={handleHomeClick}>
            <i className="fa fa-home"></i> Home
          </button>
          <p>Jxxn03 - FloodMap</p>
          <button className="dark-mode-button" onClick={toggleDarkMode}>
            <i className={isDarkMode ? 'fa fa-sun-o' : 'fa fa-moon-o'}></i>
          </button>
          <button className="refresh-button" onClick={refreshData}>
            <i className="fa fa-refresh"></i>
          </button>
        </div>
        <input
          type="text"
          className="search-bar"
          placeholder="Search for a place..."
          onKeyPress={handleSearch}
        />
        <h2>Station Details</h2>
        {loading ? (
          <p>Loading...</p>
        ) : selectedStation && stationData[selectedStation.code] ? (
          <>
            <h3>{selectedStation.name}</h3>
            <p><strong>Station Code:</strong> {selectedStation.code}</p>
            {stationData[selectedStation.code].error ? (
              <p>{stationData[selectedStation.code].error}</p>
            ) : (
              <>
                <p><strong>Current Water Level:</strong> {stationData[selectedStation.code].data[0]?.waterlevelvalue ?? 'N/A'} m</p>
                <p><strong>Flow Rate (Q):</strong> {stationData[selectedStation.code].data[0]?.Q ?? 'N/A'} m³/s</p>
                <p><strong>Province:</strong> {stationData[selectedStation.code].data[0]?.provincename ?? 'N/A'}</p>
                <p><strong>Last Updated:</strong> {stationData[selectedStation.code].data[0]?.hourlydateString ?? 'N/A'}</p>
                <p><strong>Ground Level (ZG):</strong> {stationData[selectedStation.code].data[0]?.ZG ?? 'N/A'} m</p>
                <p><strong>Braelevel:</strong> {stationData[selectedStation.code].data[0]?.braelevel ?? 'N/A'} m</p>
                <p style={{ color: getMarkerColor(selectedStation.code) === 'red' ? 'red' : getMarkerColor(selectedStation.code) === 'orange' ? 'orange' : 'green' }}>
                  <strong>Flood Status:</strong> {getMarkerColor(selectedStation.code) === 'red' ? 'Danger' : getMarkerColor(selectedStation.code) === 'orange' ? 'Warning' : 'Normal'}
                </p>
              </>
            )}
          </>
        ) : (
          <p>Select a station on the map to see details.</p>
        )}
      </div>
      <MapContainer center={mapCenter} zoom={10} className="map-container">
        <TileLayer
          url={
            isDarkMode
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution="Made with 🩷 by Jxxn03 | Data from floodmap.net & ศูนย์อุทกวิทยาชลประทาน"
        />
        <TileLayer
          url="https://www.floodmap.net/getFMTile.ashx?x={x}&y={y}&z={z}&e=311"
          opacity={0.5}
        />
        {stations.map((station, index) => (
          <Marker
            key={index}
            position={station.coords}
            icon={L.divIcon({
              className: `custom-marker-${getMarkerColor(station.code)}`,
              html: `<i class='fa fa-map-marker' style='color:${getMarkerColor(station.code)}; font-size: 24px;'></i>`,
            })}
            eventHandlers={{
              click: () => handleMarkerClick(station),
            }}
          >
            <Popup>
              <h3>{station.name}</h3>
              <p><strong>Station Code:</strong> {station.code}</p>
            </Popup>
          </Marker>
        ))}
        {userLocation && <Marker position={userLocation} />}
      </MapContainer>
      <div className="middle-menu">
        <p>Jxxn03 - FloodMap</p>
        <p>P.1 Water Height: {getWaterHeight('P.1')} m</p>
        <p>P.75 Water Height: {getWaterHeight('P.75')} m</p>
      </div>
    </div>
  );
};

export default App;
