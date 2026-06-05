const TripTask = require('../models/TripTask');
const Trip = require('../models/Trip');
const { User } = require('../models');
const VesselCrew = require('../models/VesselCrew');
const MobileNotificationService = require('../services/mobileNotificationService');

// Get all trip tasks
exports.getAllTripTasks = async (req, res) => {
  try {
    console.log('📋 Mengambil semua tugas trip...');
    
    const tasks = await TripTask.findAll({
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'namaTrip', 'kapalId', 'tanggalBerangkat']
        },
        {
          model: User,
          as: 'completedByUser',
          attributes: ['id', 'nama', 'username']
        },
        {
          model: require('../models/CatchPolygon'),
          as: 'catchPolygon',
          attributes: ['id', 'name', 'zoneType'],
          required: false
        },
        {
          model: require('../models/Kapal'),
          as: 'vessel',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi'],
          required: false
        },
        {
          model: User,
          as: 'assignedNahkoda',
          attributes: ['id', 'nama', 'username'],
          required: false
        }
      ],
      order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
    });
    
    console.log(`📊 Ditemukan ${tasks.length} tugas trip`);
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('❌ Error mengambil tugas trip:', error);
    res.status(500).json({ message: 'Gagal memuat tugas trip' });
  }
};

// Get trip tasks by trip ID
exports.getTripTasksByTripId = async (req, res) => {
  try {
    const { tripId } = req.params;
    console.log('📋 Mengambil tugas untuk trip:', tripId);
    
    const tasks = await TripTask.findAll({
      where: { tripId },
      include: [
        {
          model: User,
          as: 'completedByUser',
          attributes: ['id', 'nama', 'username']
        }
      ],
      order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
    });
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('❌ Error mengambil tugas trip:', error);
    res.status(500).json({ message: 'Gagal memuat tugas trip' });
  }
};

// Create trip task
exports.createTripTask = async (req, res) => {
  try {
    console.log('🆕 Membuat tugas trip baru:', req.body);
    
    const {
      tripId,
      taskTitle,
      taskDescription,
      taskType,
      assignedTo,
      scheduledDate,
      scheduledTime,
      priority,
      catchPolygonId,
      catchPolygonIds,
      locationNotes,
      vesselId,
      nahkodaId,
      abkIds,
      harborZoneId
    } = req.body;
    
    // Validate trip exists (only if tripId provided)
    if (tripId) {
      const trip = await Trip.findByPk(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip tidak ditemukan' });
      }
    }
    
    const taskData = {
      tripId: tripId || null,
      taskTitle,
      taskDescription,
      taskType: taskType || 'preparation',
      assignedTo: assignedTo || 'all',
      scheduledDate,
      scheduledTime,
      priority: priority || 'medium',
      catchPolygonId: catchPolygonId || null,
      catchPolygonIds: catchPolygonIds || null,
      locationNotes: locationNotes || null,
      vesselId: vesselId || null,
      nahkodaId: nahkodaId || null,
      abkIds: abkIds || null,
      harborZoneId: harborZoneId || null,
      createdBy: req.user?.id
    };
    
    const task = await TripTask.create(taskData);
    
    // Send notifications to assigned crew
    const io = req.app.get('io');
    if (io) {
      const notificationService = new MobileNotificationService(io);
      await notificationService.sendTaskNotification(task.id, 'created');
    }
    
    // Send email notifications to crew
    try {
      const emailService = require('../services/emailService');
      
      // Get vessel crew for email notifications
      const vesselCrew = await VesselCrew.findAll({
        where: { 
          kapalId: task.vesselId, 
          isActive: true 
        },
        include: [{ 
          model: User, 
          as: 'User',
          attributes: ['id', 'nama', 'email', 'role']
        }]
      });
      
      // Send emails to assigned crew members
      for (const crew of vesselCrew) {
        if (crew.User && crew.User.email && shouldNotifyUser(task, crew)) {
          await emailService.sendTaskNotificationEmail(
            crew.User.email,
            crew.User.nama,
            {
              taskTitle: task.taskTitle,
              taskDescription: task.taskDescription,
              scheduledDate: task.scheduledDate,
              scheduledTime: task.scheduledTime,
              priority: task.priority,
              vesselName: trip?.kapal?.namaKapal || 'Kapal tidak diketahui'
            }
          );
          console.log(`📧 Email tugas terkirim ke ${crew.User.nama} (${crew.User.email})`);
        }
      }

      // Special email notification for trip schedule to nahkoda
      if (task.nahkodaId && task.taskType === 'departure') {
        try {
          const nahkoda = await User.findByPk(task.nahkodaId, {
            attributes: ['nama', 'email']
          });

          if (nahkoda && nahkoda.email) {
            await emailService.sendTripScheduleEmail(
              nahkoda.email,
              nahkoda.nama,
              {
                vesselName: trip?.kapal?.namaKapal || 'Kapal tidak diketahui',
                scheduledDate: task.scheduledDate,
                scheduledTime: task.scheduledTime,
                taskTitle: task.taskTitle,
                taskDescription: task.taskDescription,
                locationNotes: task.locationNotes,
                priority: task.priority
              }
            );
            console.log(`📧 Email jadwal trip otomatis terkirim ke nahkoda: ${nahkoda.email}`);
          }
        } catch (scheduleEmailError) {
          console.error('⚠️ Error mengirim email jadwal trip ke nahkoda:', scheduleEmailError);
        }
      }
    } catch (emailError) {
      console.error('⚠️ Error mengirim email tugas:', emailError);
    }
    
    console.log('✅ Tugas trip berhasil dibuat:', task.id);
    res.status(201).json({
      success: true,
      message: 'Tugas trip berhasil dibuat',
      data: task
    });
  } catch (error) {
    console.error('❌ Error membuat tugas trip:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update trip task
exports.updateTripTask = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Memperbarui tugas trip:', id);
    
    const task = await TripTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Tugas trip tidak ditemukan' });
    }
    
    await task.update(req.body);
    
    console.log('✅ Tugas trip berhasil diperbarui');
    res.json({
      success: true,
      message: 'Tugas trip berhasil diperbarui',
      data: task
    });
  } catch (error) {
    console.error('❌ Error memperbarui tugas trip:', error);
    res.status(400).json({ message: error.message });
  }
};

// Complete trip task
exports.completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    console.log('✅ Menyelesaikan tugas trip:', id);
    
    const task = await TripTask.findByPk(id, {
      include: [{ model: Trip, as: 'trip' }]
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tugas trip tidak ditemukan' });
    }
    
    await task.update({
      status: 'completed',
      completedAt: new Date(),
      completedBy: req.user?.id,
      notes: notes || null
    });
    
    // Send completion notification
    const io = req.app.get('io');
    if (io) {
      const notificationService = new MobileNotificationService(io);
      await notificationService.sendTaskNotification(task.id, 'completed');
    }
    
    console.log('✅ Tugas trip berhasil diselesaikan');
    res.json({
      success: true,
      message: 'Tugas berhasil diselesaikan',
      data: task
    });
  } catch (error) {
    console.error('❌ Error menyelesaikan tugas:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete trip task
exports.deleteTripTask = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Menghapus tugas trip:', id);
    
    const task = await TripTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Tugas trip tidak ditemukan' });
    }
    
    await task.destroy();
    
    console.log('✅ Tugas trip berhasil dihapus');
    res.json({
      success: true,
      message: 'Tugas trip berhasil dihapus'
    });
  } catch (error) {
    console.error('❌ Error menghapus tugas trip:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get pending tasks for mobile (by user)
exports.getPendingTasksForUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('📱 Mengambil tugas pending untuk user:', userId);
    
    // Get user's vessel assignments
    const userCrews = await VesselCrew.findAll({
      where: { userId, isActive: true }
    });
    
    const vesselIds = userCrews.map(crew => crew.kapalId);
    
    // Get trips for user's vessels
    const trips = await Trip.findAll({
      where: { kapalId: vesselIds },
      attributes: ['id']
    });
    
    const tripIds = trips.map(trip => trip.id);
    
    // Get pending tasks for these trips
    const tasks = await TripTask.findAll({
      where: {
        tripId: tripIds,
        status: 'pending',
        scheduledDate: {
          [require('sequelize').Op.gte]: new Date()
        }
      },
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'namaTrip', 'kapalId']
        }
      ],
      order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
    });
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('❌ Error mengambil tugas pending:', error);
    res.status(500).json({ message: 'Gagal memuat tugas pending' });
  }
};

// Helper function to check if user should be notified
const shouldNotifyUser = (task, crew) => {
  if (task.assignedTo === 'all') return true;
  if (task.assignedTo === 'nahkoda' && crew.User.role === 'nahkoda') return true;
  if (task.assignedTo === 'abk' && crew.User.role === 'abk') return true;
  return false;
};

module.exports = exports;