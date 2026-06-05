import { backendAPI } from './backendService';
import { socketService } from './socketService';
import { safeLog } from '@/utils/security';
import { API_ENDPOINTS } from '@/config/urls';

export interface VesselMonitoringData {
  tripId: number;
  vesselId: number;
  vesselName: string;
  location?: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    timestamp: string;
    accuracy: string;
  };
  status: string;
  harborZoneId?: number;
  lastUpdate: string;
}

export interface MonitoringStats {
  totalActiveTrips: number;
  tripsWithGPS: number;
  totalHarborZones: number;
  totalCatchPolygons: number;
  totalPOIs: number;
  vesselsByStatus: {
    sailing: number;
    approved: number;
  };
}

class MonitoringService {
  private listeners: Map<string, Function[]> = new Map();
  private cleanupFns: (() => void)[] = [];
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Connect socket if not connected
      if (!socketService.isConnected()) {
        socketService.connect();
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
          
          const checkConnection = () => {
            if (socketService.isConnected()) {
              clearTimeout(timeout);
              resolve(true);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          
          checkConnection();
        });
      }

      // Subscribe to monitoring updates
      socketService.subscribeToMonitoring();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      safeLog.info('Monitoring service initialized');
    } catch (error) {
      safeLog.error('Failed to initialize monitoring service', error);
      // Continue without socket for basic functionality
      this.isInitialized = true;
    }
  }

  private setupEventListeners() {
    // Clear existing listeners if any
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];

    // Vessel location updates
    const cleanupLocation = socketService.onVesselLocationUpdate((data) => {
      this.emit('vessel_location_update', data);
    });
    if (cleanupLocation) this.cleanupFns.push(cleanupLocation);

    // Vessel zone updates
    const cleanupZone = socketService.onVesselZoneUpdate((data) => {
      this.emit('vessel_zone_update', data);
    });
    if (cleanupZone) this.cleanupFns.push(cleanupZone);

    // General vessel updates
    const cleanupVessel = socketService.onVesselUpdate((data) => {
      this.emit('vessel_update', data);
    });
    if (cleanupVessel) this.cleanupFns.push(cleanupVessel);

    // Emergency alerts
    const cleanupEmergency = socketService.onEmergencyAlert((data) => {
      this.emit('emergency_alert', data);
    });
    if (cleanupEmergency) this.cleanupFns.push(cleanupEmergency);

    const cleanupResolved = socketService.onEmergencyResolved((data) => {
      this.emit('emergency_resolved', data);
    });
    if (cleanupResolved) this.cleanupFns.push(cleanupResolved);

    // Vessel status updates
    const cleanupStatus = socketService.onVesselStatusUpdate((data) => {
      this.emit('vessel_status_update', data);
    });
    if (cleanupStatus) this.cleanupFns.push(cleanupStatus);

    // Connection status changes
    const socket = socketService.getSocket();
    if (socket) {
      const onConnect = () => this.emit('connection_status', 'connected');
      const onDisconnect = () => this.emit('connection_status', 'disconnected');
      const onError = () => this.emit('connection_status', 'error');

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onError);

      this.cleanupFns.push(() => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onError);
      });
    }
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          safeLog.error('Error in event listener', { event, error });
        }
      });
    }
  }

  // API methods
  async getMonitoringData() {
    try {
      const response = await backendAPI.request(API_ENDPOINTS.MONITORING.DATA);
      return response;
    } catch (error) {
      safeLog.error('Failed to get monitoring data', error);
      throw error;
    }
  }

  async updateVesselLocation(tripId: number, lat: number, lng: number, speed?: number, heading?: number) {
    try {
      const response = await backendAPI.request(`/api/monitoring/vessels/${tripId}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          lat,
          lng,
          speed: speed || 0,
          heading: heading || 0,
          accuracy: 'high',
          timestamp: new Date().toISOString()
        })
      });

      // Emit local update for immediate UI feedback
      this.emit('vessel_location_update', {
        tripId,
        location: { lat, lng, speed, heading, timestamp: new Date().toISOString() }
      });

      return response;
    } catch (error) {
      safeLog.error('Failed to update vessel location', error);
      throw error;
    }
  }

  async updateVesselZone(tripId: number, harborZoneId: number | null) {
    try {
      const response = await backendAPI.updateVesselZone(tripId.toString(), harborZoneId?.toString() || '');
      
      // Emit local update for immediate UI feedback
      this.emit('vessel_zone_update', {
        tripId,
        newZoneId: harborZoneId,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      safeLog.error('Failed to update vessel zone', error);
      throw error;
    }
  }

  async getVesselsByZone(zoneId: number) {
    try {
      const response = await backendAPI.getVesselsByZone(zoneId.toString());
      return response;
    } catch (error) {
      safeLog.error('Failed to get vessels by zone', error);
      throw error;
    }
  }

  async getVesselRealTimeData(tripId: number) {
    try {
      const response = await backendAPI.request(`/api/monitoring/vessels/${tripId}/realtime`);
      return response;
    } catch (error) {
      safeLog.error('Failed to get vessel real-time data', error);
      throw error;
    }
  }

  // Utility methods
  trackVessel(tripId: number) {
    socketService.trackVessel(tripId);
  }

  stopTrackingVessel(tripId: number) {
    socketService.stopTrackingVessel(tripId);
  }

  getConnectionStatus() {
    return socketService.getConnectionStatus();
  }

  isConnected() {
    return socketService.isConnected();
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    
    // Run all cleanup functions for socket listeners
    this.cleanupFns.forEach(fn => {
        try {
            fn();
        } catch (e) {
            console.error('Error in monitoring service cleanup:', e);
        }
    });
    this.cleanupFns = [];
    
    this.isInitialized = false;
    safeLog.info('Monitoring service destroyed');
  }

  // Helper methods for data transformation
  transformTripToVessel(trip: any): VesselMonitoringData {
    return {
      tripId: trip.id,
      vesselId: trip.kapal?.id,
      vesselName: trip.kapal?.namaKapal || 'Unknown',
      location: trip.currentLocation ? {
        lat: trip.currentLocation.lat,
        lng: trip.currentLocation.lng,
        speed: trip.currentLocation.speed || 0,
        heading: trip.currentLocation.heading || 0,
        timestamp: trip.currentLocation.timestamp,
        accuracy: trip.currentLocation.accuracy || 'high'
      } : undefined,
      status: trip.status,
      harborZoneId: trip.harborZoneId,
      lastUpdate: trip.updatedAt
    };
  }

  calculateStats(monitoringData: any): MonitoringStats {
    const activeTrips = monitoringData.activeTrips || [];
    
    return {
      totalActiveTrips: activeTrips.length,
      tripsWithGPS: activeTrips.filter((trip: any) => trip.currentLocation).length,
      totalHarborZones: monitoringData.harborZones?.length || 0,
      totalCatchPolygons: monitoringData.catchPolygons?.length || 0,
      totalPOIs: monitoringData.pois?.length || 0,
      vesselsByStatus: {
        sailing: activeTrips.filter((trip: any) => trip.status === 'sedang_melaut').length,
        approved: activeTrips.filter((trip: any) => trip.status === 'disetujui').length
      }
    };
  }
}

export const monitoringService = new MonitoringService();
