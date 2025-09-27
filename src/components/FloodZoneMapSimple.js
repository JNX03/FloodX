import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Camera, Droplets, Image as ImageIcon, Info, Layers, Ruler } from 'lucide-react';
import floodPolesData from '../data/flood-poles-data.json';
import { apiUrl } from '../lib/api';

const FloodZoneMapSimple = ({
  currentWaterLevel = 300.5,
  className = ""
}) => {
  const [photos, setPhotos] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const photoCount = photos.length;

  // Simple translation function
  const t = (key) => {
    const translations = {
      'floodZoneMap.title': 'CMU Flood Zone Map (221 Poles)',
      'floodZoneMap.loadingMap': 'Loading map...',
      'floodZoneMap.failedToLoadMaps': 'Failed to load Google Maps',
      'floodZoneMap.checkApiKey': 'Please check API key configuration',
      'floodZoneMap.floodZones': 'Flood Zones',
      'floodZoneMap.waterLevelSimulation': 'Water Level Simulation',
      'floodZoneMap.absolute': 'absolute',
      'floodZoneMap.zerogate': 'Zerogate',
      'floodZoneMap.warning': 'Warning',
      'floodZoneMap.critical': 'Critical',
      'floodZoneMap.flood2024': '2024 Flood',
      'floodZoneMap.safePoles': 'Safe',
      'floodZoneMap.warningPoles': 'Warning',
      'floodZoneMap.floodedPoles': 'Flooded',
      'floodZoneMap.mapHidden': 'Map view is hidden',
      'floodZoneMap.legend': 'Legend:',
      'floodZoneMap.safe': 'Safe',
      'floodZoneMap.warning': 'Warning',
      'floodZoneMap.flooded': 'Flooded',
      'floodZoneMap.basedOnCmu': 'Based on CMU flood monitoring system with {count} poles',
      'floodZoneMap.infoWindow.code': 'Code:',
      'floodZoneMap.infoWindow.baseLevel': 'Base Level:',
      'floodZoneMap.infoWindow.floodLevel': 'Flood Level:',
      'floodZoneMap.infoWindow.currentWater': 'Current Water:',
      'floodZoneMap.infoWindow.status': 'Status:'
    };
    return translations[key] || key;
  };

  const render = (status) => {
    if (status === Status.LOADING) return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.loadingMap')}</p>
        </div>
      </div>
    );
    if (status === Status.FAILURE) return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.failedToLoadMaps')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('floodZoneMap.checkApiKey')}</p>
        </div>
      </div>
    );
    return <div></div>;
  };

  const [waterLevel, setWaterLevel] = useState(currentWaterLevel);
  const [showFloodZones, setShowFloodZones] = useState(true);

  // Reference levels
  const ZEROGATE_LEVEL = 300.5;
  const WARNING_LEVEL = 303.6;
  const CRITICAL_LEVEL = 304.2;
  const FLOOD_2024_LEVEL = 305.78;

  // Process flood poles data
  const floodPoles = useMemo(() => {
    return floodPolesData.flood_poles || [];
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/photos/list'));
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(Array.isArray(data.photos) ? data.photos : []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPhotos();
    const id = setInterval(fetchPhotos, 60000);
    return () => clearInterval(id);
  }, [fetchPhotos]);

  // Get flood zone status for each pole
  const getFloodStatus = useCallback((pole) => {
    if (waterLevel < CRITICAL_LEVEL) {
      return 'safe';
    }

    const poleFloodLevel = pole.base_level + pole.flood_height_from_base;

    if (waterLevel >= poleFloodLevel) {
      return 'flooded';
    } else if (waterLevel >= (poleFloodLevel - 0.5)) {
      return 'warning';
    }
    return 'safe';
  }, [waterLevel, CRITICAL_LEVEL]);

  // Get water level status color
  const getWaterLevelColor = () => {
    if (waterLevel >= CRITICAL_LEVEL) return 'text-red-600 dark:text-red-400';
    if (waterLevel >= WARNING_LEVEL) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Get slider color based on water level
  const getSliderColor = () => {
    if (waterLevel >= CRITICAL_LEVEL) return '#ef4444';
    if (waterLevel >= WARNING_LEVEL) return '#f59e0b';
    return '#10b981';
  };

  const relativeWaterLevel = waterLevel - ZEROGATE_LEVEL;

  // Simple Google Map Component
  const GoogleMapComponent = ({ floodPoles, getFloodStatus, waterLevel, photos }) => {
    const ref = useRef();
    const [map, setMap] = useState();
    const [markers, setMarkers] = useState([]);

    // Initialize map
    useEffect(() => {
      if (ref.current && !map) {
        const newMap = new window.google.maps.Map(ref.current, {
          center: { lat: 18.7883, lng: 98.9853 },
          zoom: 13,
          mapTypeId: 'roadmap'
        });
        setMap(newMap);
      }
    }, [ref, map]);

    // Update markers when flood status changes
    useEffect(() => {
      if (!map || !floodPoles.length) return;

      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));

      // Create new markers
      const newMarkers = floodPoles.map(pole => {
        const status = getFloodStatus(pole);
        const color = status === 'flooded' ? '#ef4444' :
                     status === 'warning' ? '#f59e0b' : '#10b981';

        const marker = new window.google.maps.Marker({
          position: { lat: pole.coordinates.lat, lng: pole.coordinates.lng },
          map: map,
          title: `${pole.location_en} (${pole.code})`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="max-width: 250px; padding: 4px;">
              <h4 style="margin: 0 0 8px 0; font-weight: bold;">${pole.location_en}</h4>
              <p style="margin: 4px 0;"><strong>${t('floodZoneMap.infoWindow.code')}</strong> ${pole.code}</p>
              <p style="margin: 4px 0;"><strong>${t('floodZoneMap.infoWindow.baseLevel')}</strong> ${pole.base_level}m</p>
              <p style="margin: 4px 0;"><strong>${t('floodZoneMap.infoWindow.floodLevel')}</strong> ${pole.max_flood_level.toFixed(2)}m</p>
              <p style="margin: 4px 0;"><strong>${t('floodZoneMap.infoWindow.currentWater')}</strong> ${waterLevel.toFixed(2)}m</p>
              <p style="margin: 4px 0;"><strong>${t('floodZoneMap.infoWindow.status')}</strong>
                <span style="color: ${color}; font-weight: bold; text-transform: capitalize;">${status}</span>
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        return marker;
      });

      setMarkers(newMarkers);
    }, [map, floodPoles, getFloodStatus, waterLevel]);

    return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Droplets className="h-6 w-6 text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('floodZoneMap.title')}</h3>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFloodZones(!showFloodZones)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                showFloodZones
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>{t('floodZoneMap.floodZones')}</span>
            </button>
          </div>
        </div>

        {/* Water Level Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('floodZoneMap.waterLevelSimulation')}
            </label>
            <div className="flex items-center space-x-2">
              <Ruler className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className={`font-semibold ${getWaterLevelColor()}`}>
                {relativeWaterLevel >= 0 ? '+' : ''}{relativeWaterLevel.toFixed(2)}m
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({waterLevel.toFixed(2)}m {t('floodZoneMap.absolute')})
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min={ZEROGATE_LEVEL}
              max={FLOOD_2024_LEVEL}
              step={0.1}
              value={waterLevel}
              onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right,
                  #10b981 0%,
                  #10b981 ${((WARNING_LEVEL - ZEROGATE_LEVEL) / (FLOOD_2024_LEVEL - ZEROGATE_LEVEL)) * 100}%,
                  #f59e0b ${((WARNING_LEVEL - ZEROGATE_LEVEL) / (FLOOD_2024_LEVEL - ZEROGATE_LEVEL)) * 100}%,
                  #f59e0b ${((CRITICAL_LEVEL - ZEROGATE_LEVEL) / (FLOOD_2024_LEVEL - ZEROGATE_LEVEL)) * 100}%,
                  #ef4444 ${((CRITICAL_LEVEL - ZEROGATE_LEVEL) / (FLOOD_2024_LEVEL - ZEROGATE_LEVEL)) * 100}%,
                  #ef4444 100%)`
              }}
            />

            {/* Reference level markers */}
            <div className="mt-2 flex justify-between text-gray-500 dark:text-gray-400" style={{ fontSize: '10px', lineHeight: '1.2' }}>
              <span>{t('floodZoneMap.zerogate')}<br/>{ZEROGATE_LEVEL}m</span>
              <span>{t('floodZoneMap.warning')}<br/>{WARNING_LEVEL}m</span>
              <span>{t('floodZoneMap.critical')}<br/>{CRITICAL_LEVEL}m</span>
              <span>{t('floodZoneMap.flood2024')}<br/>{FLOOD_2024_LEVEL}m</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {floodPoles.filter(p => getFloodStatus(p) === 'safe').length}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">{t('floodZoneMap.safePoles')}</div>
          </div>
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {floodPoles.filter(p => getFloodStatus(p) === 'warning').length}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">{t('floodZoneMap.warningPoles')}</div>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {floodPoles.filter(p => getFloodStatus(p) === 'flooded').length}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">{t('floodZoneMap.floodedPoles')}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative h-96">
        {showFloodZones ? (
          <Wrapper
            apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ""}
            render={render}
          >
            <GoogleMapComponent
              floodPoles={floodPoles}
              getFloodStatus={getFloodStatus}
              waterLevel={waterLevel}
              photos={photos}
            />
          </Wrapper>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-600 h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Layers className="h-8 w-8 mx-auto mb-2" />
              <p>{t('floodZoneMap.mapHidden')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-200">{t('floodZoneMap.legend')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.safe')} ({floodPoles.filter(p => getFloodStatus(p) === 'safe').length})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.warning')} ({floodPoles.filter(p => getFloodStatus(p) === 'warning').length})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.flooded')} ({floodPoles.filter(p => getFloodStatus(p) === 'flooded').length})</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t('floodZoneMap.basedOnCmu').replace('{count}', floodPoles.length.toString())}
        </div>
      </div>

      {/* Custom slider styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${getSliderColor()};
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background-color 0.2s ease;
          }

          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${getSliderColor()};
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background-color 0.2s ease;
          }
        `
      }} />
    </div>
  );
};

export default FloodZoneMapSimple;