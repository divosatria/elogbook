let io;
const emergencyService = require('./emergencyService');

const initSocketService = (socketIO) => {
  io = socketIO;

  // Simple in-memory rate limiter
  const rateLimits = new Map();
  const RATE_LIMIT_WINDOW = 60000;
  const MAX_ALERTS_PER_WINDOW = 3;

  const checkRateLimit = (socketId) => {
    const now = Date.now();
    const userLimit = rateLimits.get(socketId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    userLimit.count++;
    rateLimits.set(socketId, userLimit);
    
    return userLimit.count <= MAX_ALERTS_PER_WINDOW;
  };

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id, 'User ID:', socket.user?.userId);

    // Join room berdasarkan user ID
    socket.on('join', (userId) => {
      // Validate that user can only join their own room, unless they are admin
      if (socket.user && (socket.user.userId === parseInt(userId) || socket.user.role === 'admin')) {
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined room`);
      } else {
        console.warn(`⚠️ Warning: Socket ${socket.id} (User ${socket.user?.userId}) attempted unauthorized join to user:${userId}`);
      }
    });

    // Subscribe to trip tracking
    socket.on('subscribe_trip', (tripId) => {
      socket.join(`trip:${tripId}`);
      console.log(`🚢 Subscribed to trip ${tripId}`);
    });

    // Subscribe to monitoring updates
    socket.on('subscribe-monitoring', () => {
      if (socket.user && socket.user.role === 'admin') {
        socket.join('monitoring');
        console.log('📊 Subscribed to monitoring updates');
        socket.emit('monitoring_subscribed', { timestamp: new Date().toISOString() });
      } else {
        console.warn(`⚠️ Unauthorized monitoring subscription attempt by ${socket.id} (Role: ${socket.user?.role})`);
      }
    });

    socket.on('subscribe_monitoring', () => {
      if (socket.user && socket.user.role === 'admin') {
        socket.join('monitoring');
        console.log('📊 Subscribed to monitoring updates');
        socket.emit('monitoring_subscribed', { timestamp: new Date().toISOString() });
      } else {
        console.warn(`⚠️ Unauthorized monitoring subscription attempt by ${socket.id} (Role: ${socket.user?.role})`);
      }
    });

    // Subscribe to zone updates
    socket.on('subscribe_zone', (zoneId) => {
      socket.join(`zone:${zoneId}`);
      console.log(`🏠 Subscribed to zone ${zoneId}`);
    });

    // Handle vessel tracking
    socket.on('track-vessel', (tripId) => {
      if (tripId) {
        socket.join(`vessel:${tripId}`);
        console.log(`🚢 Tracking vessel: ${tripId}`);
        socket.emit('vessel_tracking_started', { tripId });
      }
    });

    socket.on('stop-track-vessel', (tripId) => {
      if (tripId) {
        socket.leave(`vessel:${tripId}`);
        console.log(`🚢 Stopped tracking vessel: ${tripId}`);
      }
    });

    // Handle vessel location updates
    socket.on('vessel_location_update', (data) => {
      console.log('📍 Vessel location update:', data);
      // Broadcast to monitoring subscribers
      socket.to('monitoring').emit('vessel_location_update', data);
      // Broadcast to specific trip subscribers
      if (data.tripId) {
        socket.to(`trip:${data.tripId}`).emit('vessel_location_update', data);
        socket.to(`vessel:${data.tripId}`).emit('vessel_location_update', data);
      }
    });

    // Handle emergency alerts
    socket.on('emergency_alert', async (data) => {
      // 1. Rate Limiting Check
      if (!checkRateLimit(socket.user?.userId || socket.id)) {
        console.warn(`⚠️ Rate limit exceeded for emergency_alert by User ${socket.user?.userId || socket.id}`);
        return socket.emit('emergency_alert_processed', {
          success: false,
          error: 'RateLimitExceeded',
          message: 'Terlalu banyak permintaan darurat. Harap tunggu 1 menit.'
        });
      }

      // 2. Schema / Size Validation
      if (!data || typeof data !== 'object' || JSON.stringify(data).length > 5000) {
        return socket.emit('emergency_alert_processed', {
          success: false,
          error: 'InvalidPayload',
          message: 'Data tidak valid'
        });
      }

      // 3. Force Override Payload to Prevent Spoofing
      if (socket.user) {
        data.userId = socket.user.userId;
      }

      console.log('🚨 Emergency alert received:', data);
      try {
        // Process emergency alert and send notifications
        const results = await emergencyService.sendEmergencyAlert(data);
        
        // Broadcast to all monitoring clients
        io.emit('emergency_alert', {
          ...data,
          timestamp: new Date().toISOString(),
          notificationResults: results
        });
        
        // Send confirmation back to sender
        socket.emit('emergency_alert_processed', {
          success: true,
          results,
          message: 'Emergency alert processed and notifications sent'
        });
      } catch (error) {
        console.error('❌ Emergency alert processing failed:', error);
        socket.emit('emergency_alert_processed', {
          success: false,
          error: error.message,
          message: 'Failed to process emergency alert'
        });
      }
    });

    // Unsubscribe from trip
    socket.on('unsubscribe_trip', (tripId) => {
      socket.leave(`trip:${tripId}`);
    });

    // Unsubscribe from monitoring
    socket.on('unsubscribe-monitoring', () => {
      socket.leave('monitoring');
    });

    socket.on('unsubscribe_monitoring', () => {
      socket.leave('monitoring');
    });

    // Unsubscribe from zone
    socket.on('unsubscribe_zone', (zoneId) => {
      socket.leave(`zone:${zoneId}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
};

const emitSocketEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToTrip = (tripId, event, data) => {
  if (io) {
    io.to(`trip:${tripId}`).emit(event, data);
  }
};

const emitToMonitoring = (event, data) => {
  if (io) {
    io.to('monitoring').emit(event, data);
  }
};

const emitToZone = (zoneId, event, data) => {
  if (io) {
    io.to(`zone:${zoneId}`).emit(event, data);
  }
};

const broadcastVesselUpdate = (vesselData) => { 
  if (io && vesselData) {
    try {
      // Emit to monitoring dashboard
      io.to('monitoring').emit('vessel_update', vesselData);
      // Emit to specific trip if available
      if (vesselData.tripId) {
        io.to(`trip:${vesselData.tripId}`).emit('vessel_update', vesselData);
        io.to(`vessel:${vesselData.tripId}`).emit('vessel_update', vesselData);
      }
      // Emit to zone if vessel is in a zone
      if (vesselData.harborZoneId) {
        io.to(`zone:${vesselData.harborZoneId}`).emit('vessel_update', vesselData);
      }
      console.log('📡 Broadcasted vessel update:', vesselData.tripId);
    } catch (error) {
      console.error('❌ Error broadcasting vessel update:', error);
    }
  }
};

module.exports = {
  initSocketService,
  emitSocketEvent,
  emitToUser,
  emitToTrip,
  emitToMonitoring,
  emitToZone,
  broadcastVesselUpdate
};