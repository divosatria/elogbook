const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendNotification, markAsRead, getUserNotifications } = require('../services/notificationService');

router.use(authenticate);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const { unreadOnly = false, limit = 20 } = req.query;
    const userId = req.user.userId;
    
    const notifications = await getUserNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat notifikasi: ' + error.message
    });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const notification = await markAsRead(id, userId);
    
    res.json({
      success: true,
      message: 'Notifikasi berhasil ditandai sebagai dibaca',
      data: notification
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai notifikasi sebagai dibaca: ' + error.message
    });
  }
});

// Send notification (admin only)
router.post('/', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya admin yang dapat mengirim notifikasi'
      });
    }
    
    const notificationData = {
      ...req.body,
      dikirimOleh: req.user.userId
    };
    
    const notification = await sendNotification(notificationData);
    
    res.status(201).json({
      success: true,
      message: 'Notifikasi berhasil dikirim',
      data: notification
    });
  } catch (error) {
    console.error('❌ Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim notifikasi: ' + error.message
    });
  }
});

module.exports = router;