import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { Camera, Droplets, Image as ImageIcon, Info, Layers, Ruler } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme'
import floodPolesData from '../data/flood-poles-data.json'
import PhotoUpload from './PhotoUpload'
import PhotoTimeline from './PhotoTimeline'
import { apiUrl } from '../lib/api'

interface FloodPole {
  id: number
  code: string
  location: string
  location_en: string
  base_level: number
  max_flood_level: number
  flood_height_from_base: number
  coordinates: {
    lat: number
    lng: number
  }
  image_url: string
  series: string
}

interface FloodZoneMapProps {
  currentWaterLevel?: number
  className?: string
}

interface GoogleMapProps {
  floodPoles: FloodPole[]
  getFloodStatus: (pole: FloodPole) => string
  waterLevel: number
  t: (key: string) => string
  theme: 'light' | 'dark'
  photos: { id: string, lat: number, lng: number, createdAt: number, expiresAt: number }[]
}

const GoogleMapComponent: React.FC<GoogleMapProps> = ({ floodPoles, getFloodStatus, waterLevel, t, theme, photos }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map>()
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [photoMarkers, setPhotoMarkers] = useState<google.maps.Marker[]>([])

  // Dark mode styles for Google Maps
  const darkMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ]

  // Light mode styles for Google Maps
  const lightMapStyles = [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
    }
  ]

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center: { lat: 18.7883, lng: 98.9853 }, // Chiang Mai coordinates
        zoom: 13,
        mapTypeId: 'roadmap',
        styles: theme === 'dark' ? darkMapStyles : lightMapStyles
      })
      setMap(newMap)
    }
  }, [ref, map, theme])

  // Update map styles when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({
        styles: theme === 'dark' ? darkMapStyles : lightMapStyles
      })
    }
  }, [map, theme])

  // Update markers when flood status changes
  useEffect(() => {
    if (!map || !floodPoles.length) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))

    // Create new markers
    const newMarkers = floodPoles.map(pole => {
      const status = getFloodStatus(pole)
      const color = status === 'flooded' ? '#ef4444' : 
                   status === 'warning' ? '#f59e0b' : '#10b981'

      const marker = new google.maps.Marker({
        position: { lat: pole.coordinates.lat, lng: pole.coordinates.lng },
        map: map,
        title: `${pole.location_en} (${pole.code})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: theme === 'dark' ? '#374151' : '#ffffff',
          strokeWeight: 2,
          scale: 8
        }
      })

      // Add info window with theme-aware styling
      const infoWindowBg = theme === 'dark' ? '#1f2937' : '#ffffff'
      const infoWindowText = theme === 'dark' ? '#f3f4f6' : '#1f2937'
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px; background-color: ${infoWindowBg}; color: ${infoWindowText}; padding: 4px;">
            <h4 style="margin: 0 0 8px 0; font-weight: bold; color: ${infoWindowText};">${pole.location_en}</h4>
            <p style="margin: 4px 0; color: ${infoWindowText};"><strong>${t('floodZoneMap.infoWindow.code')}</strong> ${pole.code}</p>
            <p style="margin: 4px 0; color: ${infoWindowText};"><strong>${t('floodZoneMap.infoWindow.baseLevel')}</strong> ${pole.base_level}m</p>
            <p style="margin: 4px 0; color: ${infoWindowText};"><strong>${t('floodZoneMap.infoWindow.floodLevel')}</strong> ${(pole.base_level + pole.flood_height_from_base).toFixed(2)}m</p>
            <p style="margin: 4px 0; color: ${infoWindowText};"><strong>${t('floodZoneMap.infoWindow.currentWater')}</strong> ${waterLevel.toFixed(2)}m</p>
            <p style="margin: 4px 0; color: ${infoWindowText};"><strong>${t('floodZoneMap.infoWindow.status')}</strong> 
              <span style="color: ${color}; font-weight: bold; text-transform: capitalize;">${status}</span>
            </p>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      return marker
    })

    setMarkers(newMarkers)
  }, [map, floodPoles, getFloodStatus, waterLevel, theme])

  // Update photo markers when photos change
  useEffect(() => {
    if (!map) return

    photoMarkers.forEach(marker => marker.setMap(null))

    const newMarkers = photos.map(photo => {
      const marker = new google.maps.Marker({
        position: { lat: photo.lat, lng: photo.lng },
        map: map,
        title: `Photo ${new Date(photo.createdAt).toLocaleString()}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
          strokeColor: theme === 'dark' ? '#1e40af' : '#93c5fd',
          strokeWeight: 2,
          scale: 6
        }
      })
      const infoWindowBg = theme === 'dark' ? '#1f2937' : '#ffffff'
      const infoWindowText = theme === 'dark' ? '#f3f4f6' : '#1f2937'
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 260px; background-color: ${infoWindowBg}; color: ${infoWindowText}; padding: 4px;">
            <div style="font-size: 12px; margin-bottom: 4px;">${new Date(photo.createdAt).toLocaleString()}</div>
            <img src="${apiUrl(`/api/photos/image/${photo.id}`)}" style="width: 100%; height: auto; border-radius: 6px;" />
            <div style="font-size: 11px; margin-top: 4px; color: ${infoWindowText};">Expires in ~${Math.max(0, Math.round((photo.expiresAt - Date.now()) / (60*60*1000)))}h</div>
          </div>
        `
      })
      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })
      return marker
    })

    setPhotoMarkers(newMarkers)
  }, [map, photos, theme])

  // Display-only map

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}

const FloodZoneMap: React.FC<FloodZoneMapProps> = ({ 
  currentWaterLevel = 300.5, 
  className = "" 
}) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [photos, setPhotos] = useState<{ id: string, lat: number, lng: number, createdAt: number, expiresAt: number }[]>([])
  const [showUpload, setShowUpload] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'map' | 'photos'>('map')
  const photoCount = photos.length

  const render = (status: Status) => {
    if (status === Status.LOADING) return <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.loadingMap')}</p>
      </div>
    </div>
    if (status === Status.FAILURE) return <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-red-500 mb-2">⚠️</div>
                    <p className="text-gray-600 dark:text-gray-300">{t('floodZoneMap.failedToLoadMaps')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('floodZoneMap.checkApiKey')}</p>
      </div>
    </div>
    return <div></div>
  }
  const [waterLevel, setWaterLevel] = useState<number>(currentWaterLevel)
  const [showFloodZones, setShowFloodZones] = useState<boolean>(true)

  // Reference levels and terminology:
  // - Absolute water level: Measured from sea level datum (standard geodetic reference)
  // - Relative water level: Measured from Zerogate baseline (300.5m above sea level)
  // - Zerogate: The baseline reference point at 300.5m above sea level
  const ZEROGATE_LEVEL = 300.5  // Zerogate baseline level (300.5m above sea level)
  const WARNING_LEVEL = 303.6   // Warning water level (3.1m relative from Zerogate)
  const CRITICAL_LEVEL = 304.2  // Critical overflow level (3.7m relative from Zerogate)
  const FLOOD_2024_LEVEL = 305.78  // 2024 flood level (5.28m relative from Zerogate)

  // Process flood poles data
  const floodPoles: FloodPole[] = useMemo(() => {
    return floodPolesData.flood_poles || []
  }, [])

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/photos/list'))
      if (!res.ok) return
      const data = await res.json()
      setPhotos(Array.isArray(data.photos) ? data.photos : [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchPhotos()
    const id = setInterval(fetchPhotos, 60000)
    return () => clearInterval(id)
  }, [fetchPhotos])

  // Upload handled by external component

  // Get flood zone status for each pole
  const getFloodStatus = useCallback((pole: FloodPole) => {
    // Only consider flood risk when river overflows (reaches critical level)
    if (waterLevel < CRITICAL_LEVEL) {
      return 'safe'
    }
    
    const poleFloodLevel = pole.base_level + pole.flood_height_from_base
    
    if (waterLevel >= poleFloodLevel) {
      return 'flooded'
    } else if (waterLevel >= (poleFloodLevel - 0.5)) {
      return 'warning'
    }
    return 'safe'
  }, [waterLevel, CRITICAL_LEVEL])

  // Get water level status color
  const getWaterLevelColor = () => {
    if (waterLevel >= CRITICAL_LEVEL) return 'text-red-600 dark:text-red-400'
    if (waterLevel >= WARNING_LEVEL) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  // Get slider color based on water level
  const getSliderColor = () => {
    if (waterLevel >= CRITICAL_LEVEL) return '#ef4444' // red
    if (waterLevel >= WARNING_LEVEL) return '#f59e0b' // yellow/orange
    return '#10b981' // green
  }

  const relativeWaterLevel = waterLevel - ZEROGATE_LEVEL

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Droplets className="h-6 w-6 text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('floodZoneMap.title')}</h3>
            <div className="ml-3">
              <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-full p-1 border border-gray-200 dark:border-gray-700">
                <button
                  aria-pressed={activeTab === 'map'}
                  className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors ${activeTab === 'map' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'}`}
                  onClick={() => setActiveTab('map')}
                >
                  <Layers className="h-4 w-4" />
                  <span>Map</span>
                </button>
                <button
                  aria-pressed={activeTab === 'photos'}
                  className={`ml-1 flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors ${activeTab === 'photos' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'}`}
                  onClick={() => setActiveTab('photos')}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Photos</span>
                  {photoCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] bg-blue-600 text-white">{photoCount}</span>
                  )}
                </button>
              </div>
            </div>
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
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
            >
              <Camera className="h-4 w-4" />
              <span>Share Photo</span>
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
              <span className="text-sm text-gray-500 dark:text-gray-400" title={t('waterLevel.explanations.absoluteLevel')}>
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

      {/* Tabs moved next to title */}

      {/* Content */}
      <div className="relative h-96">
        {activeTab === 'map' ? (
          showFloodZones ? (
            <Wrapper 
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
              render={render}
            >
              <GoogleMapComponent 
                floodPoles={floodPoles}
                getFloodStatus={getFloodStatus}
                waterLevel={waterLevel}
                t={t}
                theme={theme}
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
          )
        ) : (
          <PhotoTimeline photos={photos} onUploadClick={() => setShowUpload(true)} />
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUpload(false)}></div>
          <div className="relative z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-[90vw] max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Share a photo</div>
              <button onClick={() => setShowUpload(false)} className="text-sm text-gray-600 dark:text-gray-300">Close</button>
            </div>
            <PhotoUpload onClose={() => setShowUpload(false)} onUploaded={fetchPhotos} />
          </div>
        </div>
      )}

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
  )
}

export default FloodZoneMap 