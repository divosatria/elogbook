const { Trip, Emergency, Kapal } = require('../../models');

// Emergency Alert
exports.emergencyAlert = async (req, res) => {
  try {
    const { tripId, location, message, emergencyType } = req.body;

    if (!tripId || !location || !message) {
      return res.status(400).json({
        success: false,
        message: 'tripId, location, dan message wajib diisi'
      });
    }

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
};

// SOS Alert
exports.sosAlert = async (req, res) => {
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

    const emergency = await Emergency.create({
      vesselId: kapalId,
      location: location,
      note: note || 'SOS Alert',
      type: jenisEmergency || 'SOS',
      status: 'active',
    });

    const activeTrip = await Trip.findOne({
      where: {
        kapalId: kapalId,
        status: ['sedang_melaut', 'disetujui']
      }
    });

    if (activeTrip) {
      await activeTrip.update({ status: 'darurat' });
    }

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
};
