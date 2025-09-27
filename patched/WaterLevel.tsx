import React from 'react'
import { Droplets, AlertTriangle, Camera, RefreshCw, Cloud, CloudRain, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'
import Chart from 'react-apexcharts'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import FloodZoneMap from './FloodZoneMap'
import WaterLevelCrossSectionDiagram from './WaterLevelCrossSectionDiagram'



interface WaterLevelHistoryData {
  timestamp: string
  value: number
}

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

// Rainfall API interfaces
interface RainfallCurrentStatus {
  rainfall: number
  unit: string
  timestamp: string
  data_type: string
  intensity_status: string
  message: string
}

interface RainfallSummary {
  total_rainfall: number
  date?: string
  period?: string
  unit: string
}

interface RainfallHistoricalData {
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

interface RainfallStatistics {
  total_measurements: number
  min_rainfall: number | null
  max_rainfall: number | null
  avg_rainfall: number | null
  total_rainfall: number | null
  earliest_measurement: string
  latest_measurement: string
  unit: string
}

interface RainfallApiResponse {
  success: boolean
  data: {
    current_status: RainfallCurrentStatus
    today_summary: RainfallSummary
    last_24h_summary: RainfallSummary
    historical_data: RainfallHistoricalData[]
    statistics: RainfallStatistics
    query_info: {
      limit: number
      offset: number
      start_date: string | null
      end_date: string | null
      total_records_returned: number
    }
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
const FLOOD_2024_LEVEL = 305.78  // 2024 flood level (5.28m relative from Zerogate)

// Function to generate water level favicon
const generateWaterLevelFavicon = (waterLevel: number, status: string = 'normal') => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  canvas.width = 32
  canvas.height = 32

  // Background circle with status color
  ctx.fillStyle = status === 'critical' ? '#DC2626' : 
                 status === 'warning' ? '#F59E0B' : '#10B981'
  ctx.beginPath()
  ctx.arc(16, 16, 15, 0, 2 * Math.PI)
  ctx.fill()

  // Calculate relative water level
  const relativeLevel = waterLevel - ZEROGATE_LEVEL
  
  // Center the water level number
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 10px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Format the number for display (keep it concise for the small icon)
  const levelText = relativeLevel >= 0 ? `+${relativeLevel.toFixed(1)}` : `${relativeLevel.toFixed(1)}`
  ctx.fillText(levelText, 16, 16)

  return canvas.toDataURL('image/png')
}

const WaterLevel: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const location = useLocation()
  
  // API state management
  const [apiData, setApiData] = React.useState<ApiResponse | null>(null)
  const [rainfallData, setRainfallData] = React.useState<RainfallApiResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [rainfallLoading, setRainfallLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [rainfallError, setRainfallError] = React.useState<string | null>(null)
  
  // Track initial loads vs subsequent refreshes
  const [isInitialWaterLevelLoad, setIsInitialWaterLevelLoad] = React.useState(true)
  const [isInitialRainfallLoad, setIsInitialRainfallLoad] = React.useState(true)
  const [isInitialHistoricalWaterLoad, setIsInitialHistoricalWaterLoad] = React.useState(true)
  const [isInitialHistoricalRainfallLoad, setIsInitialHistoricalRainfallLoad] = React.useState(true)
  
  // Flash animation states for data updates
  const [waterLevelFlash, setWaterLevelFlash] = React.useState(false)
  const [rainfallFlash, setRainfallFlash] = React.useState(false)
  
  // Historical data state (for charts - refreshed every 5 minutes)
  const [historicalApiData, setHistoricalApiData] = React.useState<ApiResponse | null>(null)
  const [historicalRainfallData, setHistoricalRainfallData] = React.useState<RainfallApiResponse | null>(null)
  const [historicalLoading, setHistoricalLoading] = React.useState(true)
  const [historicalRainfallLoading, setHistoricalRainfallLoading] = React.useState(true)
  const [cctvImageKey, setCctvImageKey] = React.useState(Date.now())
  const [isImageLoading, setIsImageLoading] = React.useState(true)
  const [imageError, setImageError] = React.useState(false)
  const [cctvImageLastUpdated, setCctvImageLastUpdated] = React.useState<Date | null>(null)
  
  // Mobile UI state
  const [showFloodInfo, setShowFloodInfo] = React.useState(false)
  const [showCharts, setShowCharts] = React.useState(true)
  
  // Chart display mode state - default to relative water level
  const [showRelativeLevel, setShowRelativeLevel] = React.useState(true)

  // Check if we're on desktop (screen width >= 640px)
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 640)
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 640)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Flash animation trigger function
  const triggerFlash = (setFlashState: React.Dispatch<React.SetStateAction<boolean>>) => {
    setFlashState(true)
    setTimeout(() => setFlashState(false), 600) // Flash duration
  }

  // Define fetch functions to be reused for retry functionality
  const fetchWaterLevel = React.useCallback(async () => {
    try {
      // Only show loading state during initial load
      if (isInitialWaterLevelLoad) {
        setLoading(true)
      }
      setError(null)
      const response = await fetch('https://ping.nothingtodo.me/api/water-level')
      if (!response.ok) {
        throw new Error('Failed to fetch water level data')
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
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      if (isInitialWaterLevelLoad) {
        setLoading(false)
        setIsInitialWaterLevelLoad(false)
      }
    }
  }, [isInitialWaterLevelLoad])

  const fetchRainfallData = React.useCallback(async () => {
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
      setRainfallError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      if (isInitialRainfallLoad) {
        setRainfallLoading(false)
        setIsInitialRainfallLoad(false)
      }
    }
  }, [isInitialRainfallLoad])

  const fetchHistoricalWaterLevel = React.useCallback(async () => {
    try {
      // Only show loading state during initial load
      if (isInitialHistoricalWaterLoad) {
        setHistoricalLoading(true)
      }
      const response = await fetch('https://ping.nothingtodo.me/api/water-level')
      if (!response.ok) {
        throw new Error('Failed to fetch historical water level data')
      }
      const result: ApiResponse = await response.json()
      if (result.success && result.data && Array.isArray(result.data)) {
        setHistoricalApiData(result)
      }
    } catch (err) {
      console.warn('Failed to fetch historical water level data:', err)
    } finally {
      if (isInitialHistoricalWaterLoad) {
        setHistoricalLoading(false)
        setIsInitialHistoricalWaterLoad(false)
      }
    }
  }, [isInitialHistoricalWaterLoad])

  const fetchHistoricalRainfallData = React.useCallback(async () => {
    try {
      // Only show loading state during initial load
      if (isInitialHistoricalRainfallLoad) {
        setHistoricalRainfallLoading(true)
      }
      const response = await fetch('https://ping.nothingtodo.me/api/rainfall')
      if (!response.ok) {
        throw new Error('Failed to fetch historical rainfall data')
      }
      const result: RainfallApiResponse = await response.json()
      if (result.success && result.data) {
        setHistoricalRainfallData(result)
      }
    } catch (err) {
      console.warn('Failed to fetch historical rainfall data:', err)
    } finally {
      if (isInitialHistoricalRainfallLoad) {
        setHistoricalRainfallLoading(false)
        setIsInitialHistoricalRainfallLoad(false)
      }
    }
  }, [isInitialHistoricalRainfallLoad])

  // Fetch water level data from API
  React.useEffect(() => {
    fetchWaterLevel()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchWaterLevel, 30 * 1000)

    return () => clearInterval(interval)
  }, [fetchWaterLevel])

  // Fetch rainfall data from API
  React.useEffect(() => {
    fetchRainfallData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchRainfallData, 30 * 1000)

    return () => clearInterval(interval)
  }, [fetchRainfallData])

  // Fetch historical water level data for charts (every 5 minutes)
  React.useEffect(() => {
    fetchHistoricalWaterLevel()
    // Refresh historical data every 5 minutes for charts
    const interval = setInterval(fetchHistoricalWaterLevel, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchHistoricalWaterLevel])

  // Fetch historical rainfall data for charts (every 5 minutes)
  React.useEffect(() => {
    fetchHistoricalRainfallData()
    // Refresh historical data every 5 minutes for charts
    const interval = setInterval(fetchHistoricalRainfallData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchHistoricalRainfallData])

  // Function to refresh CCTV image
  const refreshCctvImage = React.useCallback(() => {
    setIsImageLoading(true)
    setImageError(false)
    setCctvImageKey(Date.now())
    setCctvImageLastUpdated(null) // Reset update time until new image loads
  }, [])

  // Retry function to refresh all data without page reload
  const retryDataFetch = React.useCallback(async () => {
    // Clear all error states
    setError(null)
    setRainfallError(null)
    
    // Reset initial load flags to show loading states during retry
    setIsInitialWaterLevelLoad(true)
    setIsInitialRainfallLoad(true)
    setIsInitialHistoricalWaterLoad(true)
    setIsInitialHistoricalRainfallLoad(true)
    
    // Refresh CCTV image
    refreshCctvImage()
    
    // Fetch all data
    await Promise.all([
      fetchWaterLevel(),
      fetchRainfallData(),
      fetchHistoricalWaterLevel(),
      fetchHistoricalRainfallData()
    ])
  }, [fetchWaterLevel, fetchRainfallData, fetchHistoricalWaterLevel, fetchHistoricalRainfallData, refreshCctvImage])

  // Auto-refresh CCTV image every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshCctvImage()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [refreshCctvImage])

  // SEO and Favicon Updates
  React.useEffect(() => {
    // Only update title and favicon when on the main water level page
    // Check if we're on the root path to avoid conflicts with other pages
    if (location.pathname === '/') {
      // Only update when we have valid data
      if (!loading && apiData && apiData.data && apiData.data.length > 0) {
        // Get the most recent reading
        const sortedData = [...apiData.data].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        
        const currentReading = sortedData[0]
        const currentLevel = currentReading?.value || 0
        const unit = currentReading?.unit || 'm'
        const relativeLevel = currentLevel - ZEROGATE_LEVEL
        
        // Determine status
        const status = currentLevel >= CRITICAL_LEVEL ? 'critical' : 
                      currentLevel >= WARNING_LEVEL ? 'warning' : 'normal'
        
        const favicon = generateWaterLevelFavicon(currentLevel, status)
        
        const dynamicTitle = `${relativeLevel >= 0 ? '+' : ''}${relativeLevel.toFixed(2)}${unit} - Ping River Monitor`
        
        // Update document title
        document.title = dynamicTitle
        
        // Update favicon
        const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        if (existingFavicon) {
          existingFavicon.remove()
        }
        
        const link = document.createElement('link')
        link.rel = 'icon'
        link.type = 'image/png'
        link.href = favicon
        document.head.appendChild(link)
      } else if (!loading && !rainfallLoading) {
        // Reset to default title when no data is available
        document.title = 'Ping River Monitor - Real-time Water Level & Rainfall'
        
        // Reset to default favicon
        const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        if (existingFavicon) {
          existingFavicon.remove()
        }
        
        const link = document.createElement('link')
        link.rel = 'icon'
        link.type = 'image/svg+xml'
        link.href = '/vite.svg'
        document.head.appendChild(link)
      }
    }
  }, [loading, apiData, rainfallLoading, location.pathname])

  // Process current API data (for real-time readings)
  const processedData = React.useMemo(() => {
    if (!apiData || !apiData.data || apiData.data.length === 0) {
      return {
        currentLevel: 0,
        unit: 'm',
        status: 'normal'
      }
    }

    // Sort data by timestamp and get the most recent reading
    const sortedData = [...apiData.data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    const currentReading = sortedData[0]
    const currentLevel = currentReading?.value || 0
    
    // Calculate status based on current level thresholds
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
      status
    }
  }, [apiData])

  // Process historical data for charts (refreshed every 5 minutes)
  const processedHistoricalData = React.useMemo(() => {
    if (!historicalApiData || !historicalApiData.data || historicalApiData.data.length === 0) {
      return {
        historicalData: []
      }
    }

    // Sort data by timestamp and get all readings for chart
    const sortedData = [...historicalApiData.data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    // Transform data for historical chart
    const historicalData: WaterLevelHistoryData[] = sortedData
      .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
      .map(item => ({
        timestamp: item.timestamp,
        value: item.value
      }))
      .reverse() // Sort chronologically for chart

    return {
      historicalData
    }
  }, [historicalApiData])

  // Process current rainfall data (for real-time readings)
  const processedRainfallData = React.useMemo(() => {
    if (!rainfallData || !rainfallData.data) {
      return {
        currentRainfall: 0,
        unit: 'mm',
        intensityStatus: 'none',
        message: 'No data available',
        todayTotal: 0,
        last24hTotal: 0,
        timestamp: null
      }
    }

    const { current_status, today_summary, last_24h_summary } = rainfallData.data

    return {
      currentRainfall: current_status.rainfall || 0,
      unit: current_status.unit || 'mm',
      intensityStatus: current_status.intensity_status || 'none',
      message: current_status.message || 'No data available',
      todayTotal: today_summary.total_rainfall || 0,
      last24hTotal: last_24h_summary.total_rainfall || 0,
      timestamp: current_status.timestamp
    }
  }, [rainfallData])

  // Process historical rainfall data for charts (refreshed every 5 minutes)
  const processedHistoricalRainfallData = React.useMemo(() => {
    if (!historicalRainfallData || !historicalRainfallData.data) {
      return {
        historicalData: []
      }
    }

    const { historical_data } = historicalRainfallData.data
    
    // Transform historical data for chart
    const historicalData = historical_data
      .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
      .map(item => ({
        timestamp: item.timestamp,
        value: item.value
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      historicalData
    }
  }, [historicalRainfallData])

  const { currentLevel, unit, status } = processedData
  const { historicalData } = processedHistoricalData
  const { 
    currentRainfall, 
    unit: rainfallUnit, 
    intensityStatus, 
    message: _rainfallMessage,
    todayTotal: _todayTotal,
    last24hTotal: _last24hTotal,
    timestamp: _rainfallTimestamp
  } = processedRainfallData
  const { historicalData: rainfallHistoricalData } = processedHistoricalRainfallData

  // Validate and normalize data
  const safeCurrentLevel = typeof currentLevel === 'number' && !isNaN(currentLevel) ? currentLevel : 0
  const safeUnit = unit || 'm'
  const safeStatus = status || 'normal'
  const safeHistoricalData = Array.isArray(historicalData) ? historicalData : []
  
  // Validate and normalize rainfall data
  const safeCurrentRainfall = typeof currentRainfall === 'number' && !isNaN(currentRainfall) ? currentRainfall : 0
  const safeRainfallUnit = rainfallUnit || 'mm'
  const safeIntensityStatus = intensityStatus || 'none'
  const safeRainfallHistoricalData = Array.isArray(rainfallHistoricalData) ? rainfallHistoricalData : []

  // Calculate relative water level
  const relativeLevel = safeCurrentLevel - ZEROGATE_LEVEL

  // Prepare chart data with safe data handling
  const chartData = safeHistoricalData
    .filter(item => item && item.timestamp && typeof item.value === 'number' && !isNaN(item.value))
    .map(item => ({
      x: new Date(item.timestamp).getTime(),
      y: showRelativeLevel ? 
        parseFloat((item.value - ZEROGATE_LEVEL).toFixed(2)) : 
        parseFloat(item.value.toFixed(2))
    }))
    .sort((a, b) => a.x - b.x)

  // Mobile-specific chart options
  const mobileChartOptions = {
    chart: {
      type: 'area' as const,
      height: 300,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    colors: ['#3B82F6'],
    dataLabels: {
      enabled: true,
      offsetY: 15,
      style: {
        fontSize: '9px',
        fontWeight: 'bold',
        colors: [theme === 'dark' ? '#F3F4F6' : '#1F2937']
      },
      background: {
        enabled: true,
        foreColor: theme === 'dark' ? '#1F2937' : '#ffffff',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
        opacity: 0.9
      },
      formatter: function(value: number) {
        return showRelativeLevel ? 
          (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : 
          value.toFixed(2)
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#93C5FD'],
        inverseColors: false,
        opacityFrom: 0.7,
        opacityTo: 0.1
      }
    },
    title: {
      text: showRelativeLevel ? `${t('waterLevel.relative')}` : `${t('waterLevel.absolute')}`,
      align: 'left' as const,
      style: {
        fontSize: '16px',
        fontWeight: 600,
        color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
      }
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        formatter: function(value: string) {
          return format(new Date(Number(value)), 'dd/MM HH:mm')
        },
        style: {
          fontSize: '10px',
          colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
        }
      }
    },
          yaxis: {
        title: {
          text: showRelativeLevel ? 
            `${t('waterLevel.relative')} (${safeUnit})` : 
            `${t('waterLevel.absolute')} (${safeUnit})`,
          style: {
            fontSize: '12px',
            color: theme === 'dark' ? '#D1D5DB' : '#6B7280'
          }
        },
      labels: {
        formatter: function(value: number) {
          return showRelativeLevel ? 
            (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : 
            value.toFixed(1)
        },
        style: {
          fontSize: '10px',
          colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
        }
      },
      min: showRelativeLevel ? -1 : 299.5,
      max: showRelativeLevel ? 6.5 : 307,
      tickAmount: 6
    },
    annotations: {
      yaxis: [
        {
          y: showRelativeLevel ? WARNING_LEVEL - ZEROGATE_LEVEL : WARNING_LEVEL,
          borderColor: '#F59E0B',
          borderWidth: 2,
          strokeDashArray: 3,
          label: {
            text: `Warning`,
            position: 'left',
            offsetX: 5,
            style: {
              color: '#F59E0B',
              background: '#FEF3C7',
              fontSize: '10px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: showRelativeLevel ? CRITICAL_LEVEL - ZEROGATE_LEVEL : CRITICAL_LEVEL,
          borderColor: '#DC2626',
          borderWidth: 2,
          strokeDashArray: 0,
          label: {
            text: `Critical`,
            position: 'left',
            offsetX: 5,
            style: {
              color: '#FFFFFF',
              background: '#DC2626',
              fontSize: '10px',
              fontWeight: 'bold'
            }
          }
        }
      ]
    },
    tooltip: {
      x: {
        formatter: function(value: number) {
          return format(new Date(value), 'MMM dd HH:mm')
        }
      },
              y: {
          formatter: function(value: number) {
            if (showRelativeLevel) {
              return `${value >= 0 ? '+' : ''}${value.toFixed(2)} ${safeUnit} (relative to zerogate)`
            } else {
              const relative = value - ZEROGATE_LEVEL
              return `${value.toFixed(2)} ${safeUnit} (${relative >= 0 ? '+' : ''}${relative.toFixed(2)} ${safeUnit} relative)`
            }
          }
        }
    },
    grid: {
      borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
      padding: {
        left: 10,
        right: 10,
        top: 20,
        bottom: 10
      }
    },
    legend: {
      show: false
    },
    markers: {
      size: 2,
      colors: ['#3B82F6'],
      strokeColors: theme === 'dark' ? '#1F2937' : '#ffffff',
      strokeWidth: 1
    }
  }

  // Desktop chart options
  const desktopChartOptions = {
    chart: {
      type: 'area' as const,
      height: 450,
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      },
      offsetX: 0,
      offsetY: 0,
      parentHeightOffset: 0
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    colors: ['#3B82F6'],
    dataLabels: {
      enabled: true,
      offsetY: 5,
      style: {
        fontSize: '9px',
        fontWeight: 'bold',
        colors: [theme === 'dark' ? '#F3F4F6' : '#1F2937']
      },
      background: {
        enabled: true,
        foreColor: theme === 'dark' ? '#1F2937' : '#ffffff',
        borderRadius: 3,
        borderWidth: 0,
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
        opacity: 0.5
      },
      formatter: function(value: number) {
        return showRelativeLevel ? 
          (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : 
          value.toFixed(2)
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#93C5FD'],
        inverseColors: false,
        opacityFrom: 0.7,
        opacityTo: 0.1
      }
    },
    title: {
      text: showRelativeLevel ? 
        `Ping River Water Level History (${t('waterLevel.relative')})` : 
        `Ping River Water Level History (${t('waterLevel.absolute')})`,
      align: 'left' as const,
      style: {
        fontSize: '20px',
        fontWeight: 600,
        color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
      }
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        formatter: function(value: string) {
          return format(new Date(Number(value)), 'MMM dd HH:mm')
        },
        style: {
          colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
        }
      }
    },
    yaxis: {
      title: {
        text: showRelativeLevel ? 
          `${t('waterLevel.relative')} (${safeUnit})` : 
          `${t('waterLevel.absolute')} (${safeUnit})`,
        style: {
          color: theme === 'dark' ? '#D1D5DB' : '#6B7280'
        }
      },
      labels: {
        formatter: function(value: number) {
          return showRelativeLevel ? 
            (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : 
            value.toFixed(2)
        },
        style: {
          colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
        }
      },
      min: showRelativeLevel ? -1 : 299.5,
      max: showRelativeLevel ? 6.5 : 307,
      tickAmount: 8
    },
    annotations: {
      yaxis: showRelativeLevel ? [
        {
          y: 0,
          borderColor: '#10B981',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            text: `Zerogate (0.0 ${safeUnit})`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#10B981',
              background: '#D1FAE5',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: WARNING_LEVEL - ZEROGATE_LEVEL,
          borderColor: '#F59E0B',
          borderWidth: 3,
          strokeDashArray: 4,
          label: {
            text: `⚠️ Warning Level: +${(WARNING_LEVEL - ZEROGATE_LEVEL).toFixed(1)} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#F59E0B',
              background: '#FEF3C7',
              fontSize: '13px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: CRITICAL_LEVEL - ZEROGATE_LEVEL,
          borderColor: '#DC2626',
          borderWidth: 4,
          strokeDashArray: 0,
          label: {
            text: `🚨 Critical Level: +${(CRITICAL_LEVEL - ZEROGATE_LEVEL).toFixed(1)} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#FFFFFF',
              background: '#DC2626',
              fontSize: '14px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: FLOOD_2024_LEVEL - ZEROGATE_LEVEL,
          borderColor: '#8B5CF6',
          borderWidth: 3,
          strokeDashArray: 3,
          label: {
            text: `📊 ${i18n.language === 'th' ? 'น้ำท่วม พ.ศ. 2567' : '2024 Flood'}: +${(FLOOD_2024_LEVEL - ZEROGATE_LEVEL).toFixed(2)} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#8B5CF6',
              background: '#F3E8FF',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          }
        }
      ] : [
        {
          y: ZEROGATE_LEVEL,
          borderColor: '#10B981',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            text: `Zerogate: ${ZEROGATE_LEVEL} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#10B981',
              background: '#D1FAE5',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: WARNING_LEVEL,
          borderColor: '#F59E0B',
          borderWidth: 3,
          strokeDashArray: 4,
          label: {
            text: `⚠️ Warning Level: ${WARNING_LEVEL} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#F59E0B',
              background: '#FEF3C7',
              fontSize: '13px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: CRITICAL_LEVEL,
          borderColor: '#DC2626',
          borderWidth: 4,
          strokeDashArray: 0,
          label: {
            text: `🚨 Critical Level: ${CRITICAL_LEVEL} ${safeUnit}`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#FFFFFF',
              background: '#DC2626',
              fontSize: '14px',
              fontWeight: 'bold'
            }
          }
        },
        {
          y: FLOOD_2024_LEVEL,
          borderColor: '#8B5CF6',
          borderWidth: 3,
          strokeDashArray: 3,
          label: {
            text: `📊 ${i18n.language === 'th' ? 'น้ำท่วม พ.ศ. 2567' : '2024 Flood'}: ${FLOOD_2024_LEVEL} ${safeUnit} (+5.28${safeUnit})`,
            position: 'right',
            offsetX: -10,
            style: {
              color: '#8B5CF6',
              background: '#F3E8FF',
              fontSize: '12px',
              fontWeight: 'bold'
            }
          }
        }
      ]
    },
    tooltip: {
      x: {
        formatter: function(value: number) {
          return format(new Date(value), 'MMM dd, yyyy HH:mm')
        }
      },
              y: {
          formatter: function(value: number) {
            if (showRelativeLevel) {
              return `${value >= 0 ? '+' : ''}${value.toFixed(2)} ${safeUnit} (relative to zerogate)`
            } else {
              const relative = value - ZEROGATE_LEVEL
              return `${value.toFixed(2)} ${safeUnit} (${relative >= 0 ? '+' : ''}${relative.toFixed(2)} ${safeUnit} relative)`
            }
          }
        }
    },
    plotOptions: {
      area: {
        fillTo: 'origin' as const
      }
    },
    grid: {
      borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
      padding: {
        left: 40,
        right: 40,
        top: 30,
        bottom: 20
      }
    },
    legend: {
      show: true,
      position: 'top' as const,
      horizontalAlign: 'left' as const,
      floating: false,
      fontSize: '14px',
      fontWeight: 600,
      offsetY: 0,
      labels: {
        colors: theme === 'dark' ? '#F3F4F6' : '#1F2937'
      },
      markers: {
        size: 8,
        strokeWidth: 0,
        fillColors: ['#3B82F6']
      },
      itemMargin: {
        horizontal: 20,
        vertical: 5
      }
    },
    markers: {
      size: 4,
      colors: ['#3B82F6'],
      strokeColors: theme === 'dark' ? '#1F2937' : '#ffffff',
      strokeWidth: 2
    }
  }

  const series = [{
    name: 'Water Level',
    data: chartData
  }]

  const statusColor = safeStatus === 'normal' ? 'text-green-600 dark:text-green-400' : 
                     safeStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'

  const statusBgColor = safeStatus === 'normal' ? 'bg-green-50 dark:bg-green-900/20' : 
                       safeStatus === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'

  // Determine status based on current level
  const isCritical = safeCurrentLevel >= CRITICAL_LEVEL
  const isWarning = safeCurrentLevel >= WARNING_LEVEL && safeCurrentLevel < CRITICAL_LEVEL

  // Show loading state
  if (loading || rainfallLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('common.loadingData')}</h2>
              <p className="text-gray-600 dark:text-gray-200">
                {t('common.pleaseTryAgainLater')}
                {loading && !rainfallLoading && <span><br />{t('common.waterLevelDataLoading')}</span>}
                {rainfallLoading && !loading && <span><br />{t('common.rainfallDataLoading')}</span>}
                {loading && rainfallLoading && <span><br />{t('common.loadingWaterLevelAndRainfall')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state - only if both data sources fail completely
  const hasWaterLevelData = !loading && apiData && apiData.data && apiData.data.length > 0
  const hasRainfallData = !rainfallLoading && rainfallData && rainfallData.data
  
  
  if (!hasWaterLevelData && !hasRainfallData && (error || rainfallError)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('common.errorLoadingData')}</h2>
              <div className="text-gray-600 dark:text-gray-200 mb-4 space-y-1">
                {error && <p>{t('common.waterLevel')}: {error}</p>}
                {rainfallError && <p>{t('common.rainfall')}: {rainfallError}</p>}
                {!error && !rainfallError && <p>{t('common.noDataAtThisTime')}</p>}
              </div>
              <button
                onClick={retryDataFetch}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        {/* Header - Optimized for mobile */}
        <div className="mb-6 sm:mb-8">
          {/* Status Alerts */}
          {isCritical && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium text-red-800 dark:text-red-200">
                  {t('waterLevel.alerts.critical')}
                </span>
              </div>
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium text-yellow-800 dark:text-yellow-200">
                  {t('waterLevel.alerts.warning')}
                </span>
              </div>
            </div>
          )}
          
          {/* Error notifications */}
          {error && hasRainfallData && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-100">{t('waterLevel.alerts.waterLevelUnavailable')}</span>
              </div>
            </div>
          )}
          
          {rainfallError && hasWaterLevelData && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-100">{t('waterLevel.alerts.rainfallUnavailable')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid - Mobile Optimized */}
        <div className="space-y-6">
          {/* Combined CCTV Feed and Water Level Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{t('waterLevel.liveMonitor.title')}</h3>
              </div>
              <button
                onClick={refreshCctvImage}
                className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                disabled={isImageLoading}
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isImageLoading ? 'animate-spin' : ''}`} />
                                  <span className="hidden sm:inline">{t('waterLevel.liveMonitor.refresh')}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* CCTV Feed */}
              <div>
                                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden h-[320px] sm:h-[400px]">
                  {!imageError ? (
                    <>
                      {isImageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                          <div className="text-center">
                            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400 dark:text-gray-300 animate-spin" />
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-200">{t('common.loadingLiveFeed')}</p>
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
                    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-600 h-full rounded-lg">
                      <div className="text-center">
                        <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400 dark:text-gray-300" />
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-200 mb-2">Unable to load CCTV feed</p>
                        <button
                          onClick={refreshCctvImage}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-300 text-center space-y-1">
                  <div>Auto-refreshes every 30 seconds ( Photo updated every 7~15 minutes)</div>
                  {cctvImageLastUpdated && (
                    <div className="text-gray-500 dark:text-gray-400">
                      {t('waterLevel.liveMonitor.imageLastUpdated')}: {cctvImageLastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Water Level Status */}
              {hasWaterLevelData && (
                <div className="flex flex-col h-auto lg:h-[320px] xl:h-[400px] space-y-4 lg:space-y-0">
                  {/* Main Water Level Display */}
                  <div className={`p-4 rounded-lg ${statusBgColor} border-2 border-gray-200 dark:border-gray-600 lg:mb-4`}>
                    <div className="text-center">
                                              <p className="text-xs text-gray-600 dark:text-gray-200 mb-1">{t('waterLevel.title')}</p>
                                            <div className="flex items-baseline justify-center space-x-3 mb-3">
                        <div className={`flex items-baseline space-x-1 transition-all duration-300 ${waterLevelFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {relativeLevel >= 0 ? '+' : ''}{relativeLevel.toFixed(2)}
                          </p>
                          <span className="text-base text-gray-600 dark:text-gray-200">{safeUnit}</span>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full ${statusBgColor} ${statusColor} capitalize font-medium`}>
                          {t(`waterLevel.status.${safeStatus}`)}
                        </span>
                      </div>
                      
                                              <div className="text-xs text-gray-600 dark:text-gray-200 space-y-1 mb-3">
                        <div className="flex items-center justify-center space-x-4">
                          <span title={t('waterLevel.explanations.absoluteLevel')}>
                            {t('waterLevel.absolute')}: {safeCurrentLevel.toFixed(2)} {safeUnit}
                          </span>
                          <span>{t('waterLevel.updated')}: {apiData?.data?.[0]?.timestamp ? 
                            format(new Date(apiData.data[0].timestamp), 'MMM dd, HH:mm') : 
                            format(new Date(), 'MMM dd, HH:mm')
                          }</span>
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400" title={t('waterLevel.explanations.relativeLevel')}>
                            {t('waterLevel.explanations.zerogate')}
                          </span>
                        </div>
                      </div>

                      {/* Rainfall info if available */}
                      {hasRainfallData && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center space-x-1.5">
                              <CloudRain className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-100">Current Rainfall:</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 transition-all duration-300 ${rainfallFlash ? 'scale-105 bg-blue-100 dark:bg-blue-900/50 rounded-lg px-2 py-1' : ''}`}>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {safeCurrentRainfall.toFixed(1)} {safeRainfallUnit}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                                safeIntensityStatus === 'none' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300' :
                                safeIntensityStatus === 'light' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' :
                                safeIntensityStatus === 'moderate' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300' :
                                safeIntensityStatus === 'heavy' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300' :
                                'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                              }`}>
                                {safeIntensityStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reference Levels with Cross-Section - takes remaining space on desktop, natural height on mobile */}
                  <div className="lg:flex-1">
                    <WaterLevelCrossSectionDiagram 
                      currentLevel={safeCurrentLevel}
                      unit={safeUnit}
                      compact={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts Section - Collapsible on mobile */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`flex items-center space-x-2 text-left ${isDesktop ? 'cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded'}`}
                disabled={isDesktop}
              >
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Historical Data</h3>
                {!isDesktop && (
                  <div>
                    {showCharts ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                )}
              </button>
              
              {/* Toggle button for relative/absolute display */}
              <button
                onClick={() => setShowRelativeLevel(!showRelativeLevel)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-3 sm:py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title={showRelativeLevel ? 
                  t('waterLevel.explanations.absoluteLevel') : 
                  t('waterLevel.explanations.relativeLevel')
                }
              >
                {showRelativeLevel ? (
                  <>
                    <ToggleRight className="h-4 w-4 text-blue-500" />
                    <span className="hidden sm:inline text-gray-700 dark:text-gray-300">{t('waterLevel.relative')}</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 text-gray-500" />
                    <span className="hidden sm:inline text-gray-700 dark:text-gray-300">{t('waterLevel.absolute')}</span>
                  </>
                )}
              </button>
            </div>
            <div className={`${(showCharts || isDesktop) ? 'block' : 'hidden'} px-2 sm:px-6 pb-4`}>
             {/* Water Level Chart */}
             {hasWaterLevelData && (
               <div className="mb-6">
                 {historicalLoading ? (
                   <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-300">
                     <div className="text-center">
                       <RefreshCw className="h-6 w-6 mx-auto mb-2 text-blue-500 animate-spin" />
                       <p className="text-sm text-gray-600 dark:text-gray-200">Loading historical chart data...</p>
                       <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Refreshes every 5 minutes</p>
                     </div>
                   </div>
                 ) : chartData.length > 0 ? (
                   <Chart
                      options={isDesktop ? desktopChartOptions : mobileChartOptions}
                      series={series}
                      type="area"
                      height={isDesktop ? 450 : 300}
                   />
                 ) : (
                   <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-300">
                     <div className="text-center">
                       <Droplets className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-400" />
                       <p className="text-sm text-gray-600 dark:text-gray-200">No water level data available</p>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* Rainfall Chart */}
             {hasRainfallData && (
               <div>
                 {historicalRainfallLoading ? (
                   <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-300">
                     <div className="text-center">
                       <RefreshCw className="h-5 w-5 mx-auto mb-2 text-green-500 animate-spin" />
                       <p className="text-sm text-gray-600 dark:text-gray-200">Loading rainfall chart data...</p>
                       <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Refreshes every 5 minutes</p>
                     </div>
                   </div>
                 ) : safeRainfallHistoricalData.length > 0 ? (
                   <Chart
                   options={{
                     chart: {
                       type: 'line',
                       height: isDesktop ? 200 : 150,
                       toolbar: {
                         show: isDesktop
                       },
                       zoom: {
                         enabled: true
                       }
                     },
                     stroke: {
                       curve: 'smooth',
                       width: 2
                     },
                     colors: ['#10B981'],
                     title: {
                       text: 'Rainfall History',
                       align: 'left',
                       style: {
                         fontSize: isDesktop ? '18px' : '14px',
                         fontWeight: 600,
                         color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
                       }
                     },
                     xaxis: {
                       type: 'datetime',
                       labels: {
                         formatter: function(value: string) {
                           return format(new Date(Number(value)), isDesktop ? 'MMM dd HH:mm' : 'HH:mm')
                         },
                         style: {
                           colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
                         }
                       }
                     },
                     yaxis: {
                       title: {
                         text: `Rainfall (${safeRainfallUnit})`,
                         style: {
                           color: theme === 'dark' ? '#D1D5DB' : '#6B7280'
                         }
                       },
                       labels: {
                         formatter: function(value: number) {
                           return value.toFixed(1)
                         },
                         style: {
                           colors: theme === 'dark' ? '#D1D5DB' : '#6B7280'
                         }
                       },
                       min: 0
                     },
                     tooltip: {
                       x: {
                         formatter: function(value: number) {
                           return format(new Date(value), 'MMM dd, yyyy HH:mm')
                         }
                       },
                       y: {
                         formatter: function(value: number) {
                           return `${value.toFixed(1)} ${safeRainfallUnit}`
                         }
                       }
                     },
                     grid: {
                       borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                       padding: {
                         left: isDesktop ? 15 : 10,
                         right: isDesktop ? 15 : 10,
                         top: 10,
                         bottom: 10
                       }
                     },
                                            markers: {
                         size: isDesktop ? 3 : 2,
                         colors: ['#10B981'],
                         strokeColors: theme === 'dark' ? '#1F2937' : '#ffffff',
                         strokeWidth: 2
                       },
                     fill: {
                       type: 'gradient',
                       gradient: {
                         shade: 'light',
                         type: 'vertical',
                         shadeIntensity: 0.3,
                         gradientToColors: ['#D1FAE5'],
                         inverseColors: false,
                         opacityFrom: 0.7,
                         opacityTo: 0.1
                       }
                     }
                   }}
                   series={[{
                     name: 'Rainfall',
                     data: safeRainfallHistoricalData.map(item => ({
                       x: new Date(item.timestamp).getTime(),
                       y: item.value
                     }))
                   }]}
                   type="area"
                   height={isDesktop ? 200 : 150}
                 />
                 ) : (
                   <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-300">
                     <div className="text-center">
                       <CloudRain className="h-6 w-6 mx-auto mb-2 text-gray-300 dark:text-gray-400" />
                       <p className="text-sm text-gray-600 dark:text-gray-200">No rainfall historical data available</p>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* No data message */}
             {!hasWaterLevelData && !hasRainfallData && (
               <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-300">
                 <div className="text-center">
                   <Cloud className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-400" />
                   <p className="text-sm text-gray-600 dark:text-gray-200">No historical data available</p>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>



        {/* Interactive Flood Zone Map - Visible on all devices */}
        <div className="mt-8">
          <FloodZoneMap 
            currentWaterLevel={safeCurrentLevel}
            className="w-full"
          />
        </div>

        {/* Flood Warning System Information - Collapsible on mobile */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <button
            onClick={() => setShowFloodInfo(!showFloodInfo)}
            className={`w-full flex items-center justify-between p-4 sm:p-6 text-left ${isDesktop ? 'cursor-default' : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
            disabled={isDesktop}
          >
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Flood Warning System</h2>
            {!isDesktop && (
              <div>
                {showFloodInfo ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                )}
              </div>
            )}
          </button>
          
          <div className={`${(showFloodInfo || isDesktop) ? 'block' : 'hidden'} px-4 pb-4 sm:px-6 sm:pb-6`}>
           <div className="space-y-4 sm:space-y-6">
             <div>
               <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">{t('waterLevel.floodInfo.title')}</h3>
               <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-3 sm:mb-4">
                 {t('waterLevel.floodInfo.description')}
               </p>
               
               <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                 <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('waterLevel.floodInfo.howItWorks')}</h4>
                 <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                   <li>• {t('waterLevel.floodInfo.steps.0')}</li>
                   <li>• {t('waterLevel.floodInfo.steps.1')}</li>
                   <li>• {t('waterLevel.floodInfo.steps.2')}</li>
                   <li className="hidden sm:list-item">• {t('waterLevel.floodInfo.steps.3')}</li>
                 </ul>
               </div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                 <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Coverage:</h4>
                 <div className="space-y-2 text-sm">
                   <div>
                     <span className="font-medium text-blue-600 dark:text-blue-400">East Side:</span>
                     <span className="text-gray-600 dark:text-gray-200 ml-1">135 poles</span>
                   </div>
                   <div>
                     <span className="font-medium text-green-600 dark:text-green-400">West Side:</span>
                     <span className="text-gray-600 dark:text-gray-200 ml-1">87 poles</span>
                   </div>
                 </div>
               </div>
               
               <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                 <a
                   href="https://watercenter.scmc.cmu.ac.th/cmflood/pole"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-sm sm:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                 >
                   View Full Flood Pole Map →
                 </a>
               </div>
             </div>
           </div>
         </div>
       </div>

        {/* Calendar Subscription Section */}
        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Calendar Subscription</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200">
                Stay updated with daily water level readings directly in your calendar app. 
                Subscribe to receive automated daily summaries of TP.1 Station water levels.
              </p>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                 <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">What you'll get:</h3>
                 <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                    <span>Daily water level status and readings</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                    <span>Statistical summaries (min, max, average)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                    <span>Automatic updates in your calendar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                    <span>Compatible with Google Calendar, Apple Calendar, Outlook</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                 <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">How to subscribe:</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <p className="font-medium">Copy the subscription URL:</p>
                      <div className="mt-1 flex items-center space-x-2">
                        <code className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs break-all">
                          https://ping.nothingtodo.me/api/ical/water-level.ical
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('https://ping.nothingtodo.me/api/ical/water-level.ical')
                            // Could add a toast notification here
                          }}
                          className="flex-shrink-0 px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/70 transition-colors"
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <p className="font-medium">Add to your calendar app:</p>
                      <ul className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL</li>
                        <li>• <strong>Apple Calendar:</strong> File → New Calendar Subscription</li>
                        <li>• <strong>Outlook:</strong> Add calendar → Subscribe from web</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <p className="font-medium">Paste the URL and save</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Your calendar will automatically sync daily updates</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href="https://ping.nothingtodo.me/api/ical/water-level.ical"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Calendar File
                </a>
                <button
                  onClick={() => {
                    const url = 'https://ping.nothingtodo.me/api/ical/water-level.ical'
                    navigator.clipboard.writeText(url)
                    // Could add a toast notification here
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Subscription URL
                </button>
              </div>
            </div>
          </div>
        </div>

     </div>
   </div>
  )
}

export default WaterLevel 