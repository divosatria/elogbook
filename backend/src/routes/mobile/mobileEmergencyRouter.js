const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

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

module.exports = router;
