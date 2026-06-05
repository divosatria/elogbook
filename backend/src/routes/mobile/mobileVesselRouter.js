const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

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

module.exports = router;
