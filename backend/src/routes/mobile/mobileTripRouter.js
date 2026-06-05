const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

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

module.exports = router;
