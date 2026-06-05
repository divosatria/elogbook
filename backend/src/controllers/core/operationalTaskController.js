const OperationalTask = require('../../models/core/OperationalTask');
const CatchPolygon = require('../../models/trip/CatchPolygon');
const Kapal = require('../../models/vessel/Kapal');
const User = require('../../models/auth/User');
const { sequelize } = require('../../config/database');

const operationalTaskController = {
  // Get all operational tasks
  getAllTasks: async (req, res) => {
    try {
      const tasks = await OperationalTask.findAll({
        include: [
          {
            model: CatchPolygon,
            as: 'catchPolygon',
            attributes: ['id', 'name', 'zone_type']
          },
          {
            model: Kapal,
            as: 'vessel',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi']
          },
          {
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'username', 'noTelepon']
          }
        ],
        order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
      });

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching operational tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data tugas operasional'
      });
    }
  },

  // Get task by ID
  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await OperationalTask.findByPk(id, {
        include: [
          {
            model: CatchPolygon,
            as: 'catchPolygon',
            attributes: ['id', 'name', 'zone_type']
          },
          {
            model: Kapal,
            as: 'vessel',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi']
          },
          {
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'username', 'noTelepon']
          }
        ]
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tugas tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data tugas'
      });
    }
  },

  // Create new task
  createTask: async (req, res) => {
    try {
      console.log('📝 Creating operational task with data:', req.body);
      
      const {
        taskTitle,
        taskDescription,
        taskType,
        assignedTo,
        scheduledDate,
        scheduledTime,
        priority,
        catchPolygonId,
        catchPolygonIds, // Multiple zonasi
        vesselId,
        nahkodaId,
        abkIds,
        locationNotes
      } = req.body;

      // Validate required fields
      if (!taskTitle || !scheduledDate || !scheduledTime || !vesselId) {
        console.log('❌ Validation failed - missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Judul tugas, tanggal, waktu, dan kapal wajib diisi'
        });
      }

      // Verify catch polygons exist if provided
      if (catchPolygonIds && Array.isArray(catchPolygonIds) && catchPolygonIds.length > 0) {
        for (const polygonId of catchPolygonIds) {
          const catchPolygon = await CatchPolygon.findByPk(polygonId);
          if (!catchPolygon) {
            console.log(`❌ Catch polygon ${polygonId} not found`);
            return res.status(400).json({
              success: false,
              message: `Zonasi tangkap dengan ID ${polygonId} tidak ditemukan`
            });
          }
        }
      }

      // Backward compatibility - single catch polygon
      if (catchPolygonId && catchPolygonId !== null) {
        const catchPolygon = await CatchPolygon.findByPk(catchPolygonId);
        if (!catchPolygon) {
          console.log(`❌ Catch polygon ${catchPolygonId} not found`);
          return res.status(400).json({
            success: false,
            message: `Zonasi tangkap dengan ID ${catchPolygonId} tidak ditemukan`
          });
        }
      }

      // Verify vessel exists
      const vessel = await Kapal.findByPk(vesselId);
      if (!vessel) {
        console.log(`❌ Vessel ${vesselId} not found`);
        return res.status(400).json({
          success: false,
          message: `Kapal dengan ID ${vesselId} tidak ditemukan`
        });
      }

      console.log('✅ Validation passed, creating task...');
      
      const taskData = {
        taskTitle,
        taskDescription,
        taskType: taskType || 'preparation',
        assignedTo: assignedTo || 'all',
        scheduledDate,
        scheduledTime,
        priority: priority || 'medium',
        catchPolygonId: catchPolygonId || null,
        catchPolygonIds: catchPolygonIds || null, // Multiple zonasi
        vesselId,
        nahkodaId: nahkodaId || null,
        abkIds: abkIds || null,
        locationNotes
      };
      
      console.log('📊 Task data to create:', taskData);
      
      const task = await OperationalTask.create(taskData);
      
      console.log('✅ Task created successfully:', task.id);

      res.status(201).json({
        success: true,
        message: 'Tugas operasional berhasil dibuat',
        data: task
      });
    } catch (error) {
      console.error('❌ Error creating task:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat tugas operasional: ' + error.message
      });
    }
  },

  // Update task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        taskTitle,
        taskDescription,
        taskType,
        assignedTo,
        scheduledDate,
        scheduledTime,
        priority,
        catchPolygonId,
        catchPolygonIds, // Multiple zonasi
        vesselId,
        nahkodaId,
        abkIds,
        locationNotes
      } = req.body;

      const task = await OperationalTask.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tugas tidak ditemukan'
        });
      }

      // Verify catch polygons exist if provided
      if (catchPolygonIds && Array.isArray(catchPolygonIds) && catchPolygonIds.length > 0) {
        for (const polygonId of catchPolygonIds) {
          const catchPolygon = await CatchPolygon.findByPk(polygonId);
          if (!catchPolygon) {
            return res.status(400).json({
              success: false,
              message: `Zonasi tangkap dengan ID ${polygonId} tidak ditemukan`
            });
          }
        }
      }

      // Verify catch polygon exists if provided (backward compatibility)
      if (catchPolygonId) {
        const catchPolygon = await CatchPolygon.findByPk(catchPolygonId);
        if (!catchPolygon) {
          return res.status(400).json({
            success: false,
            message: 'Zonasi tangkap tidak ditemukan'
          });
        }
      }

      // Verify vessel exists if provided
      if (vesselId) {
        const vessel = await Kapal.findByPk(vesselId);
        if (!vessel) {
          return res.status(400).json({
            success: false,
            message: 'Kapal tidak ditemukan'
          });
        }
      }

      await task.update({
        taskTitle: taskTitle || task.taskTitle,
        taskDescription,
        taskType: taskType || task.taskType,
        assignedTo: assignedTo || task.assignedTo,
        scheduledDate: scheduledDate || task.scheduledDate,
        scheduledTime: scheduledTime || task.scheduledTime,
        priority: priority || task.priority,
        catchPolygonId: catchPolygonId || task.catchPolygonId,
        catchPolygonIds: catchPolygonIds || task.catchPolygonIds, // Multiple zonasi
        vesselId: vesselId || task.vesselId,
        nahkodaId: nahkodaId || task.nahkodaId,
        abkIds: abkIds || task.abkIds,
        locationNotes
      });

      res.json({
        success: true,
        message: 'Tugas operasional berhasil diperbarui',
        data: task
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memperbarui tugas operasional: ' + error.message
      });
    }
  },

  // Complete task
  completeTask: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const task = await OperationalTask.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tugas tidak ditemukan'
        });
      }

      await task.update({
        status: 'completed',
        completedAt: new Date(),
        notes: notes || task.notes
      });

      res.json({
        success: true,
        message: 'Tugas berhasil diselesaikan',
        data: task
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menyelesaikan tugas: ' + error.message
      });
    }
  },

  // Delete task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;

      const task = await OperationalTask.findByPk(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tugas tidak ditemukan'
        });
      }

      await task.destroy();

      res.json({
        success: true,
        message: 'Tugas berhasil dihapus'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus tugas'
      });
    }
  },

  // Convert task to trip
  convertTaskToTrip: async (req, res) => {
    try {
      const { id } = req.params;
      const { estimasiPulang, targetIkan, areaTangkap } = req.body;

      console.log('🔄 Converting task to trip:', { id, estimasiPulang, targetIkan, areaTangkap });

      const task = await OperationalTask.findByPk(id, {
        include: [
          {
            model: Kapal,
            as: 'vessel',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi']
          },
          {
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'username']
          },
          {
            model: CatchPolygon,
            as: 'catchPolygon',
            attributes: ['id', 'name', 'zone_type']
          }
        ]
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tugas tidak ditemukan'
        });
      }

      // Validate task can be converted
      if (task.taskType !== 'departure' && task.taskType !== 'fishing') {
        return res.status(400).json({
          success: false,
          message: 'Hanya tugas tipe "departure" atau "fishing" yang bisa dikonversi ke trip'
        });
      }

      if (task.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Tugas yang sudah selesai tidak bisa dikonversi ke trip'
        });
      }

      // Import Trip model
      const Trip = require('../../models/trip/Trip');

      // Create trip from task data
      const tripData = {
        kapalId: task.vesselId,
        nahkodaId: task.nahkodaId || task.vessel?.nahkodaId,
        tanggalBerangkat: new Date(`${task.scheduledDate}T${task.scheduledTime}`),
        estimasiPulang: estimasiPulang ? new Date(estimasiPulang) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        targetIkan: targetIkan || 'Ikan Campuran',
        areaTangkap: areaTangkap || {
          nama: task.catchPolygon?.name || task.locationNotes || 'Area Tangkap',
          zona: task.catchPolygon?.zone_type || 'fishing',
          coordinates: task.catchPolygon?.coordinates || null
        },
        status: 'menunggu_izin',
        durasi: Math.ceil((new Date(estimasiPulang || Date.now() + 7 * 24 * 60 * 60 * 1000) - new Date(`${task.scheduledDate}T${task.scheduledTime}`)) / (1000 * 60 * 60 * 24)),
        catatan: `Trip dibuat dari tugas: ${task.taskTitle}`,
        taskId: task.id // Link back to original task
      };

      console.log('📊 Trip data to create:', tripData);

      const trip = await Trip.create(tripData);

      // Update task status to indicate it's been converted
      await task.update({
        status: 'completed',
        completedAt: new Date(),
        notes: `Tugas dikonversi ke Trip ID: ${trip.id}`
      });

      console.log('✅ Task converted to trip successfully:', trip.id);

      res.status(201).json({
        success: true,
        message: 'Tugas berhasil dikonversi ke trip dan masuk ke perizinan',
        data: {
          task: {
            id: task.id,
            title: task.taskTitle,
            status: 'completed'
          },
          trip: {
            id: trip.id,
            kapal: task.vessel?.namaKapal,
            nahkoda: task.nahkoda?.nama,
            tanggalBerangkat: trip.tanggalBerangkat,
            estimasiPulang: trip.estimasiPulang,
            status: trip.status,
            areaTangkap: trip.areaTangkap
          }
        }
      });
    } catch (error) {
      console.error('❌ Error converting task to trip:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengkonversi tugas ke trip: ' + error.message
      });
    }
  },
  getTasksByZone: async (req, res) => {
    try {
      const { zoneId } = req.params;

      const tasks = await OperationalTask.findAll({
        where: { catchPolygonId: zoneId },
        include: [
          {
            model: CatchPolygon,
            as: 'catchPolygon',
            attributes: ['id', 'name', 'zone_type']
          },
          {
            model: Kapal,
            as: 'vessel',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi']
          },
          {
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'username', 'noTelepon']
          }
        ],
        order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
      });

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching tasks by zone:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data tugas berdasarkan zonasi'
      });
    }
  }
};

module.exports = operationalTaskController;