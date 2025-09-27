import io from 'socket.io-client';

class RealTimeService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(url = 'ws://localhost:3001') {
    if (this.socket && this.socket.connected) {
      return;
    }

    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('🟢 Connected to real-time server');
        this.notifyListeners('connection', { status: 'connected' });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('🔴 Disconnected from real-time server');
        this.notifyListeners('connection', { status: 'disconnected' });
      });

      this.socket.on('waterLevelUpdate', (data) => {
        this.notifyListeners('waterLevel', data);
      });

      this.socket.on('floodAlert', (data) => {
        this.notifyListeners('floodAlert', data);
      });

      this.socket.on('weatherUpdate', (data) => {
        this.notifyListeners('weather', data);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.log(`❌ Connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.notifyListeners('connection', { status: 'failed', error: error.message });
        }
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  subscribeToStation(stationCode) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribeStation', stationCode);
    }
  }

  unsubscribeFromStation(stationCode) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribeStation', stationCode);
    }
  }

  requestStationData(stationCode) {
    if (this.socket && this.isConnected) {
      this.socket.emit('requestStationData', stationCode);
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socket: this.socket?.connected || false
    };
  }
}

const realTimeService = new RealTimeService();
export default realTimeService;