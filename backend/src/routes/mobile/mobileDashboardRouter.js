const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

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

module.exports = router;
