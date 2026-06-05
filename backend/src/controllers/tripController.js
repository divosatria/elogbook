const { Trip, Kapal, User, HarborZone, VesselCrew, Emergency } = require('../models');
const { emitDashboardUpdate } = require('../middleware/dashboardUpdater');
const { getUserFriendlyErrorMessage } = require('../utils/errorMessages');
const { Op } = require('sequelize');

exports.getAllTrips = async (req, res) => {
  let whereClause = {};
  if (req.user && req.user.role === 'nahkoda') {
    whereClause.nahkodaId = req.user.userId;
  } else if (req.user && req.user.role === 'abk') {
    // MariaDB compatible JSON search
    whereClause[Op.and] = [
      Trip.sequelize ? Trip.sequelize.literal(`JSON_CONTAINS(awakKapal, '${req.user.userId}')`) : { awakKapal: { [Op.like]: `%${req.user.userId}%` } }
    ];
  }

  try {
    // Use include to avoid N+1 query problem
    const trips = await Trip.findAll({
      where: whereClause,
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal', 'spesifikasi', 'dataBahanBakar', 'storageData', 'iceData', 'dokumen', 'sertifikatJalan'],
          required: false
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama', 'username'],
          required: false
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type', 'coordinates', 'facilities'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const _parseTripJson = (tripObj) => {
      const parsed = { ...tripObj.toJSON ? tripObj.toJSON() : tripObj };
      const jsonFields = ['awakKapal', 'areaTangkap', 'perizinan', 'kondisiCuaca', 'tracking', 'laporan', 'biaya', 'currentLocation'];
      jsonFields.forEach(field => {
        if (typeof parsed[field] === 'string') {
          try { parsed[field] = JSON.parse(parsed[field]); } catch (e) {}
        }
      });
      return parsed;
    };
    
    console.log('📊 Loaded trips from MySQL:', trips.length);
    
    res.json({
      success: true,
      data: trips.map(t => _parseTripJson(t))
    });
  } catch (error) {
    console.error('❌ Get trips error:', error);
    const friendlyMessage = getUserFriendlyErrorMessage(error, 'Data trip');
    
    // Fallback to manual population if associations fail
    try {
      const trips = await Trip.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });
      
      const tripsWithData = [];
      for (const trip of trips) {
        const tripData = trip.toJSON();
        
        if (tripData.kapalId) {
          try {
            const kapal = await Kapal.findByPk(tripData.kapalId, {
              attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal', 'spesifikasi', 'dokumen', 'sertifikatJalan']
            });
            tripData.kapal = kapal;
          } catch (err) {
            console.error('Error loading kapal:', err);
            tripData.kapal = null;
          }
        }
        
        if (tripData.nahkodaId) {
          try {
            const nahkoda = await User.findByPk(tripData.nahkodaId, {
              attributes: ['id', 'nama', 'username']
            });
            tripData.nahkoda = nahkoda;
          } catch (err) {
            console.error('Error loading nahkoda:', err);
            tripData.nahkoda = null;
          }
        }
        
        if (tripData.harborZoneId) {
          try {
            const harborZone = await HarborZone.findByPk(tripData.harborZoneId, {
              attributes: ['id', 'name', 'type', 'coordinates', 'facilities']
            });
            tripData.harborZone = harborZone;
          } catch (err) {
            console.error('Error loading harborZone:', err);
            tripData.harborZone = null;
          }
        }
        
        tripsWithData.push(_parseTripJson(tripData));
      }
      
      res.json({
        success: true,
        data: tripsWithData
      });
    } catch (fallbackError) {
      const friendlyMessage = getUserFriendlyErrorMessage(fallbackError, 'Data trip');
      res.status(500).json({
        success: false,
        message: friendlyMessage,
        data: []
      });
    }
  }
};

exports.updateTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body;
    
    console.log('🔄 Updating trip status:', { id, status, catatan });
    
    const trip = await Trip.findByPk(id);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    const oldStatus = trip.status;
    
    // Update status
    trip.status = status;
    
    // Handle Emergency Logic
    if (status === 'darurat' && oldStatus !== 'darurat') {
      try {
        console.log(`🚨 Creating SOS for trip ${id} (Vessel: ${trip.kapalId})`);
        
        // Fetch Vessel data to get lastPosition if needed
        const vessel = await Kapal.findByPk(trip.kapalId);
        
        // Get valid coordinates: Try trip.currentLocation -> vessel.lastPosition -> Default 0,0
        let lat = 0;
        let lng = 0;
        
        if (trip.currentLocation && (trip.currentLocation.lat || trip.currentLocation.latitude)) {
          lat = parseFloat(trip.currentLocation.lat || trip.currentLocation.latitude);
          lng = parseFloat(trip.currentLocation.lng || trip.currentLocation.longitude);
        } else if (vessel && vessel.lastPosition && (vessel.lastPosition.lat || vessel.lastPosition.latitude)) {
          console.log(`⚠️ Trip location missing, using Vessel lastPosition for SOS`);
          lat = parseFloat(vessel.lastPosition.lat || vessel.lastPosition.latitude);
          lng = parseFloat(vessel.lastPosition.lng || vessel.lastPosition.longitude);
        }

        console.log(`📍 SOS Location determined: ${lat}, ${lng}`);

        const emergency = await Emergency.create({
          vesselId: trip.kapalId,
          location: { latitude: lat, longitude: lng },
          type: 'SOS',
          note: catatan || 'Sinyal darurat dari trip dashboard',
          status: 'active'
        });

        // Emit sos_alert
        const io = req.app.get('io');
        if (io) {
          // Transform data for socket
          const alertData = {
            _id: emergency.id,
            id: emergency.id,
            vesselId: emergency.vesselId,
            vesselName: 'Loading...', 
            timestamp: emergency.createdAt,
            location: {
              lat: lat,
              lng: lng
            },
            note: emergency.note,
            resolved: false,
            status: emergency.status,
            emergencyType: emergency.type
          };

          // Fetch Vessel info for socket
          try {
            const vessel = await Kapal.findByPk(trip.kapalId, {
              attributes: ['namaKapal', 'nomorRegistrasi'],
              include: [{
                model: User,
                as: 'nahkoda',
                attributes: ['id', 'nama', 'noTelepon']
              }]
            });
            
            if (vessel) {
              alertData.vesselName = vessel.namaKapal;
              alertData.nahkoda = vessel.nahkoda;
            }
          } catch (e) {
            console.warn('Failed to fetch vessel details for socket emission:', e);
          }

          io.emit('sos_alert', alertData);
          console.log('🚨 SOS alert emitted to socket');
        }
      } catch (err) {
        console.error('⚠️ Failed to auto-create SOS:', err);
      }
    } else if (oldStatus === 'darurat' && status === 'sedang_melaut') {
      try {
        console.log(`✅ Resolving SOS for trip ${id} (Vessel: ${trip.kapalId})`);
        
        // Find active emergency for this vessel
        const activeEmergency = await Emergency.findOne({
          where: {
            vesselId: trip.kapalId,
            status: 'active'
          },
          order: [['createdAt', 'DESC']]
        });

        if (activeEmergency) {
          await activeEmergency.update({
            status: 'resolved',
            resolvedAt: new Date(),
            note: activeEmergency.note + ` [Resolved by Admin: ${catatan || 'Situasi aman'}]`
          });
          
          // Emit resolution
          const io = req.app.get('io');
          if (io) {
            io.emit('emergency_resolved', {
              id: activeEmergency.id,
              vesselId: activeEmergency.vesselId
            });
            console.log('✅ Emergency resolved emitted to socket');
          }
        } else {
          console.warn('⚠️ No active SOS found to resolve for this vessel');
        }
      } catch (err) {
        console.error('⚠️ Failed to auto-resolve SOS:', err);
      }
    }
    
    // Update perizinan data
    let perizinan = trip.perizinan || {};
    if (status === 'disetujui') {
      perizinan.disetujuiOleh = req.user.userId;
      perizinan.tanggalDisetujui = new Date();
      perizinan.catatan = catatan;
    } else if (status === 'ditolak') {
      perizinan.alasanDitolak = catatan;
      perizinan.ditolakOleh = req.user.userId;
      perizinan.tanggalDitolak = new Date();
    }
    trip.perizinan = perizinan;
    
    await trip.save();
    
    console.log('✅ Trip updated in MySQL:', trip.id, 'status:', trip.status);
    
    // Emit real-time update for Trip Management
    req.app.get('io').emit('trip_status_update', trip);
    
    // Emit real-time update for Monitoring Map
    req.app.get('io').emit('vessel_status_update', {
      vesselId: trip.kapalId,
      status: trip.status
    });
    
    // Send email notification for status changes
    try {
      const emailService = require('../services/emailService');
      
      // Get trip with full details for email
      const fullTrip = await Trip.findByPk(id, {
        include: [
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['namaKapal']
          },
          {
            model: User,
            as: 'nahkoda',
            attributes: ['nama', 'email']
          }
        ]
      });
      
      if (fullTrip && fullTrip.nahkoda && fullTrip.nahkoda.email) {
        await emailService.sendTripStatusEmail(
          fullTrip.nahkoda.email,
          fullTrip.nahkoda.nama,
          {
            status: status,
            tripName: fullTrip.kapal?.namaKapal || 'Trip Anda',
            message: catatan
          }
        );
        console.log(`📧 Email status update terkirim ke nahkoda: ${fullTrip.nahkoda.email}`);
      }
      
      // Also send to ABK if they have emails
      if (fullTrip && fullTrip.awakKapal && fullTrip.awakKapal.length > 0) {
        for (const abkId of fullTrip.awakKapal) {
          try {
            const abkUser = await User.findByPk(abkId, {
              attributes: ['nama', 'email']
            });
            
            if (abkUser && abkUser.email) {
              await emailService.sendTripStatusEmail(
                abkUser.email,
                abkUser.nama,
                {
                  status: status,
                  tripName: fullTrip.kapal?.namaKapal || 'Trip Anda',
                  message: catatan
                }
              );
              console.log(`📧 Email status update terkirim ke ABK: ${abkUser.email}`);
            }
          } catch (abkEmailError) {
            console.error('⚠️ Error mengirim email ke ABK:', abkEmailError);
          }
        }
      }
    } catch (emailError) {
      console.error('⚠️ Error mengirim email status update:', emailError);
    }
    
    res.json({
      success: true,
      message: `Trip berhasil ${status === 'disetujui' ? 'disetujui' : status === 'ditolak' ? 'ditolak' : 'diupdate'}`,
      data: trip
    });
  } catch (error) {
    console.error('❌ Update trip status error:', error);
    res.status(400).json({
      success: false,
      message: 'Gagal mengupdate status trip: ' + error.message
    });
  }
};

exports.createTrip = async (req, res) => {
  try {
    const {
      kapalId,
      nahkodaId,
      tanggalBerangkat,
      estimasiPulang,
      durasi,
      areaTangkap,
      targetIkan,
      estimasiBerat,
      harborZoneId,
      awakKapal // Array of ABK user IDs
    } = req.body;

    // Validate required fields
    if (!kapalId || !nahkodaId || !tanggalBerangkat || !estimasiPulang) {
      return res.status(400).json({
        success: false,
        message: 'Kapal, nahkoda, tanggal berangkat, dan estimasi pulang wajib diisi'
      });
    }

    // Check if vessel exists
    const vessel = await Kapal.findByPk(kapalId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    // Check if nahkoda exists and is available
    const nahkoda = await User.findOne({
      where: {
        id: nahkodaId,
        role: 'nahkoda',
        isActive: true
      }
    });

    if (!nahkoda) {
      return res.status(404).json({
        success: false,
        message: 'Nahkoda tidak ditemukan atau tidak aktif'
      });
    }

    // Check if nahkoda is already on an active trip
    const existingTrip = await Trip.findOne({
      where: {
        nahkodaId,
        status: {
          [Op.in]: ['disetujui', 'sedang_melaut']
        }
      }
    });

    if (existingTrip) {
      return res.status(400).json({
        success: false,
        message: 'Nahkoda sedang bertugas di trip lain'
      });
    }

    // Prepare trip data
    const tripData = {
      kapalId,
      nahkodaId,
      tanggalBerangkat: new Date(tanggalBerangkat),
      estimasiPulang: new Date(estimasiPulang),
      durasi: durasi || Math.ceil((new Date(estimasiPulang) - new Date(tanggalBerangkat)) / (1000 * 60 * 60 * 24)),
      areaTangkap: areaTangkap || null,
      targetIkan: targetIkan || null,
      estimasiBerat: estimasiBerat || null,
      harborZoneId: harborZoneId || null,
      awakKapal: awakKapal || [],
      status: 'menunggu_dokumen',
      perizinan: {
        dokumen: {
          izinMelaut: false,
          dokumenKapal: false,
          asuransi: false
        },
        operasional: {
          kapasitasBensin: vessel.spesifikasi?.kapasitasBensin || 1000,
          bensinTersedia: 0,
          kapasitasEs: vessel.spesifikasi?.kapasitasEs || 500,
          esTersedia: 0
        },
        catatan: null,
        alasanDitolak: null
      }
    };

    const trip = await Trip.create(tripData);
    
    console.log('✅ Trip created in MySQL:', trip.id);
    
    // Send notification to nahkoda about new trip assignment
    try {
      const { sendNotification } = require('../services/notificationService');
      const emailService = require('../services/emailService');
      
      await sendNotification({
        penerima: [nahkodaId],
        tipe: 'trip_assignment',
        judul: '🚢 Jadwal Trip Baru',
        pesan: `Anda telah ditugaskan sebagai nahkoda untuk trip dengan kapal ${vessel.namaKapal}. Tanggal berangkat: ${new Date(tanggalBerangkat).toLocaleDateString('id-ID')}`,
        priority: 'high',
        data: {
          tripId: trip.id,
          vesselName: vessel.namaKapal,
          departureDate: tanggalBerangkat,
          estimatedReturn: estimasiPulang,
          fishingArea: areaTangkap,
          targetFish: targetIkan
        },
        dikirimOleh: req.user?.userId
      });
      
      // Send email to nahkoda if email exists
      if (nahkoda.email) {
        // Get ABK data for PDF
        const abkList = [];
        if (awakKapal && awakKapal.length > 0) {
          for (const abkId of awakKapal) {
            const abkUser = await User.findByPk(abkId, {
              attributes: ['id', 'nama', 'email', 'noTelepon']
            });
            if (abkUser) {
              abkList.push(abkUser);
            }
          }
        }
        
        await emailService.sendTripAssignmentEmail(
          nahkoda.email,
          nahkoda.nama,
          {
            tripId: trip.id,
            vesselName: vessel.namaKapal,
            vesselRegistration: vessel.nomorRegistrasi,
            departureDate: tanggalBerangkat,
            estimatedReturn: estimasiPulang,
            fishingArea: areaTangkap,
            targetFish: targetIkan,
            nahkoda: {
              nama: nahkoda.nama,
              email: nahkoda.email,
              noTelepon: nahkoda.noTelepon
            },
            abkList: abkList
          }
        );
        console.log('📧 Email + PDF surat tugas terkirim ke nahkoda:', nahkoda.email);
      }
      
      console.log('📱 Notifikasi trip assignment terkirim ke nahkoda:', nahkodaId);
    } catch (notifError) {
      console.error('⚠️ Error mengirim notifikasi trip assignment:', notifError);
      // Don't fail trip creation if notification fails
    }
    
    // Send notification to ABK crew members if specified
    if (awakKapal && awakKapal.length > 0) {
      try {
        const { sendNotification } = require('../services/notificationService');
        const emailService = require('../services/emailService');
        
        await sendNotification({
          penerima: awakKapal,
          tipe: 'trip_assignment',
          judul: '⚓ Penugasan Trip Baru',
          pesan: `Anda telah ditugaskan dalam trip dengan kapal ${vessel.namaKapal}. Tanggal berangkat: ${new Date(tanggalBerangkat).toLocaleDateString('id-ID')}`,
          priority: 'medium',
          data: {
            tripId: trip.id,
            vesselName: vessel.namaKapal,
            departureDate: tanggalBerangkat,
            estimatedReturn: estimasiPulang,
            role: 'abk'
          },
          dikirimOleh: req.user?.userId
        });
        
        // Send email to ABK crew members
        for (const abkId of awakKapal) {
          try {
            const abkUser = await User.findByPk(abkId, {
              attributes: ['id', 'nama', 'email']
            });
            
            if (abkUser && abkUser.email) {
              await emailService.sendTripAssignmentEmail(
                abkUser.email,
                abkUser.nama,
                {
                  vesselName: vessel.namaKapal,
                  departureDate: tanggalBerangkat,
                  estimatedReturn: estimasiPulang,
                  fishingArea: areaTangkap,
                  targetFish: targetIkan
                }
              );
              console.log('📧 Email trip assignment terkirim ke ABK:', abkUser.email);
            }
          } catch (emailError) {
            console.error('⚠️ Error mengirim email ke ABK:', abkId, emailError);
          }
        }
        
        console.log('📱 Notifikasi trip assignment terkirim ke ABK:', awakKapal.length, 'crew');
      } catch (notifError) {
        console.error('⚠️ Error mengirim notifikasi ke ABK:', notifError);
      }
    }
    
    // Load trip with associations for response
    const createdTrip = await Trip.findByPk(trip.id, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal'],
          required: false
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama', 'username'],
          required: false
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type'],
          required: false
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Trip berhasil dibuat',
      data: createdTrip
    });
  } catch (error) {
    console.error('❌ Create trip error:', error);
    res.status(400).json({
      success: false,
      message: 'Gagal membuat trip: ' + error.message
    });
  }
};

exports.getTripById = async (req, res) => {
  try {
    // Force fresh data by using separate queries
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    // Get fresh vessel data
    const vessel = await Kapal.findByPk(trip.kapalId, {
      attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal', 'spesifikasi', 'dataBahanBakar', 'storageData', 'iceData', 'dokumen', 'sertifikatJalan']
    });

    // Get nahkoda data
    const nahkoda = await User.findByPk(trip.nahkodaId, {
      attributes: ['id', 'nama', 'username']
    });

    // Get harbor zone if exists
    let harborZone = null;
    if (trip.harborZoneId) {
      harborZone = await HarborZone.findByPk(trip.harborZoneId, {
        attributes: ['id', 'name', 'type', 'coordinates']
      });
    }

    const _parseTripJson = (tripObj) => {
      const parsed = { ...tripObj };
      const jsonFields = ['awakKapal', 'areaTangkap', 'perizinan', 'kondisiCuaca', 'tracking', 'laporan', 'biaya', 'currentLocation'];
      jsonFields.forEach(field => {
        if (typeof parsed[field] === 'string') {
          try { parsed[field] = JSON.parse(parsed[field]); } catch (e) {}
        }
      });
      return parsed;
    };

    // Construct response with fresh data
    const tripData = _parseTripJson({
      ...trip.toJSON(),
      kapal: vessel,
      nahkoda: nahkoda,
      harborZone: harborZone
    });
    
    console.log('🔍 Trip detail requested:', req.params.id);
    
    res.json({
      success: true,
      data: tripData
    });
  } catch (error) {
    console.error('❌ Get trip by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat detail trip: ' + error.message
    });
  }
};

exports.updateVesselLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }
    
    const trip = await Trip.findByPk(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    const locationData = {
      lat,
      lng,
      timestamp: new Date().toISOString()
    };
    
    await trip.update({ currentLocation: locationData });
    
    // Emit real-time update
    const { emitToTrip } = require('../services/socketService');
    emitToTrip(id, 'location_update', locationData);
    
    res.json({
      success: true,
      message: 'Lokasi vessel berhasil diupdate',
      data: locationData
    });
  } catch (error) {
    console.error('❌ Update vessel location error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate lokasi vessel: ' + error.message
    });
  }
};

exports.updateTripDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { dokumen } = req.body;
    
    const trip = await Trip.findByPk(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Update perizinan dokumen
    let perizinan = trip.perizinan || {};
    perizinan.dokumen = {
      ...perizinan.dokumen,
      ...dokumen
    };
    
    // Auto update status jika semua dokumen lengkap
    const allDocsComplete = perizinan.dokumen.izinMelaut && 
                          perizinan.dokumen.dokumenKapal && 
                          perizinan.dokumen.asuransi;
    
    if (allDocsComplete && trip.status === 'menunggu_dokumen') {
      trip.status = 'menunggu_izin';
    }
    
    trip.perizinan = perizinan;
    await trip.save();
    
    res.json({
      success: true,
      message: 'Dokumen perizinan berhasil diupdate',
      data: trip
    });
  } catch (error) {
    console.error('❌ Update trip documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate dokumen: ' + error.message
    });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting trip:', id);
    
    const trip = await Trip.findByPk(id, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['namaKapal']
        }
      ]
    });
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Check if trip can be deleted (only allow deletion of certain statuses)
    const deletableStatuses = ['menunggu_izin', 'menunggu_dokumen', 'ditolak'];
    if (!deletableStatuses.includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: `Trip dengan status "${trip.status}" tidak dapat dihapus. Hanya trip dengan status menunggu_izin, menunggu_dokumen, atau ditolak yang dapat dihapus.`
      });
    }
    
    const tripName = trip.kapal?.namaKapal || `Trip ${id}`;
    const kapalId = trip.kapalId;
    
    // Clean vessel data when trip is deleted
    if (kapalId) {
      try {
        const vessel = await Kapal.findByPk(kapalId);
        if (vessel) {
          // Clear vessel trip-related data
          vessel.dataBahanBakar = [];
          vessel.storageData = [];
          vessel.dokumen = [];
          vessel.sertifikatJalan = [];
          await vessel.save();
          console.log('🧹 Vessel data cleaned for kapal:', kapalId);
        }
      } catch (cleanError) {
        console.error('⚠️ Error cleaning vessel data:', cleanError);
        // Continue with trip deletion even if vessel cleanup fails
      }
    }
    
    // Delete the trip
    await trip.destroy();
    
    console.log('✅ Trip deleted successfully:', id);
    
    // Emit real-time update
    req.app.get('io').emit('trip_deleted', { id, name: tripName });
    
    res.json({
      success: true,
      message: `Trip "${tripName}" berhasil dihapus`
    });
  } catch (error) {
    console.error('❌ Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus trip: ' + error.message
    });
  }
};

// Approve/reject individual document
exports.approveDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const { approved, catatan } = req.body;
    
    console.log('📋 Approving document:', { id, documentType, approved, catatan });
    
    const trip = await Trip.findByPk(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Validate document type
    const validDocTypes = ['izinMelaut', 'dokumenKapal', 'asuransi'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe dokumen tidak valid'
      });
    }
    
    // Update specific document approval
    let perizinan = trip.perizinan || {};
    if (!perizinan.dokumen) {
      perizinan.dokumen = {};
    }
    
    perizinan.dokumen[documentType] = approved;
    
    // Add approval history
    if (!perizinan.approvalHistory) {
      perizinan.approvalHistory = [];
    }
    
    perizinan.approvalHistory.push({
      documentType,
      approved,
      catatan,
      approvedBy: req.user.userId,
      approvedAt: new Date()
    });
    
    trip.perizinan = perizinan;
    await trip.save();
    
    console.log('✅ Document approval updated:', documentType, approved);
    
    // Emit real-time update
    req.app.get('io').emit('document_approval_update', {
      tripId: id,
      documentType,
      approved,
      catatan
    });
    
    res.json({
      success: true,
      message: `Dokumen ${documentType} berhasil ${approved ? 'disetujui' : 'ditolak'}`,
      data: {
        tripId: id,
        documentType,
        approved,
        catatan,
        perizinan: trip.perizinan
      }
    });
  } catch (error) {
    console.error('❌ Approve document error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memproses persetujuan dokumen: ' + error.message
    });
  }
};

exports.getTripLogbookData = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findByPk(id, {
      include: [
        { model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'nomorKapal', 'pemilik', 'alatTangkap', 'beratKapal', 'panjangKapal', 'mesin', 'gps'] },
        { model: User, as: 'nahkoda', attributes: ['id', 'nama'] },
        { model: HarborZone, as: 'harborZone', attributes: ['id', 'name'] }
      ]
    });
    
    if (!trip) return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    
    const { HasilTangkap, FishingPoint } = require('../models');
    const { Op } = require('sequelize');

    const catches = await HasilTangkap.findAll({ where: { tripId: id }, order: [['tanggalTangkap', 'ASC']] });
    const rawPoints = await FishingPoint.findAll({ where: { tripId: id }, order: [['timestamp', 'ASC']] });

    // Populate hasilTangkap per fishing point menggunakan hasilTangkapIds
    const fishingPoints = await Promise.all(rawPoints.map(async (point) => {
      const p = point.toJSON();
      const ids = Array.isArray(p.hasilTangkapIds) && p.hasilTangkapIds.length > 0
        ? p.hasilTangkapIds
        : (p.hasilTangkapId ? [p.hasilTangkapId] : []);

      if (ids.length > 0) {
        const pointCatches = await HasilTangkap.findAll({
          where: { id: { [Op.in]: ids } },
          attributes: ['id', 'jenisIkan', 'beratKg', 'beratMobile', 'hargaPerKg', 'totalHarga', 'tanggalTangkap', 'metodeTangkap', 'extendedData']
        });
        p.hasilTangkap = pointCatches.map(c => {
          const d = c.toJSON();
          d.quantity = d.extendedData?.quantity || null;
          return d;
        });
      } else {
        p.hasilTangkap = [];
      }
      return p;
    }));
    
    res.json({
      success: true,
      data: {
        trip: trip.toJSON(),
        catches: catches.map(c => c.toJSON()),
        fishingPoints
      }
    });
  } catch (error) {
    console.error('Get logbook data error:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat data logbook: ' + error.message });
  }
};

exports.cleanVesselData = async (req, res) => {
  try {
    const { vesselId } = req.params;
    
    console.log('🧹 Cleaning vessel data:', vesselId);
    
    const vessel = await Kapal.findByPk(vesselId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }
    
    // Clear all trip-related data
    vessel.dataBahanBakar = [];
    vessel.storageData = [];
    vessel.dokumen = [];
    vessel.sertifikatJalan = [];
    await vessel.save();
    
    console.log('✅ Vessel data cleaned successfully:', vesselId);
    
    res.json({
      success: true,
      message: `Data kapal "${vessel.namaKapal}" berhasil dibersihkan`,
      data: {
        vesselId,
        vesselName: vessel.namaKapal,
        cleanedFields: ['dataBahanBakar', 'storageData', 'dokumen', 'sertifikatJalan']
      }
    });
  } catch (error) {
    console.error('❌ Clean vessel data error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membersihkan data kapal: ' + error.message
    });
  }
};