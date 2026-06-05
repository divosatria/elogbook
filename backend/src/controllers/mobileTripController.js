const { Trip, Kapal, User } = require('../models');
const { sequelize } = require('../config/database');

const mobileTripController = {
  // GET /api/mobile/trip/:tripId/readiness - Check trip readiness
  async checkReadiness(req, res) {
    try {
      const { tripId } = req.params;
      const trip = await Trip.findByPk(tripId, {
        include: [{ model: Kapal, as: 'kapal' }]
      });

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      // Check nahkoda documents
      const nahkoda = await User.findByPk(trip.nahkodaId);
      const nahkodaDocs = nahkoda.dokumen || [];
      const personalDocsComplete = ['KTP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST'].every(
        doc => nahkodaDocs.some(d => d.jenisDokumen === doc)
      );

      // Check vessel documents
      const vesselDocs = trip.kapal.sertifikatJalan || [];
      const vesselDocsComplete = vesselDocs.length > 0;

      // Check fuel data
      const fuelData = trip.kapal.dataBahanBakar || [];
      const fuelDataComplete = fuelData.length > 0;

      // Check ice data (temporary: mark as complete if no ice data required)
      const iceData = trip.kapal.dataEs || [];
      const iceDataComplete = true; // Temporarily set to true until ice data endpoints are implemented

      // Check storage data
      const storageData = trip.kapal.storageData || [];
      const storageDataComplete = storageData.length > 0;

      const ready = personalDocsComplete && vesselDocsComplete && fuelDataComplete && iceDataComplete && storageDataComplete && trip.status === 'disetujui';

      res.json({
        success: true,
        data: {
          ready,
          status: trip.status,
          checklist: {
            personalDocs: personalDocsComplete,
            vesselDocs: vesselDocsComplete,
            fuelData: fuelDataComplete,
            iceData: iceDataComplete,
            storageData: storageDataComplete,
            approved: trip.status === 'disetujui'
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PATCH /api/mobile/trip/:tripId/start - Start trip
  async startTrip(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { tripId } = req.params;
      const trip = await Trip.findByPk(tripId);

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      if (trip.nahkodaId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Hanya nahkoda yang bisa memulai trip' });
      }

      if (trip.status !== 'disetujui') {
        return res.status(400).json({ success: false, message: 'Trip belum disetujui' });
      }

      await trip.update({
        status: 'sedang_melaut',
        laporan: { ...trip.laporan, startedAt: new Date() }
      }, { transaction });

      await transaction.commit();

      // Emit to admin dashboard
      req.app.get('io').emit('trip_started', { tripId: trip.id, kapalId: trip.kapalId });

      res.json({
        success: true,
        message: 'Trip dimulai',
        data: trip
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // PATCH /api/mobile/trip/:tripId/complete - Complete trip
  async completeTrip(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { tripId } = req.params;
      const { catatan } = req.body;
      const trip = await Trip.findByPk(tripId);

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
      }

      if (trip.nahkodaId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Hanya nahkoda yang bisa menyelesaikan trip' });
      }

      if (trip.status !== 'sedang_melaut') {
        return res.status(400).json({ success: false, message: 'Trip tidak dalam status sedang melaut' });
      }

      // Calculate total catch
      const { HasilTangkap } = require('../models');
      const catches = await HasilTangkap.findAll({
        where: { tripId: trip.id },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('beratKg')), 'totalBerat'],
          [sequelize.fn('SUM', sequelize.col('totalHarga')), 'totalNilai']
        ]
      });

      const totalBerat = parseFloat(catches[0]?.dataValues.totalBerat || 0);
      const totalNilai = parseFloat(catches[0]?.dataValues.totalNilai || 0);

      await trip.update({
        status: 'selesai',
        tanggalPulangAktual: new Date(),
        beratAktual: totalBerat,
        laporan: {
          ...trip.laporan,
          completedAt: new Date(),
          totalBerat,
          totalNilai,
          catatan
        }
      }, { transaction });

      await transaction.commit();

      // Emit to admin dashboard
      req.app.get('io').emit('trip_completed', { tripId: trip.id, totalBerat, totalNilai });

      res.json({
        success: true,
        message: 'Trip selesai',
        data: {
          tripId: trip.id,
          totalBerat,
          totalNilai,
          durasi: trip.durasi
        }
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = mobileTripController;
