const { HasilTangkap, Kapal, Trip, User } = require('../../models');
const uploadHelper = require('../../utils/uploadHelper');
const { sequelize } = require('../../config/database');

const mobileCatchController = {
  // POST /api/mobile/catches - Submit catch data from mobile
  async submitCatch(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('📱 Mobile submitCatch request:', {
        body: req.body,
        file: req.file ? 'File present' : 'No file',
        user: req.user
      });

      const {
        // Fish data
        fish_name,
        fish_type,
        weight,
        quantity,
        condition,
        
        // Financial data
        price_per_kg,
        total_revenue,
        fuel_cost,
        operational_cost,
        tax,
        total_cost,
        net_profit,
        
        // Trip data
        departure_date,
        departure_time,
        arrival_date,
        arrival_time,
        trip_duration_hours,
        trip_duration_minutes,
        
        // Location data
        fishing_zone,
        location_name,
        latitude,
        longitude,
        water_depth,
        weather_condition,
        
        // Additional
        notes,
        kapalId,
        tripId,
        iot_data // New field for IOT data
      } = req.body;

      // Parse numerical fields to ensure they are stored as numbers
      const parsedQuantity = parseInt(quantity) || 0;
      const parsedCrewCount = parseInt(req.body.crew_count) || 0;
      const parsedFuelCost = parseFloat(fuel_cost) || 0;
      const parsedOperationalCost = parseFloat(operational_cost) || 0;
      const parsedTax = parseFloat(tax) || 0;
      const parsedTotalCost = parseFloat(total_cost) || 0;
      const parsedNetProfit = parseFloat(net_profit) || 0;
      const parsedTripDurationHours = parseInt(trip_duration_hours) || 0;
      const parsedTripDurationMinutes = parseInt(trip_duration_minutes) || 0;
      const parsedIotData = parseFloat(iot_data) || 0;

      // Validate and sanitize tripId - REQUIRED as per user request
      let validTripId = null;
      if (tripId && tripId !== '' && tripId !== 'null' && tripId !== '0') {
        const parsedTripId = parseInt(tripId);
        if (!isNaN(parsedTripId) && parsedTripId > 0) {
          // Check if trip exists
          const tripExists = await Trip.findByPk(parsedTripId);
          if (tripExists) {
            validTripId = parsedTripId;
          } else {
             return res.status(404).json({
                success: false,
                message: 'Data Trip tidak ditemukan. Pastikan Anda memulai trip dengan benar.'
             });
          }
        }
      }

      if (!validTripId) {
        return res.status(400).json({
            success: false,
            message: 'Trip ID wajib diisi. Silakan pilih trip yang aktif.'
        });
      }

      // Get vessel data — ambil dari trip untuk memastikan konsistensi
      const tripRecord = await Trip.findByPk(validTripId);
      const correctKapalId = tripRecord.kapalId;

      const kapal = await Kapal.findByPk(correctKapalId, {
        include: [{
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama']
        }]
      });

      if (!kapal) {
        return res.status(404).json({
          success: false,
          message: 'Kapal tidak ditemukan'
        });
      }

      // Get captain name from user
      const captain = await User.findByPk(req.user.userId);

      // Handle photo upload
      let photoPath = null;
      if (req.file) {
        const uploadResult = await uploadHelper.saveFile((req.file.buffer || req.file.path), req.file.originalname, `catches/${kapalId}`);
        photoPath = uploadResult.filePath;
      }

      // Create catch record with extended fields
      // FIX: tanggalTangkap = waktu submit (real-time), bukan waktu keberangkatan
      const submissionTime = new Date();

      const catchData = await HasilTangkap.create({
        kapalId: correctKapalId, // selalu dari trip, bukan dari body
        tripId: validTripId,
        jenisIkan: fish_name,
        // beratMobile = input dari mobile, beratKg = sama agar hook pajak berjalan
        beratMobile: parseFloat(weight),
        beratIot: parsedIotData,
        beratKg: parseFloat(weight), // diisi agar hook beforeSave hitung totalHarga & pajak
        hargaPerKg: parseFloat(price_per_kg) || null,
        totalHarga: parseFloat(total_revenue) || null,
        lokasi: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          name: location_name,
          zone: fishing_zone,
          depth: parseFloat(water_depth)
        },
        tanggalTangkap: submissionTime, // Waktu saat nelayan submit data
        metodeTangkap: fish_type,
        kondisiCuaca: weather_condition,
        catatan: notes,
        status: 'confirmed',
        // Extended fields stored in JSON
        extendedData: {
          // Audit trail
          submitted_at: submissionTime.toISOString(),
          trip_start_date: (departure_date && departure_date !== 'null' && departure_time && departure_time !== 'null' && !isNaN(new Date(`${departure_date}T${departure_time}`).getTime()))
            ? new Date(`${departure_date}T${departure_time}`).toISOString()
            : null,

          quantity: parsedQuantity,
          condition,
          vessel_name: kapal.namaKapal,
          vessel_number: kapal.nomorRegistrasi,
          captain_name: captain?.nama || 'Unknown',
          crew_count: parsedCrewCount,
          fuel_cost: parsedFuelCost,
          operational_cost: parsedOperationalCost,
          tax: parsedTax,
          total_cost: parsedTotalCost,
          net_profit: parsedNetProfit,
          departure_date,
          departure_time,
          arrival_date,
          arrival_time,
          trip_duration_hours: parsedTripDurationHours,
          trip_duration_minutes: parsedTripDurationMinutes,
          photo_path: photoPath,
          iot_data: parsedIotData // Also store in extendedData for redundancy/backup
        }
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Data tangkapan berhasil disimpan',
        data: {
          id: catchData.id,
          vessel_name: kapal.namaKapal,
          vessel_number: kapal.nomorRegistrasi,
          captain_name: captain?.nama,
          sync_status: 'Synced',
          last_sync_attempt: new Date(),
          photoUrl: photoPath ? `/uploads/${photoPath}` : null
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error submitting catch:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Gagal menyimpan data tangkapan',
        error: error.message,
        sync_status: 'Failed',
        sync_error: error.message
      });
    }
  },

  // GET /api/mobile/catches - Get user's catch history
  async getMyCatches(req, res) {
    try {
      console.log('📱 Mobile getMyCatches request:', req.user);
      const { role, userId } = req.user;
      
      let whereClause = {};
      
      // Filter by user role
      if (role === 'nahkoda') {
        // Nahkoda: lihat tangkapan dari trip yang dia pimpin
        const trips = await Trip.findAll({
          where: { nahkodaId: userId },
          attributes: ['id']
        });
        const tripIds = trips.map(t => t.id);
        if (tripIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
        whereClause.tripId = tripIds;
      } else if (role === 'abk') {
        // ABK: lihat tangkapan dari trip yang dia ikuti (awakKapal)
        const { Op } = require('sequelize');
        const trips = await Trip.findAll({ attributes: ['id', 'awakKapal'] });
        const abkTripIds = trips
          .filter(t => Array.isArray(t.awakKapal) && t.awakKapal.includes(userId))
          .map(t => t.id);
        if (abkTripIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
        whereClause.tripId = abkTripIds;
      }

      console.log('Querying HasilTangkap with:', whereClause);
      const catches = await HasilTangkap.findAll({
        where: whereClause,
        include: [
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['id', 'namaKapal', 'nomorKapal']
          }
        ],
        order: [['tanggalTangkap', 'DESC']],
        limit: 50
      });
      
      console.log(`Found ${catches.length} catches`);

      res.json({
        success: true,
        data: catches.map(c => ({
          id: c.id,
          fish_name: c.jenisIkan,
          weight: c.beratKg, // Keep for backward compatibility/total if needed
          mobile_data: c.beratMobile, // Explicit mobile input
          iot_data: c.beratIot, // IOT data
          total_revenue: c.totalHarga,
          departure_date: c.tanggalTangkap,
          vessel_name: c.kapal ? c.kapal.namaKapal : 'Unknown Vessel', // Safe access
          sync_status: 'Synced',
          ...(c.extendedData || {}) // Safe access
        }))
      });
    } catch (error) {
      console.error('❌ Error fetching catches:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data tangkapan',
        error: error.message
      });
    }
  }
};

module.exports = mobileCatchController;
