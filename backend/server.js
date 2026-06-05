const app = require('./src/app');
const http = require('http');
const socketIO = require('socket.io');
const os = require('os');
const { connectDB, closeDB } = require('./src/config/database');
const { initSocketService } = require('./src/services/socketService');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

console.log(`🚀 Starting E-Logbook Maritime Server on port ${PORT}`);

connectDB().then(connected => {
  if (!connected) {
    console.log('❌ Database connection failed');
    process.exit(1);
  }


  const server = http.createServer(app);
  
  // Configure Socket.IO CORS with proper validation
 // Baca origin dari ENV secara eksplisit
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0)
    : [
        "http://localhost:5173",
        "http://localhost:5174"
      ];

  const io = socketIO(server, {
    cors: {
      origin: function(origin, callback) {

        // 1. Izinkan tanpa origin (Postman/mobile)
        if (!origin) return callback(null, true);

        // 2. Izinkan local dev
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('192.168.')
        ) {
          return callback(null, true);
        }
        // 3. Izinkan domain production dari ENV
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.log('Socket.IO CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      },

      credentials: true,
      methods: ["GET", "POST"]
    },

    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // JWT Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '') || 
                    socket.handshake.query?.token;
      
      if (!token) {
        console.warn(`⚠️ Socket connection rejected: No token provided (ID: ${socket.id})`);
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.warn(`⚠️ Socket connection rejected: Invalid token (ID: ${socket.id})`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Initialize socket service with enhanced monitoring
  initSocketService(io);
  app.set('io', io);
  app.set('dbConnected', () => connected);

  // Additional socket event handlers for monitoring
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);
    
    // Send connection confirmation
    socket.emit('connection_confirmed', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle room joining with validation
    socket.on('join-room', (room) => {
      if (typeof room === 'string' && room.length > 0) {
        socket.join(room);
        console.log(`🏠 Socket ${socket.id} joined room: ${room}`);
        socket.emit('room_joined', { room, timestamp: new Date().toISOString() });
      }
    });

    // Handle monitoring subscription
    socket.on('subscribe-monitoring', () => {
      socket.join('monitoring');
      console.log(`📊 Socket ${socket.id} subscribed to monitoring`);
      socket.emit('monitoring_subscribed', { timestamp: new Date().toISOString() });
    });

    // Handle vessel tracking
    socket.on('track-vessel', (tripId) => {
      if (tripId) {
        socket.join(`vessel:${tripId}`);
        console.log(`🚢 Socket ${socket.id} tracking vessel: ${tripId}`);
        socket.emit('vessel_tracking_started', { tripId, timestamp: new Date().toISOString() });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  // Start server on all interfaces and print accurate LAN addresses
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    const nets = os.networkInterfaces();
    const ips = [];
    Object.keys(nets).forEach((name) => {
      nets[name].forEach((net) => {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      });
    });

    if (ips.length > 0) {
      ips.forEach(ip => console.log(`LAN access: http://${ip}:${PORT}`));
    } else {
      console.log('LAN access: (no non-internal IPv4 detected)');
    }

    // Also log the allowed origins used for Socket.IO
    console.log('Socket.IO allowed origins:', allowedOrigins);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('💯 Shutting down gracefully...');
    server.close(() => {
      console.log('🚫 HTTP server closed');
      closeDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

}).catch(error => {
  console.error('❌ Database error:', error.message);
  process.exit(1);
});
