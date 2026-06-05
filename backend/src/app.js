const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const { csrfProtection } = require('./middleware/csrf');
const { productionSecurity } = require('./middleware/productionSecurity');
const { authenticate } = require('./middleware/auth');
const swaggerSetup = require('./config/swagger');
const documentCleanupService = require('./services/documentCleanupService');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const testRoutes = require('./routes/test');
const nahkodaRoutes = require('./routes/nahkoda');
const kapalRoutes = require('./routes/kapal');
const tripRoutes = require('./routes/trip');
const tripTaskRoutes = require('./routes/tripTask');
const operationalTaskRoutes = require('./routes/operationalTaskRoutes');
const weatherRoutes = require('./routes/weather');
const emergencyRoutes = require('./routes/emergency');
const reportRoutes = require('./routes/report');
const userRoutes = require('./routes/user');
const mobileRoutes = require('./routes/mobile');
const mobileVesselRoutes = require('./routes/mobileVessel');
const mobileCatchRoutes = require('./routes/mobileCatch');
const mobileTripRoutes = require('./routes/mobileTrip');
const profileDocumentRoutes = require('./routes/profileDocument');
const storageDataRoutes = require('./routes/storageData');
const adminTripRoutes = require('./routes/adminTrip');
const adminRoutes = require('./routes/admin');
const hasilTangkapRoutes = require('./routes/hasilTangkap');
const catchPolygonRoutes = require('./routes/catchPolygon');
const harborZonesRoutes = require('./routes/harborZones');
const harborPOIsRoutes = require('./routes/harborPOIs');
const fishPriceRoutes = require('./routes/fishPrice');
const emailSettingsRoutes = require('./routes/emailSettings');
const csrfRoutes = require('./routes/csrf');
const monitoringRoutes = require('./routes/monitoring');
const crewRoutes = require('./routes/crew');
const perangkatRoutes = require('./routes/perangkat');
const testGPSRoutes = require('./routes/testGPS');
const notificationRoutes = require('./routes/notifications');
const fishingPointRoutes = require('./routes/fishingPoint');
const rolePermissionsRoutes = require('./routes/rolePermissions');
const edgeRoutes = require('./routes/edge');

const app = express();

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true
});

app.use(productionSecurity());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      frameAncestors: ["'self'", "http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL || "http://localhost:5173"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: false
}));

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const apiHost = process.env.API_HOST || 'localhost';
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      "http://localhost:5173",
      "http://localhost:5174",
      `http://${apiHost}:5173`,
      `http://${apiHost}:5174`
    ];
    
    // In development, allow localhost and local network
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
        return callback(null, true);
      }
    }
    
    // In production, allow VPS domains, IPs, AND local/private networks for mobile testing
    if (process.env.NODE_ENV === 'production') {
      // Allow any origin that matches VPS IP pattern or domain
      if (origin.match(/^https?:\/\/(\d+\.\d+\.\d+\.\d+|[a-zA-Z0-9.-]+\.(com|net|org|id|co\.id))/) ||
          origin.includes('your-vps-domain.com') ||
          origin.includes('your-vps-ip')) {
        return callback(null, true);
      }
      
      // ALLOW LOCAL/PRIVATE NETWORKS EVEN IN PRODUCTION (Crucial for Mobile Dev/Testing)
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('192.168.') || 
          origin.includes('10.0.') ||
          origin.startsWith('capacitor://') || 
          origin.startsWith('ionic://') ||
          origin.startsWith('http://localhost')) {
         return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control']
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));

// CSRF Protection - DISABLED
// JWT-based authentication doesn't require CSRF protection because:
// 1. JWT tokens are sent in Authorization header, not cookies
// 2. Attackers cannot read/forge the Authorization header from other domains
// If you need CSRF for specific cookie-based routes, apply it per-route instead
// if (process.env.NODE_ENV === 'production') {
//   app.use(require('cookie-parser')());
//   app.use(csrfProtection);
// }

// Apply rate limiting - disabled for development
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
  app.use('/api/auth/', authLimiter);
}

// Static files (untuk upload dokumen)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/', express.static(path.join(__dirname, '../public')));

// Setup Swagger Documentation
swaggerSetup(app);

// Routes
// Test GPS device endpoint
app.get('/api/test-vessel-gps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Kapal, Perangkat } = require('./models');
    
    const vessel = await Kapal.findByPk(id);
    if (!vessel) {
      return res.json({ error: 'Vessel not found' });
    }
    
    const vesselData = vessel.toJSON();
    
    // Get GPS device
    if (vesselData.gpsDeviceId) {
      const gpsDevice = await Perangkat.findByPk(vesselData.gpsDeviceId);
      if (gpsDevice) {
        vesselData.gpsDevice = {
          id: gpsDevice.id,
          namaPerangkat: gpsDevice.namaPerangkat,
          merk: gpsDevice.merk,
          model: gpsDevice.model
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        id: vesselData.id,
        namaKapal: vesselData.namaKapal,
        gpsDeviceId: vesselData.gpsDeviceId,
        gpsDevice: vesselData.gpsDevice || null
      }
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Debug endpoint untuk test create user
if (process.env.NODE_ENV !== 'production') {
app.post('/api/debug-create-user', (req, res) => {
  console.log('=== DEBUG CREATE USER ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  console.log('Body values:', Object.values(req.body));
  
  res.json({
    success: true,
    message: 'Debug endpoint working',
    receivedData: {
      headers: req.headers,
      body: req.body,
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body),
      hasData: Object.keys(req.body).length > 0
    }
  });
});
} // end non-production guard

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test endpoints (non-production only)
if (process.env.NODE_ENV !== 'production') {

// Test harbor zones endpoint without auth
app.get('/api/test-harbor-zones', async (req, res) => {
  try {
    const { HarborZone } = require('./models');
    const count = await HarborZone.count();
    const data = await HarborZone.findAll({ 
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    res.json({ 
      status: 'OK',
      message: 'Harbor zones test',
      count, 
      data 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test catch polygons endpoint without auth
app.get('/api/test-catch-polygons', async (req, res) => {
  try {
    const { CatchPolygon } = require('./models');
    const count = await CatchPolygon.count();
    const data = await CatchPolygon.findAll({ 
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    
    console.log('🔍 Catch polygons test - Count:', count);
    console.log('📋 Sample data:', data.map(p => ({ 
      id: p.id, 
      name: p.name, 
      coordinates: p.coordinates?.length || 0,
      zone_type: p.zone_type,
      is_active: p.is_active
    })));
    
    res.json({ 
      status: 'OK',
      message: 'Catch polygons test',
      count, 
      data: data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coordinates: p.coordinates,
        zoneType: p.zone_type,
        fishTypes: p.fish_types || [],
        maxVessels: p.max_vessels,
        color: p.color,
        isActive: p.is_active,
        createdAt: p.created_at
      }))
    });
  } catch (error) {
    console.error('❌ Error in test-catch-polygons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add sample catch polygons
app.get('/api/add-sample-catch-polygons', async (req, res) => {
  try {
    const { CatchPolygon } = require('./models');
    
    // Sample polygon coordinates (around Jakarta Bay)
    const samplePolygons = [
      {
        name: 'Zona Tangkap Utara Jakarta',
        description: 'Zona tangkap ikan di sebelah utara Jakarta Bay',
        coordinates: [
          { lat: -5.9, lng: 106.7 },
          { lat: -5.9, lng: 106.9 },
          { lat: -6.0, lng: 106.9 },
          { lat: -6.0, lng: 106.7 }
        ],
        zone_type: 'fishing',
        fish_types: ['Tuna', 'Cakalang', 'Tongkol'],
        max_vessels: 10,
        color: '#3b82f6',
        is_active: true
      },
      {
        name: 'Zona Konservasi Kepulauan Seribu',
        description: 'Area konservasi laut di Kepulauan Seribu',
        coordinates: [
          { lat: -5.7, lng: 106.5 },
          { lat: -5.7, lng: 106.7 },
          { lat: -5.8, lng: 106.7 },
          { lat: -5.8, lng: 106.5 }
        ],
        zone_type: 'conservation',
        fish_types: [],
        max_vessels: 0,
        color: '#10b981',
        is_active: true
      },
      {
        name: 'Zona Terlarang Pelabuhan',
        description: 'Area terlarang di sekitar pelabuhan',
        coordinates: [
          { lat: -6.1, lng: 106.8 },
          { lat: -6.1, lng: 106.85 },
          { lat: -6.12, lng: 106.85 },
          { lat: -6.12, lng: 106.8 }
        ],
        zone_type: 'restricted',
        fish_types: [],
        max_vessels: 0,
        color: '#ef4444',
        is_active: true
      }
    ];
    
    const created = [];
    for (const polygonData of samplePolygons) {
      const existing = await CatchPolygon.findOne({ where: { name: polygonData.name } });
      if (!existing) {
        const polygon = await CatchPolygon.create(polygonData);
        created.push(polygon.name);
      }
    }
    
    const totalCount = await CatchPolygon.count();
    
    res.json({
      status: 'OK',
      message: 'Sample catch polygons added',
      created: created.length,
      createdNames: created,
      totalPolygons: totalCount
    });
  } catch (error) {
    console.error('❌ Error adding sample polygons:', error);
    res.status(500).json({ error: error.message });
  }
});

} // end non-production test endpoints

// Test monitoring endpoint
app.get('/api/test-monitoring', async (req, res) => {
  try {
    const { Trip, Kapal, HarborZone, POI } = require('./models');
    
    const activeTrips = await Trip.findAll({
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal'],
          required: false
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type'],
          required: false
        }
      ],
      limit: 3
    });

    const poiCount = await POI.count();
    const zoneCount = await HarborZone.count();

    res.json({
      status: 'OK',
      message: 'Monitoring integration test',
      data: {
        activeTrips: activeTrips.length,
        totalPOIs: poiCount,
        totalZones: zoneCount,
        sampleTrip: activeTrips[0] ? {
          id: activeTrips[0].id,
          vessel: activeTrips[0].kapal?.namaKapal,
          harborZone: activeTrips[0].harborZone?.name,
          hasLocation: !!activeTrips[0].currentLocation
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug token endpoint
app.get('/api/debug-token', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  res.json({
    hasAuthHeader: !!authHeader,
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? token.substring(0, 20) + '...' : null
  });
});

// Debug user endpoint
app.get('/api/debug-user', authenticate, (req, res) => {
  res.json({
    user: req.user,
    hasUser: !!req.user,
    userId: req.user?.userId,
    role: req.user?.role
  });
});

// Test email endpoints (non-production only)
if (process.env.NODE_ENV !== 'production') {

// Test endpoint untuk email settings tanpa auth
app.get('/api/test-email-settings', async (req, res) => {
  try {
    const { EmailSetting } = require('./models');
    const count = await EmailSetting.count();
    const settings = await EmailSetting.findOne({
      where: { isActive: true },
      attributes: { exclude: ['emailPass'] }
    });
    
    res.json({
      status: 'OK',
      message: 'Email settings test',
      count,
      settings,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint untuk GET email settings tanpa auth
app.get('/api/test-get-email-settings', async (req, res) => {
  try {
    const emailSettingController = require('./controllers/emailSettingController');
    
    // Mock req object
    const mockReq = {
      user: { userId: 1, role: 'admin' }
    };
    
    await emailSettingController.getSettings(mockReq, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint untuk kirim email tanpa auth - WORKING VERSION
app.post('/api/test-send-email-direct', async (req, res) => {
  try {
    const { testEmailAddress } = req.body;
    
    if (!testEmailAddress) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    const { EmailSetting } = require('./models');
    const nodemailer = require('nodemailer');
    
    // Get current settings
    const settings = await EmailSetting.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'No email settings configured'
      });
    }

    // Create transporter with current settings
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.emailUser,
        pass: settings.emailPass
      }
    });

    // Send test email
    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromAddress}>`,
      to: testEmailAddress,
      subject: '📧 Test Email - E-Logbook Maritime System (Dynamic)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🚢 E-Logbook Maritime System</h2>
          <p>Ini adalah email test untuk memverifikasi konfigurasi email sistem <strong>DINAMIS</strong>.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Informasi Konfigurasi (dari Database):</h3>
            <ul>
              <li><strong>SMTP Host:</strong> ${settings.smtpHost}</li>
              <li><strong>SMTP Port:</strong> ${settings.smtpPort}</li>
              <li><strong>From Name:</strong> ${settings.fromName}</li>
              <li><strong>From Address:</strong> ${settings.fromAddress}</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString('id-ID')}</li>
              <li><strong>Settings ID:</strong> ${settings.id}</li>
            </ul>
          </div>
          <p style="color: #10b981;">✅ Jika Anda menerima email ini, konfigurasi email DINAMIS berhasil!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Email ini dikirim secara otomatis oleh sistem E-Logbook Maritime menggunakan konfigurasi dinamis dari database.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmailAddress} using dynamic configuration`,
      timestamp: new Date().toISOString(),
      settings: {
        id: settings.id,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        fromName: settings.fromName,
        fromAddress: settings.fromAddress
      }
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

} // end non-production email test endpoints

app.use('/api/nahkoda', nahkodaRoutes);
app.use('/api/kapal', kapalRoutes);
app.use('/api/trip', tripRoutes);
app.use('/api/trip-tasks', tripTaskRoutes);
app.use('/api/operational-tasks', operationalTaskRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/mobile/vessel', mobileVesselRoutes);
app.use('/api/mobile/vessel', storageDataRoutes);
app.use('/api/mobile/catches', mobileCatchRoutes);
app.use('/api/mobile/trip', mobileTripRoutes);
app.use('/api/profile', profileDocumentRoutes); // Admin document verification + user profile
app.use('/api/mobile/profile', profileDocumentRoutes); // Mobile user profile (same routes)
app.use('/api/admin', adminTripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hasil-tangkap', hasilTangkapRoutes);
app.use('/api/catch-polygons', catchPolygonRoutes);
app.use('/api/harbor-zones', harborZonesRoutes);
app.use('/api/harbor-pois', harborPOIsRoutes);
app.use('/api/fish-prices', fishPriceRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api', csrfRoutes); // CSRF routes enabled
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/crew', crewRoutes);
app.use('/api/perangkat', perangkatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fishing-points', fishingPointRoutes);
app.use('/api/role-permissions', rolePermissionsRoutes);
app.use('/api', testGPSRoutes);
app.use('/api/edge', edgeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test mobile dashboard endpoint
app.get('/api/mobile/dashboard-test', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile dashboard test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to add sample fuel data to vessel
app.get('/api/test-add-sample-fuel/:vesselId', async (req, res) => {
  try {
    const { Kapal } = require('./models');
    const { vesselId } = req.params;
    
    const vessel = await Kapal.findByPk(vesselId);
    if (!vessel) {
      return res.json({ error: 'Vessel not found' });
    }
    
    // Sample fuel data (mobile API format)
    const sampleFuelData = [
      {
        id: Date.now().toString(),
        jenisBahanBakar: 'Solar',
        jumlahLiter: 800,
        hargaPerLiter: 6500,
        totalHarga: 5200000,
        tanggalPengisian: new Date().toISOString(),
        lokasiPengisian: 'SPBU Pelabuhan Muara Baru',
        keterangan: 'Pengisian rutin sebelum melaut',
        uploadedAt: new Date().toISOString()
      },
      {
        id: (Date.now() + 1000).toString(),
        jenisBahanBakar: 'Solar',
        jumlahLiter: 300,
        hargaPerLiter: 6800,
        totalHarga: 2040000,
        tanggalPengisian: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        lokasiPengisian: 'SPBU Tanjung Priok',
        keterangan: 'Pengisian tambahan',
        uploadedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    // Sample ice data (mobile API format)
    const sampleIceData = [
      {
        id: Date.now().toString(),
        jenisEs: 'Es Balok',
        jumlahKg: 400,
        hargaPerKg: 2500,
        totalHarga: 1000000,
        tanggalPembelian: new Date().toISOString(),
        lokasiPembelian: 'Pasar Ikan Muara Baru',
        keterangan: 'Es untuk persiapan melaut',
        uploadedAt: new Date().toISOString()
      }
    ];
    
    await vessel.update({
      dataBahanBakar: sampleFuelData,
      storageData: sampleIceData
    });
    
    res.json({
      status: 'OK',
      message: 'Sample fuel and ice data added successfully',
      vesselId: vessel.id,
      vesselName: vessel.namaKapal,
      fuelRecords: sampleFuelData.length,
      iceRecords: sampleIceData.length,
      totalFuel: sampleFuelData.reduce((sum, f) => sum + f.jumlahLiter, 0),
      totalIce: sampleIceData.reduce((sum, i) => sum + i.jumlahKg, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint untuk email notifications
app.get('/api/test-email', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    
    // Test email data
    const testEmail = req.query.email || 'test@example.com';
    const testName = req.query.name || 'Test User';
    
    // Test trip assignment email
    await emailService.sendTripAssignmentEmail(
      testEmail,
      testName,
      {
        vesselName: 'KM Test Vessel',
        departureDate: new Date().toISOString(),
        estimatedReturn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        fishingArea: 'Zona Test Utara',
        targetFish: 'Tuna, Cakalang'
      }
    );
    
    res.json({
      status: 'OK',
      message: 'Test email sent successfully',
      recipient: testEmail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      config: {
        emailUser: process.env.EMAIL_USER || 'Not configured',
        emailPass: process.env.EMAIL_PASS ? 'Configured' : 'Not configured'
      }
    });
  }
});

// Test endpoint untuk notifikasi trip assignment
app.get('/api/test-trip-notification', async (req, res) => {
  try {
    const { sendNotification } = require('./services/notificationService');
    
    // Test notification data
    const testNotification = await sendNotification({
      penerima: [1], // Assuming user ID 1 exists
      tipe: 'trip_assignment',
      judul: '🚢 Test Jadwal Trip Baru',
      pesan: 'Ini adalah test notifikasi untuk jadwal trip baru. Anda telah ditugaskan sebagai nahkoda.',
      priority: 'high',
      data: {
        tripId: 'test-123',
        vesselName: 'Test Vessel',
        departureDate: new Date().toISOString(),
        testMode: true
      },
      dikirimOleh: 1
    });
    
    res.json({
      status: 'OK',
      message: 'Test notification sent successfully',
      notification: testNotification
    });
  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Test auth endpoint
app.get('/test-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  res.json({
    status: 'OK',
    message: 'Auth test endpoint',
    hasAuthHeader: !!authHeader,
    tokenLength: token ? token.length : 0,
    jwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
  });
});

// Error handler
app.use(errorHandler);

// Start document cleanup service
documentCleanupService.start();

module.exports = app;