const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { conditionalCsrf } = require('../middleware/mobileCsrf');
const { User, Trip, Emergency, Kapal } = require('../models');
const fishingPointController = require('../controllers/fishingPointController');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sanitizeIP } = require('../utils/ipValidation');
const { validateCoordinates, validateObjectId } = require('../utils/inputValidation');
const emergencyService = require('../services/emergencyService');

// Rate limiter for mobile auth
const mobileAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.MOBILE_RATE_LIMIT_MAX || '10', 10),
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'e-logbook-mobile'
    }
  );
};

// Mobile Login - No CSRF needed (JWT is stateless auth)
router.post('/login', mobileAuthLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    const dbConnected = req.app.get('dbConnected')();

    if (dbConnected) {
      const user = await User.findOne({
        where: {
          email: email.toLowerCase()
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Akun tidak aktif. Hubungi administrator'
        });
      }

      if (!['nahkoda', 'abk'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Akun tidak memiliki akses mobile app. Hanya Nahkoda dan ABK yang dapat menggunakan aplikasi mobile.',
          errorCode: 'MOBILE_ACCESS_DENIED',
          userRole: user.role,
          allowedRoles: ['nahkoda', 'abk']
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      const rawIp = (req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '').split(',')[0].trim();
      const sanitizedIp = sanitizeIP(rawIp);

      try {
        if (sanitizedIp) {
          user.lastLoginIp = sanitizedIp;
        }
        user.lastLoginAt = new Date();
        await user.save();
      } catch (e) {
        console.warn('⚠️ Failed to save login info:', e.message);
      }

      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: {
            nama: user.nama,
            telepon: user.noTelepon,
            alamat: user.alamat || null
          },
          lastLoginAt: user.lastLoginAt || user.updatedAt,
          mobileAccess: true,
          permissions: {
            canManageTrip: user.role === 'nahkoda',
            canUpdateLocation: true,
            canSendSOS: true,
            canUploadDocuments: true,
            canViewVesselData: true
          }
        }
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }
  } catch (error) {
    console.error('❌ Mobile login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// Upload Personal Documents
router.post('/profile/documents', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
      }
    }
  }).any();

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { jenisDokumen, nomorDokumen, tanggalBerlaku, keterangan } = req.body;

    console.log('📄 Mobile document upload request');
    console.log('📄 Body:', req.body);
    console.log('📄 Files:', req.files ? req.files.length : 0);
    if (req.files) {
      console.log('📄 Field names:', req.files.map(f => f.fieldname));
    }

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa upload dokumen'
      });
    }

    let uploadedFile = null;
    if (req.files && req.files.length > 0) {
      uploadedFile = req.files[0];
    }

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'File dokumen wajib diupload'
      });
    }

    const uploadDir = path.join(__dirname, `../../uploads/profile-documents/${userId}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${crypto.createHash('md5').update(uploadedFile.originalname + Date.now()).digest('hex')}${path.extname(uploadedFile.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, uploadedFile.buffer);

    const allowedDocTypes = [
      'KTP', 'Pas Foto', 'NPWP',
      'Buku Pelaut', 'Sertifikat Nahkoda', 'BST',
      'Surat Keterangan Sehat', 'SKCK'
    ];

    if (!jenisDokumen || !allowedDocTypes.includes(jenisDokumen)) {
      return res.status(400).json({
        success: false,
        message: `Jenis dokumen harus salah satu dari: ${allowedDocTypes.join(', ')}`,
        allowedTypes: allowedDocTypes
      });
    }

    const dbConnected = req.app.get('dbConnected')();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const documentData = {
      id: Date.now().toString(),
      jenisDokumen: jenisDokumen,
      nomorDokumen: nomorDokumen || null,
      tanggalBerlaku: tanggalBerlaku ? new Date(tanggalBerlaku) : null,
      keterangan: keterangan || null,
      fileName: fileName,
      fileUrl: `/uploads/profile-documents/${userId}/${fileName}`,
      uploadedAt: new Date(),
      status: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    const currentDokumen = user.dokumen || [];
    const filteredDokumen = currentDokumen.filter(doc => doc.jenisDokumen !== jenisDokumen);
    filteredDokumen.push(documentData);

    user.dokumen = filteredDokumen;
    user.changed('dokumen', true);
    await user.save();

    res.json({
      success: true,
      message: 'Dokumen berhasil diupload dan menunggu verifikasi admin',
      data: {
        id: documentData.id,
        jenisDokumen: documentData.jenisDokumen,
        nomorDokumen: documentData.nomorDokumen,
        tanggalBerlaku: documentData.tanggalBerlaku,
        keterangan: documentData.keterangan,
        fileName: documentData.fileName,
        fileUrl: documentData.fileUrl,
        uploadedAt: documentData.uploadedAt,
        status: documentData.status,
        verifiedAt: documentData.verifiedAt,
        verifiedBy: documentData.verifiedBy,
        rejectionReason: documentData.rejectionReason
      }
    });
  } catch (error) {
    console.error('❌ Error uploading mobile document:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get Personal Documents
router.get('/profile/documents', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    console.log('📱 [MOBILE GET DOCS] Request from user:', userId, 'role:', role);

    if (role !== 'nahkoda' && role !== 'abk') {
      console.log('❌ [MOBILE GET DOCS] Access denied - invalid role:', role);
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat dokumen'
      });
    }

    const dbConnected = req.app.get('dbConnected')();

    if (!dbConnected) {
      console.log('❌ [MOBILE GET DOCS] Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    // Force fresh read from database, bypass any caching
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nama', 'username', 'email', 'noTelepon', 'dokumen'],
      raw: false, // Ensure we get model instance
      rejectOnEmpty: false
    });

    if (!user) {
      console.log('❌ [MOBILE GET DOCS] User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    console.log('=== MOBILE GET DOCUMENTS DEBUG ===');
    console.log('👤 [MOBILE GET DOCS] User ID:', userId);
    console.log('👤 [MOBILE GET DOCS] User Name:', user.nama);
    console.log('📄 [MOBILE GET DOCS] Raw dokumen from DB:', JSON.stringify(user.dokumen, null, 2));
    console.log('📊 [MOBILE GET DOCS] Total documents:', (user.dokumen || []).length);

    const dokumen = user.dokumen || [];

    // Log each document status in detail
    dokumen.forEach((doc, index) => {
      console.log(`📄 [MOBILE GET DOCS] Doc[${index}]: id="${doc.id}", jenis="${doc.jenisDokumen}", status="${doc.status}", verifiedAt=${doc.verifiedAt || 'null'}, verifiedBy=${doc.verifiedBy || 'null'}`);
    });

    const sortedDokumen = dokumen.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    console.log('📤 [MOBILE GET DOCS] Sending response with', sortedDokumen.length, 'documents');
    console.log('=== END MOBILE GET DOCUMENTS DEBUG ===');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nama: user.nama || user.username,
          noTelepon: user.noTelepon
        },
        dokumen: sortedDokumen
      }
    });
  } catch (error) {
    console.error('❌ [MOBILE GET DOCS] Error getting personal documents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mobile Dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa mengakses dashboard mobile'
      });
    }

    const dbConnected = req.app.get('dbConnected')();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    const myTrips = await Trip.count({ where: { nahkodaId: userId } });
    const activeTrips = await Trip.count({ where: { nahkodaId: userId, status: 'sedang_melaut' } });

    res.json({
      success: true,
      data: {
        role,
        myTrips,
        activeTrips,
        recentTrips: []
      }
    });
  } catch (error) {
    console.error('❌ Mobile dashboard error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// Get My Schedules (Trips)
router.get('/my-schedules', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat jadwal'
      });
    }

    const dbConnected = req.app.get('dbConnected')();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    let trips = [];

    if (role === 'nahkoda') {
      // Nahkoda can see trips they captain
      trips = await Trip.findAll({
        where: { nahkodaId: userId },
        include: [{
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi']
        }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });
    } else {
      // ABK can see trips they are assigned to (awakKapal contains their userId)
      const allTrips = await Trip.findAll({
        include: [{
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi']
        }],
        order: [['createdAt', 'DESC']]
      });
      trips = allTrips.filter(t => Array.isArray(t.awakKapal) && t.awakKapal.includes(userId));
    }

    const schedules = trips.map(trip => ({
      id: trip.id,
      tanggalBerangkat: trip.tanggalBerangkat,
      tanggalKembali: trip.tanggalKembali,
      status: trip.status,
      tujuan: trip.tujuan,
      kapal: trip.kapal ? {
        id: trip.kapal.id,
        nama: trip.kapal.namaKapal,
        nomorRegistrasi: trip.kapal.nomorRegistrasi
      } : null,
      role: role === 'nahkoda' ? 'Nahkoda' : 'ABK'
    }));

    res.json({
      success: true,
      data: {
        schedules,
        total: schedules.length,
        role
      }
    });
  } catch (error) {
    console.error('❌ Error getting schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// Get Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'nama', 'noTelepon', 'alamat', 'foto', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Profile
router.put('/profile', authenticate, (req, res, next) => {
  // Handle multipart/form-data for photo uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG yang diizinkan'));
      }
    }
  }).single('foto'); // Field name for photo

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { userId } = req.user;
    const { nama, noTelepon, alamat } = req.body;

    // 🔍 DEBUG LOGGING
    console.log('🔍 [MOBILE UPDATE PROFILE] Request received');
    console.log('📋 [MOBILE UPDATE PROFILE] User ID:', userId);
    console.log('📋 [MOBILE UPDATE PROFILE] Request body:', req.body);
    console.log('📋 [MOBILE UPDATE PROFILE] nama:', nama);
    console.log('📋 [MOBILE UPDATE PROFILE] noTelepon:', noTelepon);
    console.log('📋 [MOBILE UPDATE PROFILE] alamat:', alamat);
    console.log('📋 [MOBILE UPDATE PROFILE] Has file:', !!req.file);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    console.log('👤 [MOBILE UPDATE PROFILE] Current user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat,
      foto: user.foto
    });

    // Prepare update data
    const updateData = {};
    if (nama !== undefined && nama !== null) updateData.nama = nama;
    if (noTelepon !== undefined && noTelepon !== null) updateData.noTelepon = noTelepon;
    if (alamat !== undefined && alamat !== null) updateData.alamat = alamat;

    // Handle photo upload
    if (req.file) {
      const uploadDir = path.join(__dirname, `../../uploads/profile-photos`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old photo if exists
      if (user.foto) {
        const oldPhotoPath = path.join(__dirname, `../../uploads/profile-photos/${user.foto}`);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
          console.log('🗑️ [MOBILE UPDATE PROFILE] Old photo deleted');
        }
      }

      // Save new photo
      const fileName = `${userId}-${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      updateData.foto = fileName;
      console.log('📸 [MOBILE UPDATE PROFILE] New photo saved:', fileName);
    }

    console.log('📝 [MOBILE UPDATE PROFILE] Update data prepared:', updateData);

    // Update user
    await user.update(updateData);

    // Reload to get fresh data
    await user.reload();
    console.log('✅ [MOBILE UPDATE PROFILE] After update - user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat,
      foto: user.foto
    });

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      photoUrl: user.foto ? `/uploads/profile-photos/${user.foto}` : null
    });
  } catch (error) {
    console.error('❌ [MOBILE UPDATE PROFILE] Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Emergency Alert
router.post('/emergency-alert', authenticate, async (req, res) => {
  try {
    const { tripId, location, message, emergencyType } = req.body;

    if (!tripId || !location || !message) {
      return res.status(400).json({
        success: false,
        message: 'tripId, location, dan message wajib diisi'
      });
    }

    // Create emergency record
    const emergency = await Emergency.create({
      tripId,
      userId: req.user.userId,
      jenisEmergency: emergencyType || 'SOS',
      deskripsi: message,
      lokasi: location,
      status: 'aktif',
      waktuLapor: new Date()
    });

    res.json({
      success: true,
      message: 'Emergency alert sent successfully',
      data: {
        tripId,
        emergencyType: emergencyType || 'SOS',
        nahkoda: req.user.username
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Location
router.post('/location', authenticate, async (req, res) => {
  try {
    const { kapalId, lat, lng, deviceId, speed, heading } = req.body;

    if (!kapalId || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'kapalId, lat, dan lng wajib diisi'
      });
    }

    // 1. Update Vessel Last Position
    const kapal = await Kapal.findByPk(kapalId);
    if (!kapal) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    await kapal.update({
      lastPosition: { latitude: lat, longitude: lng, speed, heading },
      lastPositionUpdate: new Date()
    });

    // 2. Find Active Trip & Update History
    const activeTrip = await Trip.findOne({
      where: {
        kapalId: kapalId,
        status: 'sedang_melaut'
      }
    });

    if (activeTrip) {
      // Update current location
      const newLocation = { lat, lng, speed, heading, timestamp: new Date() };

      // Append to tracking history
      let trackingHistory = activeTrip.tracking || [];
      // Ensure it's an array
      if (!Array.isArray(trackingHistory)) trackingHistory = [];

      trackingHistory.push(newLocation);

      await activeTrip.update({
        currentLocation: newLocation,
        tracking: trackingHistory
      });

      // 3. BROADCAST TO DASHBOARD (Socket.io)
      const io = req.app.get('io');
      if (io) {
        io.emit('vessel_location_update', {
          tripId: activeTrip.id,
          vesselId: kapal.id,
          vesselName: kapal.namaKapal,
          location: { lat, lng, speed, heading },
          timestamp: new Date()
        });
        console.log(`📡 Broadcasted location for ${kapal.namaKapal}`);
      } else {
        console.warn('⚠️ Socket.io instance not found in app');
      }
    }

    res.json({
      success: true,
      message: 'Lokasi berhasil diupdate dan dibroadcast'
    });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get My Vessels
router.get('/vessels/my-vessel', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat kapal yang ditugaskan'
      });
    }

    let vessels = [];

    if (role === 'nahkoda') {
      vessels = await Kapal.findAll({
        where: { nahkodaId: userId },
        include: [{
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama', 'username', 'noTelepon']
        }]
      });
    }

    const vesselData = vessels.map(vessel => ({
      id: vessel.id,
      namaKapal: vessel.namaKapal,
      nomorRegistrasi: vessel.nomorRegistrasi,
      tipeKapal: vessel.tipeKapal,
      statusOperasional: vessel.statusOperasional,
      nahkoda: vessel.nahkoda,
      assignmentStatus: role === 'nahkoda' ? 'captain' : 'crew'
    }));

    res.json({
      success: true,
      data: vesselData,
      message: vesselData.length === 0 ? 'Belum ada kapal yang ditugaskan' : null
    });
  } catch (error) {
    console.error('❌ Error getting vessels:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// SOS Alert
router.post('/sos', authenticate, async (req, res) => {
  try {
    const { kapalId, location, jenisEmergency, note, priority } = req.body;

    if (!kapalId || !location) {
      return res.status(400).json({
        success: false,
        message: 'kapalId dan location wajib diisi'
      });
    }

    const kapal = await Kapal.findByPk(kapalId);
    if (!kapal) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    // Map variables to database columns
    const emergency = await Emergency.create({
      vesselId: kapalId,
      location: location,
      note: note || 'SOS Alert',
      type: jenisEmergency || 'SOS',
      status: 'active',
    });

    // Update active trip status to 'darurat'
    const activeTrip = await Trip.findOne({
      where: {
        kapalId: kapalId,
        status: ['sedang_melaut', 'disetujui']
      }
    });

    if (activeTrip) {
      console.log(`[SOS] Updating trip ${activeTrip.id} status to 'darurat'`);
      await activeTrip.update({ status: 'darurat' });
    } else {
      console.warn(`[SOS] No active trip found for vessel ${kapalId} to update status`);
    }

    // Broadcast SOS Alert
    const io = req.app.get('io');
    if (io) {
      const alertData = {
        id: emergency.id,
        vesselId: kapalId,
        vesselName: kapal.namaKapal,
        location,
        jenisEmergency: jenisEmergency || 'SOS',
        deskripsi: note || 'SOS Alert',
        status: 'active',
        waktuLapor: emergency.createdAt,
        priority: priority || 'critical'
      };

      io.emit('emergency_alert', alertData);
      io.emit('vessel_status_update', {
        vesselId: kapalId,
        status: 'emergency'
      });
    }

    res.status(201).json({
      success: true,
      message: 'SOS berhasil dikirim! Tim rescue akan segera dihubungi.',
      data: {
        sosId: emergency.id,
        kapalId,
        vesselName: kapal.namaKapal,
        location,
        jenisEmergency: jenisEmergency || 'SOS',
        status: 'active',
        waktuLapor: emergency.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    // Mock notifications for now
    const notifications = [
      {
        id: '1',
        type: 'new_task',
        title: 'Tugas Baru',
        message: 'Anda mendapat tugas trip baru',
        isRead: false,
        createdAt: new Date()
      }
    ];

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.post('/notifications', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId wajib diisi'
      });
    }

    res.json({
      success: true,
      message: 'Notifikasi berhasil ditandai sebagai sudah dibaca'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vessel assignment status
router.get('/vessels/assignment-status', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa mengakses'
      });
    }

    let assignedVessels = [];
    let hasAssignment = false;

    if (role === 'nahkoda') {
      const vessels = await Kapal.findAll({
        where: { nahkodaId: userId },
        attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'statusOperasional']
      });

      assignedVessels = vessels.map(v => ({
        id: v.id,
        namaKapal: v.namaKapal,
        nomorRegistrasi: v.nomorRegistrasi,
        statusOperasional: v.statusOperasional,
        assignmentStatus: 'assigned'
      }));

      hasAssignment = vessels.length > 0;
    }

    res.json({
      success: true,
      data: {
        userId,
        role,
        assignmentType: role === 'nahkoda' ? 'captain' : 'crew',
        hasAssignment,
        assignedVessels
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vessel detail by ID
router.get('/vessels/:id', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { id } = req.params;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa mengakses'
      });
    }

    const vessel = await Kapal.findByPk(id, {
      include: [{
        model: User,
        as: 'nahkoda',
        attributes: ['id', 'nama', 'username', 'noTelepon', 'email']
      }]
    });

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    // Check access rights
    if (role === 'nahkoda' && vessel.nahkodaId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke kapal ini'
      });
    }

    res.json({
      success: true,
      data: {
        id: vessel.id,
        namaKapal: vessel.namaKapal,
        nomorRegistrasi: vessel.nomorRegistrasi,
        tipeKapal: vessel.tipeKapal,
        statusOperasional: vessel.statusOperasional,
        nahkoda: vessel.nahkoda,
        userAssignmentType: role === 'nahkoda' ? 'captain' : 'crew'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit catch data - DEPRECATED (Moved to mobileCatchController)
router.post('/catches-deprecated', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa submit data tangkapan'
      });
    }

    const {
      fish_name, fish_type, weight, quantity, condition,
      price_per_kg, total_revenue, kapalId
    } = req.body;

    if (!fish_name || !weight || !kapalId) {
      return res.status(400).json({
        success: false,
        message: 'fish_name, weight, dan kapalId wajib diisi'
      });
    }

    // Create catch record
    const catchData = await HasilTangkap.create({
      fish_name,
      fish_type,
      weight: parseFloat(weight),
      quantity: parseInt(quantity) || 1,
      condition,
      price_per_kg: parseFloat(price_per_kg) || 0,
      total_revenue: parseFloat(total_revenue) || 0,
      kapalId: parseInt(kapalId),
      userId: req.user.userId,
      sync_status: 'Synced',
      last_sync_attempt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Data tangkapan berhasil disimpan',
      data: {
        id: catchData.id,
        sync_status: 'Synced',
        last_sync_attempt: catchData.last_sync_attempt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      sync_status: 'Failed'
    });
  }
});

// Get catch history - DEPRECATED (Moved to mobileCatchController)
router.get('/catches-deprecated', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat data tangkapan'
      });
    }

    const catches = await HasilTangkap.findAll({
      where: { userId },
      include: [{
        model: Kapal,
        as: 'kapal',
        attributes: ['namaKapal']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const catchData = catches.map(c => ({
      id: c.id,
      fish_name: c.fish_name,
      weight: c.weight,
      total_revenue: c.total_revenue,
      departure_date: c.createdAt,
      vessel_name: c.kapal?.namaKapal,
      sync_status: c.sync_status || 'Synced',
      quantity: c.quantity,
      condition: c.condition,
      net_profit: c.total_revenue || 0
    }));

    res.json({
      success: true,
      data: catchData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Personal documents (alternative endpoint)
router.post('/personal-documents', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa upload dokumen pribadi'
      });
    }

    // This is an alternative to /profile/documents
    res.json({
      success: true,
      message: 'Gunakan endpoint /mobile/profile/documents untuk upload dokumen'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Vessel document management
router.post('/vessel/:kapalId/documents', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { kapalId } = req.params;

    if (role !== 'nahkoda') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda yang bisa upload dokumen kapal'
      });
    }

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    if (vessel.nahkodaId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke kapal ini'
      });
    }

    res.json({
      success: true,
      message: 'Endpoint untuk upload dokumen kapal',
      data: {
        kapalId: vessel.id,
        namaKapal: vessel.namaKapal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vessel documents
router.get('/vessel/:kapalId/documents', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        kapal: {
          id: vessel.id,
          namaKapal: vessel.namaKapal,
          nomorRegistrasi: vessel.nomorRegistrasi
        },
        sertifikatJalan: vessel.sertifikatJalan || [],
        dataBahanBakar: vessel.dataBahanBakar || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload fuel data (ABK only) - Kesiapan Operasional
router.post('/vessel/:kapalId/bahan-bakar', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { role, userId } = req.user;
    const {
      jenisBahanBakar, jumlahLiter, hargaPerLiter,
      totalHarga, tanggalPengisian, lokasiPengisian, keterangan
    } = req.body;

    // Hanya ABK yang bisa upload data bahan bakar (Kesiapan Operasional)
    if (role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya ABK yang bisa mengupload data bahan bakar'
      });
    }

    if (!jenisBahanBakar || !jumlahLiter || !hargaPerLiter || !totalHarga || !tanggalPengisian) {
      return res.status(400).json({
        success: false,
        message: 'Data bahan bakar tidak lengkap'
      });
    }


    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    const fuelData = {
      id: Date.now().toString(),
      jenisBahanBakar,
      jumlahLiter: parseFloat(jumlahLiter),
      hargaPerLiter: parseFloat(hargaPerLiter),
      totalHarga: parseFloat(totalHarga),
      tanggalPengisian: new Date(tanggalPengisian),
      lokasiPengisian,
      keterangan,
      uploadedAt: new Date()
    };

    const currentFuelData = vessel.dataBahanBakar || [];
    currentFuelData.push(fuelData);

    await vessel.update({ dataBahanBakar: currentFuelData });

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diupload',
      data: fuelData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route alias for Swagger: /fuel-data -> same as /bahan-bakar (ABK only)
router.post('/vessel/:kapalId/fuel-data', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { role, userId } = req.user;
    const {
      jenisBahanBakar, jumlahLiter, hargaPerLiter,
      totalHarga, tanggalPengisian, lokasiPengisian, keterangan
    } = req.body;

    // Hanya ABK yang bisa upload data bahan bakar (Kesiapan Operasional)
    if (role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya ABK yang bisa mengupload data bahan bakar'
      });
    }

    if (!jenisBahanBakar || !jumlahLiter || !hargaPerLiter || !totalHarga || !tanggalPengisian) {
      return res.status(400).json({
        success: false,
        message: 'Data bahan bakar tidak lengkap'
      });
    }

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    const fuelData = {
      id: Date.now().toString(),
      jenisBahanBakar,
      jumlahLiter: parseFloat(jumlahLiter),
      hargaPerLiter: parseFloat(hargaPerLiter),
      totalHarga: parseFloat(totalHarga),
      tanggalPengisian: new Date(tanggalPengisian),
      lokasiPengisian,
      keterangan,
      uploadedAt: new Date(),
      uploadedBy: userId
    };

    const currentFuelData = vessel.dataBahanBakar || [];
    currentFuelData.push(fuelData);

    await vessel.update({ dataBahanBakar: currentFuelData });

    console.log('⛽ [ABK FUEL DATA] Uploaded by:', userId, '- Fuel:', jumlahLiter, 'L');

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diupload',
      data: fuelData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fuel summary

router.get('/vessel/:kapalId/fuel-summary', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    const fuelData = vessel.dataBahanBakar || [];

    const summary = {
      totalPengisian: fuelData.length,
      totalLiter: fuelData.reduce((sum, f) => sum + (f.jumlahLiter || 0), 0),
      totalBiaya: fuelData.reduce((sum, f) => sum + (f.totalHarga || 0), 0),
      rataRataHarga: fuelData.length > 0 ?
        fuelData.reduce((sum, f) => sum + (f.hargaPerLiter || 0), 0) / fuelData.length : 0,
      pengisianTerakhir: fuelData.length > 0 ? fuelData[fuelData.length - 1] : null
    };

    res.json({
      success: true,
      data: {
        kapal: {
          id: vessel.id,
          namaKapal: vessel.namaKapal
        },
        summary,
        details: fuelData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload sertifikat jalan
router.post('/vessel/:kapalId/sertifikat-jalan', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { nama, nomorSertifikat, tanggalBerlaku } = req.body;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    const certData = {
      id: Date.now().toString(),
      nama: nama || 'Sertifikat Jalan',
      nomorSertifikat,
      tanggalBerlaku: tanggalBerlaku ? new Date(tanggalBerlaku) : null,
      uploadedAt: new Date()
    };

    const currentCerts = vessel.sertifikatJalan || [];
    currentCerts.push(certData);

    await vessel.update({ sertifikatJalan: currentCerts });

    res.json({
      success: true,
      message: 'Sertifikat jalan berhasil diupload',
      data: certData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload ice data (ABK only) - Kesiapan Operasional
router.post('/vessel/:kapalId/ice-data', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { role, userId } = req.user;
    const { jenisEs, jumlahKg, hargaPerKg, totalHarga, tanggalPembelian, lokasiPembelian } = req.body;

    // Hanya ABK yang bisa upload data es (Kesiapan Operasional)
    if (role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya ABK yang bisa mengupload data es'
      });
    }

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }


    const iceData = {
      id: Date.now().toString(),
      jenisEs,
      jumlahKg: parseFloat(jumlahKg),
      hargaPerKg: parseFloat(hargaPerKg),
      totalHarga: parseFloat(totalHarga),
      tanggalPembelian: new Date(tanggalPembelian),
      lokasiPembelian,
      uploadedAt: new Date()
    };

    const currentIceData = vessel.storageData || [];
    currentIceData.push(iceData);

    await vessel.update({ storageData: currentIceData });

    res.json({
      success: true,
      message: 'Data es berhasil diupload',
      data: iceData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get ice summary
router.get('/vessel/:kapalId/ice-summary', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    const iceData = vessel.dataEs || [];

    const summary = {
      totalPembelian: iceData.length,
      totalKg: iceData.reduce((sum, i) => sum + (i.jumlahKg || 0), 0),
      totalBiaya: iceData.reduce((sum, i) => sum + (i.totalHarga || 0), 0),
      rataRataHarga: iceData.length > 0 ?
        iceData.reduce((sum, i) => sum + (i.hargaPerKg || 0), 0) / iceData.length : 0,
      pembelianTerakhir: iceData.length > 0 ? iceData[iceData.length - 1] : null
    };

    res.json({
      success: true,
      data: {
        kapal: { id: vessel.id, namaKapal: vessel.namaKapal },
        summary,
        details: iceData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload storage data
router.post('/vessel/:kapalId/storage-data', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { jumlahEs, kapasitasPenyimpanan, suhuPenyimpanan, kondisiPenyimpanan } = req.body;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    const storageData = {
      id: Date.now().toString(),
      jumlahEs: parseFloat(jumlahEs),
      kapasitasPenyimpanan: parseFloat(kapasitasPenyimpanan),
      suhuPenyimpanan: parseFloat(suhuPenyimpanan),
      kondisiPenyimpanan,
      uploadedAt: new Date()
    };

    const currentStorageData = vessel.storageData || [];
    currentStorageData.push(storageData);

    await vessel.update({ storageData: currentStorageData });

    res.json({
      success: true,
      message: 'Data penyimpanan berhasil diupload',
      data: storageData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my trips
router.get('/my-trips', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa mengakses'
      });
    }

    let trips = [];

    if (role === 'nahkoda') {
      trips = await Trip.findAll({
        where: { nahkodaId: userId },
        include: [{ model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorRegistrasi'] }],
        order: [['createdAt', 'DESC']]
      });
    }

    const tripData = trips.map(trip => ({
      id: trip.id,
      taskTitle: `Trip ${trip.kapal?.namaKapal}`,
      kapal: trip.kapal,
      tanggalBerangkat: trip.tanggalBerangkat,
      estimasiPulang: trip.estimasiPulang,
      status: trip.status,
      areaTangkap: trip.areaTangkap,
      targetIkan: trip.targetIkan
    }));

    res.json({ success: true, data: tripData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit trip task
router.post('/trip-tasks', authenticate, async (req, res) => {
  try {
    const { taskId, status, notes } = req.body;

    res.json({
      success: true,
      message: 'Laporan penyelesaian tugas berhasil dikirim',
      data: { taskId, status, notes }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit fishing point (titik penurunan jaring)
router.post('/fishing-point', fishingPointController.submitFishingPoint);

// Get trip task detail
router.get('/trip/:tripId/task-detail', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findByPk(tripId, {
      include: [{ model: Kapal, as: 'kapal' }]
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    res.json({
      success: true,
      data: {
        id: trip.id,
        taskTitle: `Trip ${trip.kapal?.namaKapal}`,
        suratTugas: `Surat Tugas Trip ${trip.id}`,
        kapal: trip.kapal,
        tanggalBerangkat: trip.tanggalBerangkat,
        estimasiPulang: trip.estimasiPulang,
        status: trip.status,
        dokumenRequired: ['KTP', 'Buku Pelaut', 'Sertifikat Jalan Kapal', 'Data Bahan Bakar']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get trip document status
router.get('/trip/:tripId/document-status', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId } = req.user;

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    const user = await User.findByPk(userId);
    const dokumen = user?.dokumen || [];

    const dokumenRequired = {
      pribadi: {
        'KTP': { uploaded: dokumen.some(d => d.jenisDokumen === 'KTP'), approved: true, status: 'approved' },
        'Buku Pelaut': { uploaded: dokumen.some(d => d.jenisDokumen === 'Buku Pelaut'), approved: true, status: 'approved' }
      },
      kapal: {
        'Sertifikat Jalan': { uploaded: true, approved: true, count: 1 },
        'Data BBM': { uploaded: true, approved: true, count: 1 }
      }
    };

    res.json({
      success: true,
      data: {
        tripId: trip.id,
        tripStatus: trip.status,
        userRole: req.user.role,
        dokumenRequired,
        completion: {
          personalDocsComplete: true,
          vesselDocsComplete: true,
          allDocsComplete: true,
          canStartTrip: trip.status === 'disetujui'
        },
        missingDocuments: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check if trip can start
router.get('/trip/:tripId/can-start', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { role } = req.user;

    if (role !== 'nahkoda') {
      return res.status(403).json({ success: false, message: 'Hanya nahkoda yang bisa memulai trip' });
    }

    const trip = await Trip.findByPk(tripId, {
      include: [{ model: Kapal, as: 'kapal' }]
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    const canStart = trip.status === 'disetujui';

    res.json({
      success: true,
      data: {
        tripId: trip.id,
        canStart,
        status: trip.status,
        statusMessage: canStart ? 'Trip siap dimulai' : 'Menunggu persetujuan admin',
        allDocumentsApproved: true,
        personalDocsComplete: true,
        vesselDocsComplete: true,
        missingRequirements: canStart ? [] : ['Persetujuan admin'],
        kapal: trip.kapal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check trip readiness
router.get('/trip/:tripId/readiness', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    const ready = trip.status === 'disetujui';

    res.json({
      success: true,
      data: {
        ready,
        status: trip.status,
        checklist: {
          personalDocs: true,
          vesselDocs: true,
          fuelData: true,
          iceData: true,
          storageData: true,
          approved: trip.status === 'disetujui'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// KESIAPAN OPERASIONAL - ABK ONLY
// ==========================================

// Upload fuel data by Trip (ABK only)
router.post('/trip/:tripId/fuel-data', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
      }
    }
  }).any();

  upload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { role, userId } = req.user;
    const {
      jenisBahanBakar, jumlahLiter, hargaPerLiter,
      totalHarga, tanggalPengisian, lokasiPengisian, keterangan
    } = req.body;

    console.log('⛽ [ABK FUEL DATA] Request - Trip:', tripId, 'User:', userId);

    // Hanya ABK yang bisa upload
    if (role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya ABK yang bisa mengupload data bahan bakar'
      });
    }

    // Validasi input
    if (!jenisBahanBakar || !jumlahLiter || !hargaPerLiter || !totalHarga || !tanggalPengisian) {
      return res.status(400).json({
        success: false,
        message: 'Data bahan bakar tidak lengkap (jenisBahanBakar, jumlahLiter, hargaPerLiter, totalHarga, tanggalPengisian wajib diisi)'
      });
    }

    // Cari trip
    const trip = await Trip.findByPk(tripId, {
      include: [{
        model: Kapal,
        as: 'kapal',
        attributes: ['id', 'namaKapal', 'nomorRegistrasi']
      }]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    // Verifikasi ABK ditugaskan ke trip ini
    const isAssigned = trip.awakKapal && trip.awakKapal.includes(userId);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak ditugaskan ke trip ini'
      });
    }

    // Handle File Upload
    let buktiFileUrl = null;
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Ambil file pertama (field 'bukti')
      const uploadDir = path.join(__dirname, `../../uploads/fuel-data/${tripId}`);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${crypto.createHash('md5').update(file.originalname).digest('hex')}${path.extname(file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      buktiFileUrl = `/uploads/fuel-data/${tripId}/${fileName}`;
    }

    // Update perizinan.operasional dengan data fuel
    let perizinan = trip.perizinan || {};
    if (!perizinan.operasional) {
      perizinan.operasional = {
        kapasitasBensin: 0,
        bensinTersedia: 0,
        kapasitasEs: 0,
        esTersedia: 0
      };
    }

    // Update bensin tersedia
    perizinan.operasional.bensinTersedia = parseFloat(jumlahLiter);

    // Simpan detail fuel data
    if (!perizinan.fuelData) {
      perizinan.fuelData = [];
    }

    const fuelEntry = {
      id: Date.now().toString(),
      jenisBahanBakar,
      jumlahLiter: parseFloat(jumlahLiter),
      hargaPerLiter: parseFloat(hargaPerLiter),
      totalHarga: parseFloat(totalHarga),
      tanggalPengisian: new Date(tanggalPengisian),
      lokasiPengisian,
      keterangan,
      buktiFileUrl,
      uploadedAt: new Date(),
      uploadedBy: userId
    };

    perizinan.fuelData.push(fuelEntry);

    trip.perizinan = perizinan;
    trip.changed('perizinan', true);
    await trip.save();

    console.log('✅ [ABK FUEL DATA] Saved - Fuel:', jumlahLiter, 'L');

    // Real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('fuel_data_updated', {
        tripId, fuelData: fuelEntry, uploadedBy: userId
      });
    }

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diupload',
      data: {
        tripId: parseInt(tripId),
        kapal: trip.kapal ? {
          id: trip.kapal.id,
          namaKapal: trip.kapal.namaKapal
        } : null,
        fuelData: fuelEntry,
        operasional: perizinan.operasional
      }
    });
  } catch (error) {
    console.error('❌ [ABK FUEL DATA] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload data bahan bakar: ' + error.message
    });
  }
});

// Upload ice data by Trip (ABK only)
router.post('/trip/:tripId/ice-data', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
      }
    }
  }).any();

  upload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { role, userId } = req.user;
    const {
      jenisEs, jumlahKg, hargaPerKg,
      totalHarga, tanggalPembelian, lokasiPembelian, keterangan
    } = req.body;

    console.log('🧊 [ABK ICE DATA] Request - Trip:', tripId, 'User:', userId);

    // Hanya ABK yang bisa upload
    if (role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya ABK yang bisa mengupload data es'
      });
    }

    // Validasi input
    if (!jenisEs || !jumlahKg || !hargaPerKg || !totalHarga || !tanggalPembelian) {
      return res.status(400).json({
        success: false,
        message: 'Data es tidak lengkap (jenisEs, jumlahKg, hargaPerKg, totalHarga, tanggalPembelian wajib diisi)'
      });
    }

    // Cari trip
    const trip = await Trip.findByPk(tripId, {
      include: [{
        model: Kapal,
        as: 'kapal',
        attributes: ['id', 'namaKapal', 'nomorRegistrasi']
      }]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    // Verifikasi ABK ditugaskan ke trip ini
    const isAssigned = trip.awakKapal && trip.awakKapal.includes(userId);
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak ditugaskan ke trip ini'
      });
    }

    // Handle File Upload
    let buktiFileUrl = null;
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Ambil file pertama (field 'bukti')
      const uploadDir = path.join(__dirname, `../../uploads/ice-data/${tripId}`);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${crypto.createHash('md5').update(file.originalname).digest('hex')}${path.extname(file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      buktiFileUrl = `/uploads/ice-data/${tripId}/${fileName}`;
    }

    // Update perizinan.operasional dengan data ice
    let perizinan = trip.perizinan || {};
    if (!perizinan.operasional) {
      perizinan.operasional = {
        kapasitasBensin: 0,
        bensinTersedia: 0,
        kapasitasEs: 0,
        esTersedia: 0
      };
    }

    // Update es tersedia
    perizinan.operasional.esTersedia = parseFloat(jumlahKg);

    // Simpan detail ice data
    if (!perizinan.iceData) {
      perizinan.iceData = [];
    }

    const iceEntry = {
      id: Date.now().toString(),
      jenisEs,
      jumlahKg: parseFloat(jumlahKg),
      hargaPerKg: parseFloat(hargaPerKg),
      totalHarga: parseFloat(totalHarga),
      tanggalPembelian: new Date(tanggalPembelian),
      lokasiPembelian,
      keterangan,
      buktiFileUrl,
      uploadedAt: new Date(),
      uploadedBy: userId
    };

    perizinan.iceData.push(iceEntry);

    trip.perizinan = perizinan;
    trip.changed('perizinan', true);
    await trip.save();

    console.log('✅ [ABK ICE DATA] Saved - Ice:', jumlahKg, 'kg');

    // Real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('ice_data_updated', {
        tripId, iceData: iceEntry, uploadedBy: userId
      });
    }

    res.json({
      success: true,
      message: 'Data es berhasil diupload',
      data: {
        tripId: parseInt(tripId),
        kapal: trip.kapal ? {
          id: trip.kapal.id,
          namaKapal: trip.kapal.namaKapal
        } : null,
        iceData: iceEntry,
        operasional: perizinan.operasional
      }
    });
  } catch (error) {
    console.error('❌ [ABK ICE DATA] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload data es: ' + error.message
    });
  }
});

// Start trip

router.patch('/trip/:tripId/start', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { role } = req.user;

    if (role !== 'nahkoda') {
      return res.status(403).json({ success: false, message: 'Hanya nahkoda yang bisa memulai trip' });
    }

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    if (trip.status !== 'disetujui') {
      return res.status(400).json({ success: false, message: 'Trip belum disetujui' });
    }

    await trip.update({ status: 'sedang_melaut', tanggalBerangkat: new Date() });

    res.json({
      success: true,
      message: 'Trip berhasil dimulai',
      data: { tripId: trip.id, status: 'sedang_melaut' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete trip
router.patch('/trip/:tripId/complete', authenticate, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { role } = req.user;
    const { catatan } = req.body;

    if (role !== 'nahkoda') {
      return res.status(403).json({ success: false, message: 'Hanya nahkoda yang bisa menyelesaikan trip' });
    }

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    if (trip.status !== 'sedang_melaut') {
      return res.status(400).json({ success: false, message: 'Trip tidak dalam status berlayar' });
    }

    await trip.update({
      status: 'selesai',
      tanggalKembali: new Date(),
      catatan
    });

    res.json({
      success: true,
      message: 'Trip berhasil diselesaikan',
      data: {
        tripId: trip.id,
        totalBerat: 0,
        totalNilai: 0,
        durasi: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete profile document
router.delete('/profile/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.user;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const filteredDokumen = dokumen.filter(doc => doc.id !== documentId);

    await user.update({ dokumen: filteredDokumen });

    res.json({
      success: true,
      message: 'Dokumen berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update fuel data
router.put('/vessel/:kapalId/bahan-bakar/:fuelId', authenticate, async (req, res) => {
  try {
    const { kapalId, fuelId } = req.params;
    const { jenisBahanBakar, jumlahLiter, hargaPerLiter, totalHarga } = req.body;

    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
    }

    const fuelData = vessel.dataBahanBakar || [];
    const fuelIndex = fuelData.findIndex(f => f.id === fuelId);

    if (fuelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Data bahan bakar tidak ditemukan' });
    }

    fuelData[fuelIndex] = {
      ...fuelData[fuelIndex],
      jenisBahanBakar,
      jumlahLiter: parseFloat(jumlahLiter),
      hargaPerLiter: parseFloat(hargaPerLiter),
      totalHarga: parseFloat(totalHarga),
      updatedAt: new Date(),
      updatedBy: req.user.userId
    };

    await vessel.update({ dataBahanBakar: fuelData });

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diperbarui',
      data: fuelData[fuelIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug upload endpoint
router.post('/vessel/:kapalId/debug-upload', authenticate, async (req, res) => {
  try {
    const { kapalId } = req.params;

    res.json({
      success: true,
      message: 'DEBUG ENDPOINT WORKS!',
      received: {
        params: req.params,
        body: req.body,
        hasFile: !!req.files
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get pending documents
router.get('/profile/admin/pending-documents', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa mengakses' });
    }

    const users = await User.findAll({
      where: { role: ['nahkoda', 'abk'] },
      attributes: ['id', 'username', 'email', 'nama', 'role', 'dokumen']
    });

    const pendingUsers = users.filter(user => {
      const dokumen = user.dokumen || [];
      return dokumen.some(doc => doc.status === 'pending');
    }).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nama: user.nama,
      role: user.role,
      pendingDocuments: (user.dokumen || []).filter(doc => doc.status === 'pending')
    }));

    res.json({
      success: true,
      data: pendingUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Approve user document
router.patch('/profile/admin/users/:userId/documents/:documentId/approve', authenticate, async (req, res) => {
  try {
    const { role, userId: adminId } = req.user;
    const { userId, documentId } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menyetujui' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const docIndex = dokumen.findIndex(doc => doc.id === documentId);

    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    dokumen[docIndex].status = 'approved';
    dokumen[docIndex].verifiedAt = new Date();
    dokumen[docIndex].verifiedBy = adminId;

    await user.update({ dokumen });

    res.json({
      success: true,
      message: 'Dokumen berhasil disetujui'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Reject user document
router.patch('/profile/admin/users/:userId/documents/:documentId/reject', authenticate, async (req, res) => {
  try {
    const { role, userId: adminId } = req.user;
    const { userId, documentId } = req.params;
    const { reason } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menolak' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const docIndex = dokumen.findIndex(doc => doc.id === documentId);

    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    dokumen[docIndex].status = 'rejected';
    dokumen[docIndex].rejectionReason = reason;
    dokumen[docIndex].verifiedAt = new Date();
    dokumen[docIndex].verifiedBy = adminId;

    await user.update({ dokumen });

    res.json({
      success: true,
      message: 'Dokumen ditolak'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// AI Fish Prediction for Mobile
// ==========================================
const aiController = require('../controllers/aiController');

router.post('/predict-fish', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }).single('image');

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error in mobile AI predict:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, aiController.predictFish);

module.exports = router;
