const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitSocketEvent } = require('./socketService');

const sendNotification = async ({
  penerima,
  role,
  tipe,
  judul,
  pesan,
  priority = 'medium',
  data,
  dikirimOleh
}) => {
  try {
    let recipients = penerima;

    // Jika tidak ada penerima spesifik, kirim ke semua user dengan role tertentu
    if (!recipients && role) {
      const users = await User.find({ role, isActive: true });
      recipients = users.map(u => u._id);
    }

    const notification = await Notification.create({
      penerima: recipients,
      tipe,
      judul,
      pesan,
      priority,
      data,
      dikirimOleh
    });

    // Send via socket untuk real-time notification
    recipients.forEach(userId => {
      emitSocketEvent(`notification:${userId}`, notification);
    });

    return notification;
  } catch (error) {
    console.error('Notification error:', error);
  }
};

const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notifikasi tidak ditemukan');
    }

    const alreadyRead = notification.dibaca.some(
      r => r.user.toString() === userId.toString()
    );

    if (!alreadyRead) {
      notification.dibaca.push({
        user: userId,
        waktu: new Date()
      });
      await notification.save();
    }

    return notification;
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

const getUserNotifications = async (userId, { unreadOnly = false, limit = 20 }) => {
  try {
    const filter = { penerima: userId };

    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .limit(limit);

    if (unreadOnly) {
      return notifications.filter(n => 
        !n.dibaca.some(r => r.user.toString() === userId.toString())
      );
    }

    return notifications;
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  markAsRead,
  getUserNotifications
};