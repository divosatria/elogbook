import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/urls';
import { safeLog } from '../utils/security';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    const socketUrl = SOCKET_URL;
    safeLog.info('Connecting to socket server', { url: socketUrl });
    
    const token = localStorage.getItem('token');
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'], // Try polling first
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false
    });

    this.socket.on('connect', () => {
      safeLog.info('Connected to socket server', { id: this.socket?.id });
      this.reconnectAttempts = 0;
      
      // Auto-subscribe to monitoring if user is authenticated
      const token = localStorage.getItem('token');
      if (token) {
        this.subscribeToMonitoring();
      }
    });

    this.socket.on('connection_confirmed', (data) => {
      safeLog.info('Connection confirmed', data);
    });

    this.socket.on('disconnect', (reason) => {
      safeLog.info('Disconnected from server', { reason });
      
      // Auto-reconnect on certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      safeLog.error('Socket connection error', error);
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      safeLog.info('Reconnected to server', { attempt: attemptNumber });
      this.reconnectAttempts = 0;
    });

    return this.socket;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      safeLog.info('Attempting to reconnect', { 
        attempt: this.reconnectAttempts, 
        delay 
      });
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      safeLog.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      safeLog.info('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  // Monitoring subscriptions
  subscribeToMonitoring() {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-monitoring');
      safeLog.info('Subscribed to monitoring updates');
    } else {
      safeLog.warn('Cannot subscribe to monitoring, socket not connected');
    }
  }

  unsubscribeFromMonitoring() {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-monitoring');
      safeLog.info('Unsubscribed from monitoring updates');
    }
  }

  // Vessel tracking
  trackVessel(tripId: string | number) {
    if (this.socket?.connected) {
      this.socket.emit('track-vessel', tripId);
      safeLog.info('Started tracking vessel', { tripId });
    } else {
      safeLog.warn('Cannot track vessel, socket not connected', { tripId });
    }
  }

  stopTrackingVessel(tripId: string | number) {
    if (this.socket?.connected) {
      this.socket.emit('stop-track-vessel', tripId);
      safeLog.info('Stopped tracking vessel', { tripId });
    }
  }

  // Event listeners for monitoring
  onVesselUpdate(callback: (data: any) => void) {
    this.socket?.on('vessel_update', callback);
    return () => this.socket?.off('vessel_update', callback);
  }

  onVesselLocationUpdate(callback: (data: any) => void) {
    this.socket?.on('vessel_location_update', callback);
    return () => this.socket?.off('vessel_location_update', callback);
  }

  onVesselZoneUpdate(callback: (data: any) => void) {
    this.socket?.on('vessel_zone_update', callback);
    return () => this.socket?.off('vessel_zone_update', callback);
  }

  onMonitoringUpdate(callback: (data: any) => void) {
    this.socket?.on('monitoring_update', callback);
    return () => this.socket?.off('monitoring_update', callback);
  }

  onVesselStatusUpdate(callback: (data: any) => void) {
    this.socket?.on('vessel_status_update', callback);
    return () => this.socket?.off('vessel_status_update', callback);
  }

  // SOS Alerts - handle both event formats
  onSOSAlert(callback: (alert: any) => void) {
    this.socket?.on('emergency_alert', callback);
    this.socket?.on('emergency-alert', callback);
    this.socket?.on('sos_alert', callback);
    return () => {
      this.socket?.off('emergency_alert', callback);
      this.socket?.off('emergency-alert', callback);
      this.socket?.off('sos_alert', callback);
    };
  }

  onEmergencyAlert(callback: (alert: any) => void) {
    this.socket?.on('emergency_alert', callback);
    this.socket?.on('emergency-alert', callback);
    return () => {
      this.socket?.off('emergency_alert', callback);
      this.socket?.off('emergency-alert', callback);
    };
  }

  onEmergencyResolved(callback: (data: any) => void) {
    this.socket?.on('emergency_resolved', callback);
    return () => this.socket?.off('emergency_resolved', callback);
  }

  // Location Updates
  onLocationUpdate(callback: (data: any) => void) {
    this.socket?.on('location-update', callback);
    return () => this.socket?.off('location-update', callback);
  }

  // Weather Updates
  onWeatherUpdate(callback: (weather: any) => void) {
    this.socket?.on('weather-update', callback);
    return () => this.socket?.off('weather-update', callback);
  }

  // Trip Status Updates
  onTripStatusUpdate(callback: (trip: any) => void) {
    this.socket?.on('trip-update', callback);
    return () => this.socket?.off('trip-update', callback);
  }

  // Edge/IoT Sync Updates
  onEdgeDataUpdated(callback: (data: any) => void) {
    this.socket?.on('edge_data_updated', callback);
    return () => this.socket?.off('edge_data_updated', callback);
  }

  // Join specific room
  joinRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room);
      safeLog.info('Joined room', { room });
    }
  }

  leaveRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room);
      safeLog.info('Left room', { room });
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      safeLog.warn('Cannot emit event, socket not connected', { event });
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Remove all listeners for cleanup
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export const socketService = new SocketService();