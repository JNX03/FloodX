import React from 'react'
import { Droplets, AlertTriangle, RefreshCw, CloudRain, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface ApiWaterLevelEntry {
  id: number
  station_id: string
  timestamp: string
  data_type: string
  value: number
  unit: string
  raw_data: string
  created_at: string
  updated_at: string
}

interface ApiResponse {
  success: boolean
  data: ApiWaterLevelEntry[]
  timestamp: string
}

interface RainfallCurrentStatus {
  rainfall: number
  unit: string
  timestamp: string
  data_type: string
  intensity_status: string
  message: string
}

interface RainfallApiResponse {
  success: boolean
  data: {
    current_status: RainfallCurrentStatus
    today_summary: { total_rainfall: number; unit: string }
    last_24h_summary: { total_rainfall: number; unit: string }
    historical_data: any[]
    statistics: any
    query_info: any
  }
  timestamp: string
}

// Reference levels and terminology:
// - Absolute water level: Measured from sea level datum (standard geodetic reference)
// - Relative water level: Measured from Zerogate baseline (300.5m above sea level)
// - Zerogate: The baseline reference point at 300.5m above sea level
const ZEROGATE_LEVEL = 300.5  // Zerogate baseline level (300.5m above sea level)
const WARNING_LEVEL = 303.6   // Warning water level (3.1m relative from Zerogate)
const CRITICAL_LEVEL = 304.2  // Critical overflow level (3.7m relative from Zerogate)

interface EmbeddableWaterLevelWidgetProps {
  compact?: boolean
  showRainfall?: boolean
  showCctv?: boolean
  theme?: 'light' | 'dark'
  hideHeader?: boolean
}

const EmbeddableWaterLevelWidget: React.FC<EmbeddableWaterLevelWidgetProps> = ({
  compact = false,
  showRainfall = true,
  showCctv = false,
  theme = 'light',
  hideHeader = false
}) => {
  const { t } = useTranslation()
  const [apiData, setApiData] = React.useState<ApiResponse | null>(null)
  const [rainfallData, setRainfallData] = React.useState<RainfallApiResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [rainfallLoading, setRainfallLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [rainfallError, setRainfallError] = React.useState<string | null>(null)
  
  // Track initial loads vs subsequent refreshes
  const [isInitialWaterLevelLoad, setIsInitialWaterLevelLoad] = React.useState(true)
  const [isInitialRainfallLoad, setIsInitialRainfallLoad] = React.useState(true)
  
  // Flash animation states for data updates
  const [waterLevelFlash, setWaterLevelFlash] = React.useState(false)
  const [rainfallFlash, setRainfallFlash] = React.useState(false)
  
  // CCTV related state
  const [cctvImageKey, setCctvImageKey] = React.useState(Date.now())
  const [isImageLoading, setIsImageLoading] = React.useState(true)
  const [imageError, setImageError] = React.useState(false)
  const [cctvImageLastUpdated, setCctvImageLastUpdated] = React.useState<Date | null>(null)

  // Flash animation trigger function
  const triggerFlash = (setFlashState: React.Dispatch<React.SetStateAction<boolean>>) => {
    setFlashState(true)
    setTimeout(() => setFlashState(false), 600) // Flash duration
  }

  // Fetch water level data
  React.useEffect(() => {
    const fetchWaterLevel = async () => {
      try {
        // Only show loading state during initial load
        if (isInitialWaterLevelLoad) {
          setLoading(true)
        }
        setError(null)
        const response = await fetch('https://ping.nothingtodo.me/api/water-level')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const result: ApiResponse = await response.json()
        if (result.success && result.data && Array.isArray(result.data)) {
          setApiData(result)
          // Trigger flash animation for subsequent updates
          if (!isInitialWaterLevelLoad) {
            triggerFlash(setWaterLevelFlash)
          }
        } else {
          throw new Error('Invalid data format')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isInitialWaterLevelLoad) {
          setLoading(false)
          setIsInitialWaterLevelLoad(false)
        }
      }
    }

    fetchWaterLevel()
    const interval = setInterval(fetchWaterLevel, 30 * 1000)
    return () => clearInterval(interval)
  }, [isInitialWaterLevelLoad])

  // Fetch rainfall data
  React.useEffect(() => {
    if (!showRainfall) {
      setRainfallLoading(false)
      return
    }

    const fetchRainfallData = async () => {
      try {
        // Only show loading state during initial load
        if (isInitialRainfallLoad) {
          setRainfallLoading(true)
        }
        setRainfallError(null)
        const response = await fetch('https://ping.nothingtodo.me/api/rainfall')
        if (!response.ok) {
          throw new Error('Failed to fetch rainfall data')
        }
        const result: RainfallApiResponse = await response.json()
        if (result.success && result.data) {
          setRainfallData(result)
          // Trigger flash animation for subsequent updates
          if (!isInitialRainfallLoad) {
            triggerFlash(setRainfallFlash)
          }
        } else {
          throw new Error('Invalid rainfall data format')
        }
      } catch (err) {
        setRainfallError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isInitialRainfallLoad) {
          setRainfallLoading(false)
          setIsInitialRainfallLoad(false)
        }
      }
    }

    fetchRainfallData()
    const interval = setInterval(fetchRainfallData, 30 * 1000)
    return () => clearInterval(interval)
  }, [showRainfall, isInitialRainfallLoad])

  // Function to refresh CCTV image
  const refreshCctvImage = React.useCallback(() => {
    setIsImageLoading(true)
    setImageError(false)
    setCctvImageKey(Date.now())
    setCctvImageLastUpdated(null) // Reset update time until new image loads
  }, [])

  // Auto-refresh CCTV image every 30 seconds when enabled
  React.useEffect(() => {
    if (!showCctv) return

    const interval = setInterval(() => {
      refreshCctvImage()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [refreshCctvImage, showCctv])

  // Process data
  const processedData = React.useMemo(() => {
    if (!apiData || !apiData.data || apiData.data.length === 0) {
      return {
        currentLevel: 0,
        unit: 'm',
        status: 'normal',
        timestamp: null
      }
    }

    const sortedData = [...apiData.data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    const currentReading = sortedData[0]
    const currentLevel = currentReading?.value || 0
    
    const getWaterLevelStatus = (level: number) => {
      if (level >= CRITICAL_LEVEL) return 'critical'
      if (level >= WARNING_LEVEL) return 'warning'
      return 'normal'
    }
    
    const status = getWaterLevelStatus(currentLevel)
    const unit = currentReading?.unit || 'm'
    
    return {
      currentLevel,
      unit,
      status,
      timestamp: currentReading?.timestamp
    }
  }, [apiData])

  const processedRainfallData = React.useMemo(() => {
    if (!rainfallData || !rainfallData.data) {
      return {
        currentRainfall: 0,
        unit: 'mm',
        intensityStatus: 'none'
      }
    }

    const { current_status } = rainfallData.data
    
    return {
      currentRainfall: current_status.rainfall || 0,
      unit: current_status.unit || 'mm',
      intensityStatus: current_status.intensity_status || 'none'
    }
  }, [rainfallData])

  const { currentLevel, unit, status, timestamp } = processedData
  const { currentRainfall, unit: rainfallUnit, intensityStatus } = processedRainfallData

  const safeCurrentLevel = typeof currentLevel === 'number' && !isNaN(currentLevel) ? currentLevel : 0
  const relativeLevel = safeCurrentLevel - ZEROGATE_LEVEL

  const statusConfig = {
    normal: {
      color: theme === 'dark' ? 'text-green-400' : 'text-green-600',
      bgColor: theme === 'dark' ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50' : 'bg-green-50 border-green-200',
      borderColor: theme === 'dark' ? 'border-green-700/50' : 'border-green-200',
      iconColor: theme === 'dark' ? 'text-green-400' : 'text-green-600'
    },
    warning: {
      color: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
      bgColor: theme === 'dark' ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200',
      borderColor: theme === 'dark' ? 'border-yellow-700/50' : 'border-yellow-200',
      iconColor: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
    },
    critical: {
      color: theme === 'dark' ? 'text-red-400' : 'text-red-600',
      bgColor: theme === 'dark' ? 'bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-700/50' : 'bg-red-50 border-red-200',
      borderColor: theme === 'dark' ? 'border-red-700/50' : 'border-red-200',
      iconColor: theme === 'dark' ? 'text-red-400' : 'text-red-600'
    }
  }

  const currentStatusConfig = statusConfig[status as keyof typeof statusConfig] || statusConfig.normal

  const themeClasses = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700/50 shadow-xl shadow-black/20' 
    : 'bg-white text-gray-900 border-gray-200 shadow-sm'

  if (loading && rainfallLoading) {
    return (
      <div className={`${themeClasses} rounded-lg border p-4 ${compact ? 'min-h-[120px]' : 'min-h-[200px]'}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className={`h-6 w-6 mx-auto mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  const hasWaterLevelData = !loading && apiData && apiData.data && apiData.data.length > 0
  const hasRainfallData = !rainfallLoading && rainfallData && rainfallData.data

  if (!hasWaterLevelData && !hasRainfallData && (error || rainfallError)) {
    return (
      <div className={`${themeClasses} rounded-lg border p-4 ${compact ? 'min-h-[120px]' : 'min-h-[200px]'}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{t('common.dataUnavailable')}</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
              {error || rainfallError || t('common.pleaseTryAgainLater')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`${themeClasses} rounded-lg border p-3`}>
        {!hideHeader && (
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className={`h-4 w-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            {showCctv && <Camera className={`h-4 w-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />}
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{t('embeddableWidget.stationTitle')}</span>
          </div>
        )}

        {/* CCTV Image for compact mode */}
        {showCctv && (
          <div className="mb-3">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-[120px]">
              {!imageError ? (
                <>
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <RefreshCw className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>{t('common.loading')}</p>
                      </div>
                    </div>
                  )}
                  <img
                    key={cctvImageKey}
                    src={`https://ping.nothingtodo.me/api/cctv/image/TP1?t=${cctvImageKey}`}
                    alt="TP1 Station Live CCTV Feed"
                    className="w-full h-full object-contain rounded-lg"
                    onLoad={() => {
                      setIsImageLoading(false)
                      setCctvImageLastUpdated(new Date())
                    }}
                    onError={() => {
                      setIsImageLoading(false)
                      setImageError(true)
                    }}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center bg-gray-100 h-full rounded-lg">
                  <div className="text-center">
                    <Camera className={`h-4 w-4 mx-auto mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-1`}>CCTV unavailable</p>
                    <button
                      onClick={refreshCctvImage}
                      className={`text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
            {cctvImageLastUpdated && (
              <div className={`mt-1 text-xs text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('waterLevel.liveMonitor.imageLastUpdated')}: {cctvImageLastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <div className={`flex items-baseline space-x-1 transition-all duration-300 ${waterLevelFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
              <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {relativeLevel >= 0 ? '+' : ''}{relativeLevel.toFixed(2)}
              </span>
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{unit}</span>
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full ${currentStatusConfig.bgColor} ${currentStatusConfig.color} capitalize font-medium inline-block border ${currentStatusConfig.borderColor}`}>
              {status}
            </div>
          </div>
          
          {showRainfall && hasRainfallData && (
            <div className="text-right">
              <div className={`flex items-center space-x-1 transition-all duration-300 ${rainfallFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
                <CloudRain className={`h-3 w-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                  {currentRainfall.toFixed(1)} {rainfallUnit}
                </span>
              </div>
              <div className={`text-xs px-1.5 py-0.5 rounded-full capitalize mt-1 inline-block border ${
                intensityStatus === 'none' ? 
                  (theme === 'dark' ? 'bg-green-900/20 text-green-400 border-green-700/50' : 'bg-green-50 text-green-600 border-green-200') :
                intensityStatus === 'light' ? 
                  (theme === 'dark' ? 'bg-blue-900/20 text-blue-400 border-blue-700/50' : 'bg-blue-50 text-blue-600 border-blue-200') :
                intensityStatus === 'moderate' ? 
                  (theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-700/50' : 'bg-yellow-50 text-yellow-600 border-yellow-200') :
                  (theme === 'dark' ? 'bg-red-900/20 text-red-400 border-red-700/50' : 'bg-red-50 text-red-600 border-red-200')
              }`}>
                {intensityStatus}
              </div>
            </div>
          )}
        </div>
        
        <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-2 relative`}>
          {timestamp && (
            <span>Updated: {format(new Date(timestamp), 'HH:mm')}</span>
          )}
          
                  {/* Embed Guide Icon - Fixed in bottom right for compact mode */}
        <a 
          href="https://ping.dejabrew.xyz/developer-guide" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`absolute ${timestamp ? 'bottom-0' : 'top-0'} right-0 inline-flex items-center p-0.5 rounded ${theme === 'dark' ? 'text-green-400 hover:text-green-300 hover:bg-slate-800/50' : 'text-green-600 hover:text-green-800 hover:bg-gray-100'} transition-all duration-200`}
          title="Embed Guide"
        >
            <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`${themeClasses} rounded-lg border p-4`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Droplets className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            {showCctv && <Camera className={`h-4 w-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />}
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('embeddableWidget.fullTitle')}</h3>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{t('embeddableWidget.stationSubtitle')}</p>
            </div>
          </div>
          {showCctv && (
            <button
              onClick={refreshCctvImage}
              className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors ${
                theme === 'dark' 
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              disabled={isImageLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isImageLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh CCTV</span>
            </button>
          )}
        </div>
      )}
      
      {/* Status Alert */}
      {status === 'critical' && (
        <div className={`${currentStatusConfig.bgColor} ${currentStatusConfig.borderColor} border rounded-lg p-3 mb-4`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-4 w-4 ${currentStatusConfig.iconColor} flex-shrink-0`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
              CRITICAL: Water level at overflow threshold!
            </span>
          </div>
        </div>
      )}
      
      {status === 'warning' && (
        <div className={`${currentStatusConfig.bgColor} ${currentStatusConfig.borderColor} border rounded-lg p-3 mb-4`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-4 w-4 ${currentStatusConfig.iconColor} flex-shrink-0`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>
              WARNING: Water level at warning threshold!
            </span>
          </div>
        </div>
      )}

      {/* CCTV Image for full mode */}
      {showCctv && (
        <div className="mb-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden h-[320px]">
            {!imageError ? (
              <>
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <RefreshCw className={`h-6 w-6 mx-auto mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`}>{t('common.loadingLiveFeed')}</p>
                    </div>
                  </div>
                )}
                <img
                  key={cctvImageKey}
                  src={`https://ping.nothingtodo.me/api/cctv/image/TP1?t=${cctvImageKey}`}
                  alt="TP1 Station Live CCTV Feed"
                  className="w-full h-full object-contain rounded-lg"
                  onLoad={() => {
                    setIsImageLoading(false)
                    setCctvImageLastUpdated(new Date())
                  }}
                  onError={() => {
                    setIsImageLoading(false)
                    setImageError(true)
                  }}
                />
              </>
            ) : (
              <div className="flex items-center justify-center bg-gray-100 h-full rounded-lg">
                <div className="text-center">
                  <Camera className={`h-8 w-8 mx-auto mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-500'} mb-2`}>Unable to load CCTV feed</p>
                  <button
                    onClick={refreshCctvImage}
                    className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className={`mt-2 text-xs text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} space-y-1`}>
            <div>Live CCTV feed • Auto-refreshes every 30 seconds</div>
            {cctvImageLastUpdated && (
              <div className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('waterLevel.liveMonitor.imageLastUpdated')}: {cctvImageLastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${
        showCctv || !showRainfall || !hasRainfallData ? 'sm:grid-cols-1' : 'sm:grid-cols-2'
      } gap-4`}>
        {/* Water Level Display */}
        {hasWaterLevelData && (
          <div className={`p-4 rounded-lg ${currentStatusConfig.bgColor} border ${
            !showRainfall || !hasRainfallData ? 'max-w-md mx-auto' : ''
          }`}>
            <div className="text-center">
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mb-1`}>{t('waterLevel.title')}</p>
              <div className={`flex items-baseline justify-center space-x-1 mb-2 transition-all duration-300 ${waterLevelFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {relativeLevel >= 0 ? '+' : ''}{relativeLevel.toFixed(2)}
                </p>
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{unit}</span>
              </div>
              
              <div className="flex items-center justify-center mb-3">
                <span className={`text-sm px-3 py-1 rounded-full ${currentStatusConfig.color} capitalize font-medium border ${currentStatusConfig.borderColor} ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/80'
                }`}>
                  {t(`waterLevel.status.${status}`)}
                </span>
              </div>
              
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} space-y-0.5`}>
                <p>{t('waterLevel.absolute')}: {safeCurrentLevel.toFixed(2)} {unit}</p>
                {timestamp && (
                  <p>{t('waterLevel.updated')}: {format(new Date(timestamp), 'MMM dd, HH:mm')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rainfall Display */}
        {showRainfall && hasRainfallData && (
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600/50' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <CloudRain className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{t('embeddableWidget.currentRainfall')}</p>
              </div>
              
              <div className={`flex items-baseline justify-center space-x-1 mb-2 transition-all duration-300 ${rainfallFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {currentRainfall.toFixed(1)}
                </p>
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{rainfallUnit}</span>
              </div>
              
              <div className="flex items-center justify-center">
                <span className={`text-sm px-3 py-1 rounded-full capitalize font-medium border ${
                  intensityStatus === 'none' ? 
                    (theme === 'dark' ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-green-50 text-green-600 border-green-200') :
                  intensityStatus === 'light' ? 
                    (theme === 'dark' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' : 'bg-blue-50 text-blue-600 border-blue-200') :
                  intensityStatus === 'moderate' ? 
                    (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' : 'bg-yellow-50 text-yellow-600 border-yellow-200') :
                  intensityStatus === 'heavy' ? 
                    (theme === 'dark' ? 'bg-orange-900/30 text-orange-400 border-orange-700/50' : 'bg-orange-50 text-orange-600 border-orange-200') :
                    (theme === 'dark' ? 'bg-red-900/30 text-red-400 border-red-700/50' : 'bg-red-50 text-red-600 border-red-200')
                }`}>
                  {intensityStatus}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reference Levels */}
      {hasWaterLevelData && (
        <div className={`mt-4 rounded-lg p-3 border ${
          theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600/50' : 'bg-gray-50 border-gray-200'
        }`}>
                          <h4 className={`text-xs font-semibold mb-2 text-center ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{t('waterLevel.crossSection.referenceTitle')}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className={`text-xs font-medium ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>Warning</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>+{(WARNING_LEVEL - ZEROGATE_LEVEL).toFixed(2)}{unit}<br/>({WARNING_LEVEL.toFixed(1)}{unit})</div>
            </div>
            <div className="text-center">
              <div className={`text-xs font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Critical</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>+{(CRITICAL_LEVEL - ZEROGATE_LEVEL).toFixed(2)}{unit}<br/>({CRITICAL_LEVEL.toFixed(1)}{unit})</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`mt-4 text-xs text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} relative`}>
        <div>Auto-refreshes every 30 seconds</div>
        <div className="mt-1">
          <a 
            href="https://ping.dejabrew.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
          >
            View Full Monitor →
          </a>
        </div>
        
        {/* Embed Guide Icon - Fixed in bottom right */}
        <a 
          href="https://ping.dejabrew.xyz/developer-guide" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`absolute bottom-0 right-0 inline-flex items-center p-1 rounded ${theme === 'dark' ? 'text-green-400 hover:text-green-300 hover:bg-slate-800/50' : 'text-green-600 hover:text-green-800 hover:bg-gray-100'} transition-all duration-200`}
          title="Embed Guide"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default EmbeddableWaterLevelWidget 