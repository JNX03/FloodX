class DataSourceService {
  constructor() {
    this.ridApiBase = 'https://telerid.rid.go.th';
    this.cmuApiBase = 'https://watercenter.scmc.cmu.ac.th';
    this.pingApiBase = 'https://ping.nothingtodo.me/api';
    this.cache = {};
    this.cacheTimeout = 60000; // 1 minute cache
  }

  // Check cache
  getCachedData(key) {
    const cached = this.cache[key];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Set cache
  setCachedData(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  // Fetch data from ping.nothingtodo.me APIs
  async fetchPingData() {
    const cacheKey = 'pingData';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [waterLevel, rainfall, status] = await Promise.all([
        fetch(`${this.pingApiBase}/water-level`).then(res => res.json()),
        fetch(`${this.pingApiBase}/rainfall`).then(res => res.json()),
        fetch(`${this.pingApiBase}/status`).then(res => res.json())
      ]);

      const result = {
        success: true,
        data: {
          waterLevel: waterLevel.success ? waterLevel.data : [],
          rainfall: rainfall.success ? rainfall.data : [],
          status: status.success ? status : null,
          timestamp: new Date().toISOString()
        }
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch ping data:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Fetch CCTV image from ping API
  async fetchCCTVImage(cameraId = 'TP1') {
    const cacheKey = `cctv_${cameraId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const timestamp = Date.now();
      const imageUrl = `${this.pingApiBase}/cctv/image/${cameraId}?t=${timestamp}`;
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch CCTV image: ${response.status}`);
      }

      const blob = await response.blob();
      const result = {
        success: true,
        imageUrl: URL.createObjectURL(blob),
        cameraId,
        timestamp
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch CCTV image:', error);
      return {
        success: false,
        error: error.message,
        imageUrl: null
      };
    }
  }

  // Transform ping data to unified format
  transformPingData(pingData) {
    if (!pingData.success || !pingData.data) {
      return [];
    }

    const transformedStations = [];

    // Group water level data by station
    const stationGroups = {};
    pingData.data.waterLevel.forEach(item => {
      if (!stationGroups[item.station_id]) {
        stationGroups[item.station_id] = [];
      }
      stationGroups[item.station_id].push(item);
    });

    // Create unified station data
    Object.keys(stationGroups).forEach(stationId => {
      const latestReading = stationGroups[stationId][0]; // Assuming sorted by latest

      transformedStations.push({
        id: stationId,
        name: this.getStationName(stationId),
        coords: this.getStationCoordinates(stationId),
        waterLevel: {
          value: latestReading.value,
          unit: latestReading.unit,
          timestamp: latestReading.timestamp
        },
        dataSource: 'ping.nothingtodo.me',
        status: this.getWaterLevelStatus(latestReading.value)
      });
    });

    return transformedStations;
  }

  // Get station name based on ID
  getStationName(stationId) {
    const stationNames = {
      '89': 'Ping River Station 89',
      'TP.1': 'Traffic Point 1'
    };
    return stationNames[stationId] || `Station ${stationId}`;
  }

  // Get station coordinates (fallback coordinates for northern Thailand)
  getStationCoordinates(stationId) {
    const stationCoords = {
      '89': [18.7883, 98.9853],
      'TP.1': [18.788450, 99.004095]
    };
    return stationCoords[stationId] || [18.7883, 98.9853]; // Default to Chiang Mai
  }

  // Determine water level status
  getWaterLevelStatus(waterLevel) {
    if (waterLevel < 303) return 'low';
    if (waterLevel < 304) return 'normal';
    if (waterLevel < 305) return 'warning';
    return 'danger';
  }

  // Get status color based on water level
  getStatusColor(status) {
    const colors = {
      'low': 'blue',
      'normal': 'green',
      'warning': 'orange',
      'danger': 'red'
    };
    return colors[status] || 'gray';
  }

  // Fetch data from RID (Royal Irrigation Department)
  async fetchRIDData() {
    const cacheKey = 'ridData';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // DISABLED: RID API causes CORS issues and spams requests
    // Will be enabled when CORS proxy is available
    const result = {
      success: false,
      error: 'RID API disabled due to CORS policy - will be enabled when proxy is available',
      data: null,
      source: 'RID',
      disabled: true
    };

    this.setCachedData(cacheKey, result);
    return result;

    /* ORIGINAL CODE - COMMENTED OUT TO PREVENT SPAM
    try {
      // Try to fetch from RID API - this might need CORS proxy
      const response = await fetch(`${this.ridApiBase}/api/data`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`RID API error: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        success: true,
        data: data,
        source: 'RID',
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('RID data not available:', error.message);
      return {
        success: false,
        error: error.message,
        data: null,
        source: 'RID'
      };
    }
    */
  }

  // Fetch data from CMU SCMC Water Center
  async fetchCMUData() {
    const cacheKey = 'cmuData';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // DISABLED: CMU SCMC API causes CORS issues and spams requests
    // Will be enabled when CORS proxy is available
    const result = {
      success: false,
      error: 'CMU SCMC API disabled due to CORS policy - will be enabled when proxy is available',
      data: null,
      source: 'CMU_SCMC',
      disabled: true
    };

    this.setCachedData(cacheKey, result);
    return result;

    /* ORIGINAL CODE - COMMENTED OUT TO PREVENT SPAM
    try {
      // Try to fetch from CMU SCMC API - this might need CORS proxy
      const response = await fetch(`${this.cmuApiBase}/api/data`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CMU SCMC API error: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        success: true,
        data: data,
        source: 'CMU_SCMC',
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('CMU SCMC data not available:', error.message);
      return {
        success: false,
        error: error.message,
        data: null,
        source: 'CMU_SCMC'
      };
    }
    */
  }

  // Fetch all data sources
  async fetchAllData() {
    try {
      // Fetch from all sources in parallel
      const [pingData, ridData, cmuData] = await Promise.all([
        this.fetchPingData(),
        this.fetchRIDData(),
        this.fetchCMUData()
      ]);

      const transformedStations = this.transformPingData(pingData);

      // Add RID stations if available
      if (ridData.success && ridData.data) {
        const ridStations = this.transformRIDData(ridData);
        transformedStations.push(...ridStations);
      }

      // Add CMU SCMC stations if available
      if (cmuData.success && cmuData.data) {
        const cmuStations = this.transformCMUData(cmuData);
        transformedStations.push(...cmuStations);
      }

      return {
        success: true,
        stations: transformedStations,
        rawData: {
          ping: pingData,
          rid: ridData,
          cmu: cmuData
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to fetch all data:', error);
      return {
        success: false,
        error: error.message,
        stations: [],
        rawData: null
      };
    }
  }

  // Transform RID data to unified format
  transformRIDData(ridData) {
    if (!ridData.success || !ridData.data) {
      return [];
    }

    // Mock transformation - adjust based on actual RID API structure
    const stations = [];
    if (Array.isArray(ridData.data)) {
      ridData.data.forEach((item, index) => {
        stations.push({
          id: `RID_${index + 1}`,
          name: `RID Station ${index + 1}`,
          coords: [18.7883 + (Math.random() - 0.5) * 0.1, 98.9853 + (Math.random() - 0.5) * 0.1],
          waterLevel: {
            value: 303 + Math.random() * 2,
            unit: 'm',
            timestamp: new Date().toISOString()
          },
          dataSource: 'RID (Royal Irrigation Department)',
          status: 'normal'
        });
      });
    }

    return stations;
  }

  // Transform CMU SCMC data to unified format
  transformCMUData(cmuData) {
    if (!cmuData.success || !cmuData.data) {
      return [];
    }

    // Mock transformation - adjust based on actual CMU SCMC API structure
    const stations = [];
    if (Array.isArray(cmuData.data)) {
      cmuData.data.forEach((item, index) => {
        stations.push({
          id: `CMU_${index + 1}`,
          name: `CMU SCMC Pole ${index + 1}`,
          coords: [18.7883 + (Math.random() - 0.5) * 0.1, 98.9853 + (Math.random() - 0.5) * 0.1],
          waterLevel: {
            value: 303 + Math.random() * 2,
            unit: 'm',
            timestamp: new Date().toISOString()
          },
          dataSource: 'CMU SCMC Water Center',
          status: 'normal'
        });
      });
    }

    return stations;
  }

  // Get rainfall summary
  getRainfallSummary(rainfallData) {
    if (!rainfallData || rainfallData.length === 0) {
      return {
        current: 0,
        today: 0,
        last24h: 0,
        status: 'No data'
      };
    }

    const latest = rainfallData[0];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const todayRainfall = rainfallData
      .filter(item => new Date(item.timestamp) >= startOfDay)
      .reduce((sum, item) => sum + item.value, 0);

    const last24hRainfall = rainfallData
      .filter(item => new Date(item.timestamp) >= last24h)
      .reduce((sum, item) => sum + item.value, 0);

    return {
      current: latest.value,
      today: todayRainfall,
      last24h: last24hRainfall,
      status: this.getRainfallStatus(latest.value),
      timestamp: latest.timestamp
    };
  }

  // Determine rainfall status
  getRainfallStatus(rainfall) {
    if (rainfall === 0) return 'No rain';
    if (rainfall < 10) return 'Light rain';
    if (rainfall < 50) return 'Moderate rain';
    return 'Heavy rain';
  }
}

const dataSourceService = new DataSourceService();
export default dataSourceService;