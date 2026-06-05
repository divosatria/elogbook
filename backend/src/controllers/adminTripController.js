const { Trip, Kapal, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const adminTripController = {
  // POST /api/admin/trip - Create trip with ABK assignment
  async createTrip(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { kapalId, nahkodaId, abkIds, tanggalBerangkat, estimasiPulang, targetIkan, areaTangkap } = req.body;

      // Validate kapal exists
      const kapal = await Kapal.findByPk(kapalId);
      if (!kapal) {
        return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
      }

      // Validate nahkoda exists and has correct role
      const nahkoda = await User.findByPk(nahkodaId);
      if (!nahkoda || nahkoda.role !== 'nahkoda') {
        return res.status(400).json({ success: false, message: 'Nahkoda tidak valid' });
      }

      // Validate ABK array
      if (abkIds && abkIds.length > 0) {
        const abkUsers = await User.findAll({ where: { id: abkIds, role: 'abk' } });
        if (abkUsers.length !== abkIds.length) {
          return res.status(400).json({ success: false, message: 'Beberapa ABK tidak valid' });
        }
      }

      // Calculate duration
      const start = new Date(tanggalBerangkat);
      const end = new Date(estimasiPulang);
      const durasi = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      const trip = await Trip.create({
        kapalId,
        nahkodaId,
        awakKapal: abkIds || [],
        tanggalBerangkat,
        estimasiPulang,
        durasi,
        targetIkan: targetIkan || null,
        areaTangkap: areaTangkap || null,
        status: 'menunggu_dokumen'
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Trip berhasil dibuat',
        data: trip
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating trip:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/admin/trips/pending - Get trips waiting for approval
  async getPendingTrips(req, res) {
    try {
      const trips = await Trip.findAll({
        where: { status: { [Op.in]: ['menunggu_dokumen', 'menunggu_izin'] } },
        include: [
          { model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorRegistrasi'] },
          { model: User, as: 'nahkoda', attributes: ['id', 'nama', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: trips });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/admin/trip/:tripId/documents - Check document completeness
  async checkDocuments(req, res) {
    try {
      const { tripId } = req.params;
      const trip = await Trip.findByPk(tripId, {
        include: [
          { model: Kapal, as: 'kapal' },
          { model: User, as: 'nahkoda' }
        ]
      });

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      // Check nahkoda documents
      const nahkoda = await User.findByPk(trip.nahkodaId);
      const nahkodaDocs = nahkoda.dokumen || [];
      const requiredDocs = ['KTP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST', 'Surat Keterangan Sehat'];
      const nahkodaComplete = requiredDocs.every(doc => nahkodaDocs.some(d => d.jenisDokumen === doc));

      // Check ABK documents
      const abkIds = trip.awakKapal || [];
      let abkComplete = true;
      const abkStatus = [];
      
      for (const abkId of abkIds) {
        const abk = await User.findByPk(abkId);
        const abkDocs = abk?.dokumen || [];
        const complete = ['KTP', 'Buku Pelaut', 'BST'].every(doc => abkDocs.some(d => d.jenisDokumen === doc));
        abkComplete = abkComplete && complete;
        abkStatus.push({ id: abkId, nama: abk?.nama, complete });
      }

      // Check vessel documents
      const kapal = trip.kapal;
      const vesselDocs = kapal.sertifikatJalan || [];
      const vesselComplete = vesselDocs.length > 0;

      // Check fuel data
      const fuelData = kapal.dataBahanBakar || [];
      const fuelComplete = fuelData.length > 0;

      // Check ice data (temporary: mark as complete if no ice data required)
      const iceData = kapal.dataEs || [];
      const iceComplete = true; // Temporarily set to true until ice data endpoints are implemented

      // Check storage data
      const storageData = kapal.storageData || [];
      const storageComplete = storageData.length > 0;

      const allComplete = nahkodaComplete && abkComplete && vesselComplete && fuelComplete && iceComplete && storageComplete;

      res.json({
        success: true,
        data: {
          tripId: trip.id,
          ready: allComplete,
          checklist: {
            nahkodaDocs: nahkodaComplete,
            abkDocs: abkComplete,
            vesselDocs: vesselComplete,
            fuelData: fuelComplete,
            iceData: iceComplete,
            storageData: storageComplete
          },
          details: {
            nahkoda: { id: nahkoda.id, nama: nahkoda.nama, complete: nahkodaComplete },
            abk: abkStatus,
            vessel: { complete: vesselComplete, count: vesselDocs.length },
            fuel: { complete: fuelComplete, count: fuelData.length },
            ice: { complete: iceComplete, count: iceData.length },
            storage: { complete: storageComplete, count: storageData.length }
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PATCH /api/admin/trip/:tripId/approve - Approve trip
  async approveTrip(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { tripId } = req.params;
      const trip = await Trip.findByPk(tripId);

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      if (trip.status !== 'menunggu_dokumen' && trip.status !== 'menunggu_izin') {
        return res.status(400).json({ success: false, message: 'Trip tidak dalam status menunggu approval' });
      }

      await trip.update({ status: 'disetujui' }, { transaction });
      await transaction.commit();

      // Emit notification via Socket.IO
      req.app.get('io').emit('trip_approved', { tripId: trip.id, nahkodaId: trip.nahkodaId });

      res.json({
        success: true,
        message: 'Trip berhasil disetujui',
        data: trip
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PATCH /api/admin/trip/:tripId/reject - Reject trip
  async rejectTrip(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { tripId } = req.params;
      const { alasan } = req.body;
      const trip = await Trip.findByPk(tripId);

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      await trip.update({ 
        status: 'ditolak',
        laporan: { ...trip.laporan, alasanDitolak: alasan, ditolakAt: new Date() }
      }, { transaction });
      
      await transaction.commit();

      res.json({
        success: true,
        message: 'Trip ditolak',
        data: trip
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/admin/live-monitoring - Real-time monitoring
  async liveMonitoring(req, res) {
    try {
      const activeTrips = await Trip.findAll({
        where: { status: 'sedang_melaut' },
        include: [
          { model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal'] }
        ]
      });

      const { HasilTangkap } = require('../models');
      const monitoring = await Promise.all(activeTrips.map(async (trip) => {
        const catches = await HasilTangkap.findAll({
          where: { tripId: trip.id },
          attributes: [[sequelize.fn('SUM', sequelize.col('berat_kg')), 'totalBerat']]
        });

        // Get nahkoda data separately
        const nahkoda = await User.findByPk(trip.nahkodaId, { attributes: ['id', 'nama'] });

        return {
          tripId: trip.id,
          kapal: trip.kapal?.namaKapal,
          nahkoda: nahkoda?.nama || 'Unknown',
          status: trip.status,
          tanggalBerangkat: trip.tanggalBerangkat,
          totalCatch: parseFloat(catches[0]?.dataValues.totalBerat || 0),
          location: trip.currentLocation || null
        };
      }));

      res.json({
        success: true,
        data: {
          activeTrips: monitoring,
          totalActiveTrips: activeTrips.length,
          totalCatch: monitoring.reduce((sum, t) => sum + t.totalCatch, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminTripController;
