const express = require('express');
const router = express.Router();
const emergencyService = require('../../services/notification/emergencyService');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../../middleware/auth/auth');
const Trip = require('../../models/trip/Trip');
const User = require('../../models/auth/User');

// Create SOS alert
router.post('/', authenticate, async (req, res) => {
  try {
    const { vesselId, latitude, longitude, jenisEmergency, deskripsi } = req.body;
    const Emergency = require('../../models/notification/Emergency');

    const emergency = await Emergency.create({
      vesselId,
      location: { latitude, longitude },
      type: jenisEmergency || 'SOS',
      note: deskripsi || 'Sinyal darurat dari kapal',
      status: 'active'
    });

    // Emit real-time alert via Socket.IO
    // Emit real-time alert via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Fetch vessel details for complete alert data
      const Kapal = require('../../models/vessel/Kapal');
      const vessel = await Kapal.findByPk(vesselId);
      
      const normalizedAlert = {
        _id: emergency.id,
        id: emergency.id,
        vesselId: emergency.vesselId,
        vesselName: vessel ? vessel.namaKapal : 'Unknown Vessel',
        timestamp: emergency.createdAt,
        location: {
          lat: emergency.location?.latitude || 0,
          lng: emergency.location?.longitude || 0
        },
        note: emergency.note,
        resolved: emergency.status === 'resolved',
        status: emergency.status,
        emergencyType: emergency.type
      };

      io.emit('emergency_alert', normalizedAlert);
      io.emit('sos_alert', normalizedAlert);
    }

    res.status(201).json({ 
      success: true,
      message: 'SOS berhasil dibuat',
      data: emergency
    });
  } catch (error) {
    console.error('❌ Create SOS Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat SOS: ' + error.message 
    });
  }
});

// Get emergency alerts — semua web roles
router.get('/', authenticate, authorize(ALL_WEB), async (req, res) => {
  try {
    const Emergency = require('../../models/notification/Emergency');
    const Kapal = require('../../models/vessel/Kapal');

    const alerts = await Emergency.findAll({
      include: [
        {
          model: Kapal,
          as: 'vessel',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi'],
          include: [
            {
              model: User,
              as: 'nahkoda',
              attributes: ['id', 'nama', 'noTelepon']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform data for frontend
    const transformedAlerts = alerts.map(alert => ({
      _id: alert.id,
      vesselId: alert.vessel?.nomorRegistrasi || alert.vesselId,
      vesselName: alert.vessel?.namaKapal || 'Unknown Vessel',
      timestamp: alert.createdAt,
      location: {
        lat: alert.location.latitude,
        lng: alert.location.longitude
      },
      note: alert.note || 'Emergency alert',
      resolved: alert.status === 'resolved',
      nahkoda: alert.vessel?.nahkoda ? {
        nama: alert.vessel.nahkoda.nama,
        noTelepon: alert.vessel.nahkoda.noTelepon
      } : null
    }));

    res.json({
      success: true,
      data: transformedAlerts
    });

  } catch (error) {
    console.error('❌ Get Emergency Alerts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency alerts',
      error: error.message
    });
  }
});

// Send emergency alert
router.post('/alert', authenticate, async (req, res) => {
  try {
    const { tripId, location, message, emergencyType = 'SOS' } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID is required'
      });
    }

    // Verify user is part of the trip
    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama', 'noTelepon']
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user is nahkoda or crew member of this trip
    const user = await User.findByPk(userId);
    const isAuthorized = trip.nahkodaId === userId || 
                        (trip.awakKapal && trip.awakKapal.some(crew => crew.userId === userId));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to send emergency alerts for this trip'
      });
    }

    // Send emergency alert
    const results = await emergencyService.sendEmergencyAlert({
      tripId,
      userId,
      location,
      message,
      emergencyType
    });

    // Update trip status to emergency
    await trip.update({ status: 'darurat' });

    res.json({
      success: true,
      message: 'Emergency alert sent successfully',
      data: {
        tripId,
        emergencyType,
        nahkoda: trip.nahkoda?.nama,
        notificationResults: results
      }
    });

  } catch (error) {
    console.error('❌ Emergency Alert API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency alert',
      error: error.message
    });
  }
});

// Test emergency notification
router.post('/test', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for testing'
      });
    }

    // Only allow admin to test
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can test emergency notifications'
      });
    }

    const results = await emergencyService.testEmergencyNotification(
      phoneNumber, 
      message || 'Test emergency notification from E-Logbook system'
    );

    res.json({
      success: true,
      message: 'Emergency notification test completed',
      data: results
    });

  } catch (error) {
    console.error('❌ Emergency Test API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test emergency notification',
      error: error.message
    });
  }
});

// Get emergency configuration status
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      smsEnabled: !!process.env.TWILIO_PHONE_NUMBER,
      whatsappEnabled: !!process.env.TWILIO_WHATSAPP_NUMBER,
      emergencyTypes: ['SOS', 'MEDICAL', 'FIRE', 'COLLISION', 'ENGINE_FAILURE', 'WEATHER']
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('❌ Emergency Config API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency configuration',
      error: error.message
    });
  }
});

// Resolve SOS — admin + operator
router.patch('/:id/resolve', authenticate, authorize(ADMIN_OPERATOR), async (req, res) => {
  try {
    const { id } = req.params;
    const Emergency = require('../../models/notification/Emergency');
    const Trip = require('../../models/trip/Trip');

    const emergency = await Emergency.findByPk(id);

    if (!emergency) {
      return res.status(404).json({ 
        success: false,
        message: 'SOS tidak ditemukan' 
      });
    }

    await emergency.update({
      status: 'resolved',
      resolvedAt: new Date()
    });

    // Update Trip status back to 'sedang_melaut'
    const activeTrip = await Trip.findOne({
      where: {
        kapalId: emergency.vesselId,
        status: 'darurat'
      }
    });

    if (activeTrip) {
      console.log(`[ResolveSOS] Reverting trip ${activeTrip.id} status to 'sedang_melaut'`);
      await activeTrip.update({ status: 'sedang_melaut' });
    } else {
      console.warn(`[ResolveSOS] No 'darurat' trip found for vessel ${emergency.vesselId} to revert`);
    }

    // Emit real-time update to map
    const io = req.app.get('io');
    if (io) {
      io.emit('vessel_status_update', {
        vesselId: emergency.vesselId,
        status: 'sedang_melaut'
      });
      
      // Also emit resolved alert to remove marker
      io.emit('emergency_resolved', {
        id: emergency.id,
        vesselId: emergency.vesselId
      });
    }

    res.json({ 
      success: true,
      message: 'SOS berhasil diselesaikan',
      data: emergency
    });
  } catch (error) {
    console.error('❌ Resolve SOS Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menyelesaikan SOS: ' + error.message 
    });
  }
});

module.exports = router;