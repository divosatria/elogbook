const { broadcastVesselUpdate, emitToMonitoring, emitToZone } = require('../../services/core/socketService');

/**
 * Middleware untuk broadcasting real-time updates
 */
const realtimeUpdater = {
  // Broadcast vessel location update
  broadcastLocationUpdate: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Call original send first
      originalSend.call(this, data);
      
      // Then broadcast if successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && responseData.data) {
            const updateData = {
              type: 'location_update',
              tripId: req.params.tripId,
              vesselId: responseData.data.vesselId,
              vesselName: responseData.data.vesselName,
              location: responseData.data.location,
              timestamp: new Date().toISOString()
            };
            
            // Broadcast to all monitoring clients
            broadcastVesselUpdate(updateData);
            emitToMonitoring('vessel_location_update', updateData);
            
            console.log('📍 Broadcasted location update:', updateData);
          }
        } catch (error) {
          console.error('❌ Error broadcasting location update:', error);
        }
      }
    };
    
    next();
  },

  // Broadcast vessel zone update
  broadcastZoneUpdate: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Call original send first
      originalSend.call(this, data);
      
      // Then broadcast if successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && responseData.data) {
            const updateData = {
              type: 'zone_update',
              tripId: req.params.tripId,
              vesselId: responseData.data.vesselId,
              vesselName: responseData.data.vesselName,
              oldZoneId: responseData.data.oldZoneId,
              newZoneId: responseData.data.newZoneId,
              timestamp: new Date().toISOString()
            };
            
            // Broadcast to monitoring clients
            broadcastVesselUpdate(updateData);
            emitToMonitoring('vessel_zone_update', updateData);
            
            // Broadcast to specific zones
            if (updateData.oldZoneId) {
              emitToZone(updateData.oldZoneId, 'vessel_left_zone', updateData);
            }
            if (updateData.newZoneId) {
              emitToZone(updateData.newZoneId, 'vessel_entered_zone', updateData);
            }
            
            console.log('🏠 Broadcasted zone update:', updateData);
          }
        } catch (error) {
          console.error('❌ Error broadcasting zone update:', error);
        }
      }
    };
    
    next();
  },

  // Broadcast emergency alert
  broadcastEmergencyAlert: (emergencyData) => {
    try {
      const alertData = {
        type: 'emergency_alert',
        id: emergencyData.id,
        vesselId: emergencyData.vesselId,
        vesselName: emergencyData.vesselName,
        emergencyType: emergencyData.jenisEmergency,
        location: {
          lat: emergencyData.latitude,
          lng: emergencyData.longitude
        },
        description: emergencyData.deskripsi,
        timestamp: emergencyData.createdAt || new Date().toISOString(),
        status: emergencyData.status || 'active'
      };
      
      // Broadcast to all clients (emergency alerts are critical)
      const io = require('../../app').get('io');
      if (io) {
        io.emit('emergency_alert', alertData);
        console.log('🚨 Broadcasted emergency alert:', alertData);
      }
    } catch (error) {
      console.error('❌ Error broadcasting emergency alert:', error);
    }
  },

  // Broadcast trip status update
  broadcastTripStatusUpdate: (tripData) => {
    try {
      const statusData = {
        type: 'trip_status_update',
        tripId: tripData.id,
        vesselId: tripData.kapalId,
        vesselName: tripData.kapal?.namaKapal,
        status: tripData.status,
        timestamp: new Date().toISOString()
      };
      
      broadcastVesselUpdate(statusData);
      emitToMonitoring('trip_status_update', statusData);
      
      console.log('📊 Broadcasted trip status update:', statusData);
    } catch (error) {
      console.error('❌ Error broadcasting trip status update:', error);
    }
  },

  // Broadcast monitoring data refresh
  broadcastMonitoringRefresh: () => {
    try {
      const refreshData = {
        type: 'monitoring_refresh',
        timestamp: new Date().toISOString(),
        message: 'Monitoring data has been updated'
      };
      
      emitToMonitoring('monitoring_refresh', refreshData);
      console.log('🔄 Broadcasted monitoring refresh');
    } catch (error) {
      console.error('❌ Error broadcasting monitoring refresh:', error);
    }
  }
};

module.exports = realtimeUpdater;