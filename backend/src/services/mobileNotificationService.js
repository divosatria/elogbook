const TripTask = require('../models/TripTask');
const { User, VesselCrew } = require('../models');

class MobileNotificationService {
  constructor(io) {
    this.io = io;
  }

  // Send task notification to mobile users
  async sendTaskNotification(taskId, action = 'created') {
    try {
      const task = await TripTask.findByPk(taskId, {
        include: [
          {
            model: require('../models/Trip'),
            as: 'trip',
            include: [
              {
                model: require('../models/Kapal'),
                as: 'kapal'
              }
            ]
          },
          {
            model: require('../models/CatchPolygon'),
            as: 'catchPolygon',
            attributes: ['id', 'name', 'zoneType'],
            required: false
          }
        ]
      });

      if (!task || !task.trip) return;

      // Get vessel crew
      const vesselCrew = await VesselCrew.findAll({
        where: { 
          kapalId: task.trip.kapalId, 
          isActive: true 
        },
        include: [{ 
          model: User, 
          as: 'User',
          attributes: ['id', 'username', 'nama', 'role', 'fcmToken']
        }]
      });

      const notificationData = {
        type: 'trip_task',
        action: action,
        taskId: task.id,
        tripId: task.tripId,
        title: this.getNotificationTitle(action, task),
        message: this.getNotificationMessage(action, task),
        priority: task.priority,
        scheduledDate: task.scheduledDate,
        scheduledTime: task.scheduledTime,
        data: {
          taskTitle: task.taskTitle,
          taskDescription: task.taskDescription,
          taskType: task.taskType,
          vesselName: task.trip.kapal?.namaKapal,
          assignedTo: task.assignedTo,
          catchPolygon: task.catchPolygon ? {
            name: task.catchPolygon.name,
            zoneType: task.catchPolygon.zoneType
          } : null,
          locationNotes: task.locationNotes
        }
      };

      // Send to assigned crew members
      const notifications = [];
      for (const crew of vesselCrew) {
        if (crew.User && this.shouldNotifyUser(task, crew)) {
          // Send via Socket.IO for real-time
          this.io.to(`user_${crew.User.id}`).emit('trip_task_notification', notificationData);
          
          // Store notification for mobile app
          notifications.push({
            userId: crew.User.id,
            ...notificationData
          });

          console.log(`📱 Notifikasi terkirim ke ${crew.User.nama} (${crew.User.role})`);
        }
      }

      // Store notifications in database for offline users
      if (notifications.length > 0) {
        await this.storeNotifications(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('❌ Error mengirim notifikasi tugas:', error);
      throw error;
    }
  }

  // Send trip status notification
  async sendTripStatusNotification(tripId, status, message) {
    try {
      const Trip = require('../models/Trip');
      const trip = await Trip.findByPk(tripId, {
        include: [
          {
            model: require('../models/Kapal'),
            as: 'kapal'
          }
        ]
      });

      if (!trip) return;

      const vesselCrew = await VesselCrew.findAll({
        where: { 
          kapalId: trip.kapalId, 
          isActive: true 
        },
        include: [{ 
          model: User, 
          as: 'User',
          attributes: ['id', 'username', 'nama', 'role']
        }]
      });

      const notificationData = {
        type: 'trip_status',
        tripId: tripId,
        title: `Status Trip Diperbarui`,
        message: `Trip ${trip.namaTrip || 'Anda'} - ${message}`,
        status: status,
        data: {
          tripName: trip.namaTrip,
          vesselName: trip.kapal?.namaKapal,
          newStatus: status
        }
      };

      // Send to all crew members
      for (const crew of vesselCrew) {
        if (crew.User) {
          this.io.to(`user_${crew.User.id}`).emit('trip_status_notification', notificationData);
        }
      }

      console.log(`📱 Notifikasi status trip terkirim ke ${vesselCrew.length} crew`);
      return vesselCrew.length;
    } catch (error) {
      console.error('❌ Error mengirim notifikasi status trip:', error);
      throw error;
    }
  }

  // Send reminder notifications for upcoming tasks
  async sendTaskReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now

      const upcomingTasks = await TripTask.findAll({
        where: {
          status: 'pending',
          reminderSent: false,
          scheduledDate: {
            [require('sequelize').Op.eq]: reminderTime.toISOString().split('T')[0]
          },
          scheduledTime: {
            [require('sequelize').Op.between]: [
              reminderTime.toTimeString().split(' ')[0],
              new Date(reminderTime.getTime() + (60 * 60 * 1000)).toTimeString().split(' ')[0]
            ]
          }
        },
        include: [
          {
            model: require('../models/Trip'),
            as: 'trip',
            include: [
              {
                model: require('../models/Kapal'),
                as: 'kapal'
              }
            ]
          }
        ]
      });

      for (const task of upcomingTasks) {
        await this.sendTaskNotification(task.id, 'reminder');
        await task.update({ reminderSent: true });
      }

      console.log(`📱 Pengingat terkirim untuk ${upcomingTasks.length} tugas`);
      return upcomingTasks.length;
    } catch (error) {
      console.error('❌ Error mengirim pengingat:', error);
      throw error;
    }
  }

  // Helper methods
  shouldNotifyUser(task, crew) {
    if (task.assignedTo === 'all') return true;
    if (task.assignedTo === 'nahkoda' && crew.role === 'nahkoda') return true;
    if (task.assignedTo === 'abk' && crew.role === 'abk') return true;
    return false;
  }

  getNotificationTitle(action, task) {
    switch (action) {
      case 'created':
        return '📋 Tugas Baru';
      case 'updated':
        return '📝 Tugas Diperbarui';
      case 'completed':
        return '✅ Tugas Selesai';
      case 'reminder':
        return '⏰ Pengingat Tugas';
      default:
        return '📱 Notifikasi Trip';
    }
  }

  getNotificationMessage(action, task) {
    const taskTypeLabels = {
      preparation: 'Persiapan',
      departure: 'Keberangkatan',
      fishing: 'Penangkapan',
      return: 'Kepulangan',
      maintenance: 'Perawatan'
    };

    const taskTypeLabel = taskTypeLabels[task.taskType] || task.taskType;

    switch (action) {
      case 'created':
        return `${taskTypeLabel}: ${task.taskTitle} - ${new Date(task.scheduledDate).toLocaleDateString('id-ID')} ${task.scheduledTime}`;
      case 'updated':
        return `Tugas ${task.taskTitle} telah diperbarui`;
      case 'completed':
        return `Tugas ${task.taskTitle} telah diselesaikan`;
      case 'reminder':
        return `Pengingat: ${task.taskTitle} dalam 30 menit`;
      default:
        return task.taskTitle;
    }
  }

  async storeNotifications(notifications) {
    // Store notifications in database for mobile app to fetch
    // This would typically be stored in a Notifications table
    try {
      const Notification = require('../models/Notification');
      const notificationRecords = notifications.map(notif => ({
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: JSON.stringify(notif.data),
        isRead: false,
        createdAt: new Date()
      }));

      await Notification.bulkCreate(notificationRecords);
      console.log(`💾 ${notificationRecords.length} notifikasi disimpan ke database`);
    } catch (error) {
      console.error('❌ Error menyimpan notifikasi:', error);
    }
  }
}

module.exports = MobileNotificationService;