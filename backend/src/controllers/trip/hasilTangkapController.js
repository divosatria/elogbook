const { HasilTangkap, Kapal, Trip } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const fishPriceService = require('../../services/core/fishPriceService');

const hasilTangkapController = {
  async getAll(req, res) {
    try {
      console.log('🐟 Getting all catch reports...');
      
      const { kapalId } = req.query;
      const replacements = {};
      const conditions = [];

      if (kapalId) {
        conditions.push('h.kapal_id = :kapalId');
        replacements.kapalId = parseInt(kapalId);
      }

      if (req.user && req.user.role === 'nahkoda') {
        conditions.push('t.nahkodaId = :userId');
        replacements.userId = req.user.userId;
      } else if (req.user && req.user.role === 'abk') {
        // Find catches where the associated trip has this ABK in awakKapal (JSON array)
        conditions.push('JSON_CONTAINS(t.awakKapal, :userIdStr)');
        replacements.userIdStr = JSON.stringify(req.user.userId);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Raw query — ambil semua field yang dibutuhkan logbook KKP
      const hasilTangkap = await sequelize.query(`
        SELECT h.*,
          k.namaKapal, k.nomorKapal, k.nomorRegistrasi, k.alatTangkap,
          k.beratKapal, k.panjangKapal, k.pemilik, k.pelabuhanAsal,
          t.id AS trip_id_ref,
          t.tanggalBerangkat, t.tanggalPulangAktual, t.estimasiPulang,
          t.areaTangkap, t.targetIkan, t.durasi, t.awakKapal, t.biaya, t.status AS trip_status,
          u.nama AS nama_nahkoda, u.noTelepon AS telepon_nahkoda
        FROM hasil_tangkap h
        LEFT JOIN kapals k ON h.kapal_id = k.id
        LEFT JOIN trips t ON h.trip_id = t.id
        LEFT JOIN users u ON t.nahkodaId = u.id
        ${whereClause}
        ORDER BY h.tanggal_tangkap DESC
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements
      });

      // Kumpulkan semua awakKapal user IDs untuk di-resolve nama-nya sekaligus
      const allAbkIds = new Set();
      hasilTangkap.forEach(item => {
        let crew = [];
        try {
          crew = typeof item.awakKapal === 'string' ? JSON.parse(item.awakKapal) : (item.awakKapal || []);
        } catch (e) { /* skip */ }
        crew.forEach(id => allAbkIds.add(parseInt(id)));
      });

      // Fetch nama ABK sekaligus (1 query)
      let abkMap = {};
      if (allAbkIds.size > 0) {
        const { User } = require('../../models');
        const abkUsers = await User.findAll({
          where: { id: Array.from(allAbkIds) },
          attributes: ['id', 'nama', 'noTelepon']
        });
        abkUsers.forEach(u => { abkMap[u.id] = { nama: u.nama, noTelepon: u.noTelepon }; });
      }

      console.log('🐟 Found', hasilTangkap.length, 'catch reports');

      // Transform data for frontend
      const transformedData = hasilTangkap.map(item => {
        let location;
        try {
          location = typeof item.lokasi === 'string' ? JSON.parse(item.lokasi) : (item.lokasi || { lat: 0, lng: 0 });
        } catch (e) {
          location = { lat: 0, lng: 0 };
        }

        let extendedInfo = {};
        try {
          const rawExtended = item.extendedData || item.extended_data;
          extendedInfo = typeof rawExtended === 'string' ? JSON.parse(rawExtended) : (rawExtended || {});
        } catch (e) { /* skip */ }

        // Resolve awakKapal → array objek { nama, noTelepon }
        let tripCrewRaw = [];
        try {
          tripCrewRaw = typeof item.awakKapal === 'string' ? JSON.parse(item.awakKapal) : (item.awakKapal || []);
        } catch (e) { /* skip */ }
        const tripCrewResolved = tripCrewRaw
          .map(id => abkMap[parseInt(id)] || null)
          .filter(Boolean);

        // Parse areaTangkap
        let tripArea = null;
        try {
          tripArea = item.areaTangkap
            ? (typeof item.areaTangkap === 'string' ? JSON.parse(item.areaTangkap) : item.areaTangkap)
            : null;
        } catch (e) { /* skip */ }

        return {
          _id: item.id.toString(),
          id: item.id,
          vesselId: item.kapal_id.toString(),
          vesselName: item.namaKapal || 'Unknown Vessel',
          vesselNumber: item.nomorKapal || 'N/A',
          date: new Date(item.tanggal_tangkap).toISOString().split('T')[0],
          fishType: item.jenis_ikan,
          weightKg: parseFloat(item.berat_kg),
          weightMobile: item.berat_mobile ? parseFloat(item.berat_mobile) : null,
          weightIot: item.berat_iot ? parseFloat(item.berat_iot) : null,
          pricePerKg: item.harga_per_kg ? parseFloat(item.harga_per_kg) : null,
          totalPrice: item.total_harga ? parseFloat(item.total_harga) : null,
          taxPercentage: item.tax_percentage ? parseFloat(item.tax_percentage) : null,
          taxAmount: item.tax_amount ? parseFloat(item.tax_amount) : null,
          netValue: item.net_value ? parseFloat(item.net_value) : null,
          location,
          method: item.metode_tangkap,
          weather: item.kondisi_cuaca,
          notes: item.catatan,
          status: item.status,
          tripId: item.trip_id,
          createdAt: item.created_at,

          // === DATA TRIP (sumber tunggal untuk logbook KKP) ===
          tripStatus: item.trip_status || null,
          tripDepartureDate: item.tanggalBerangkat || null,
          tripArrivalDate: item.tanggalPulangAktual || null,
          tripEstimatedReturn: item.estimasiPulang || null,
          tripArea,
          tripTargetFish: item.targetIkan || null,
          tripDuration: item.durasi || null,
          // ABK sudah di-resolve ke nama lengkap
          tripCrew: tripCrewResolved,
          tripCrewCount: tripCrewResolved.length,

          // === DATA KAPAL (sumber tunggal untuk logbook KKP) ===
          tripCaptainName: item.nama_nahkoda || null,
          tripCaptainPhone: item.telepon_nahkoda || null,
          vesselRegistration: item.nomorRegistrasi || item.nomorKapal || null,
          vesselGT: item.beratKapal ? parseFloat(item.beratKapal) : null,
          vesselLength: item.panjangKapal ? parseFloat(item.panjangKapal) : null,
          vesselOwner: item.pemilik || null,
          vesselFishingGear: item.alatTangkap || null,
          vesselHomePort: item.pelabuhanAsal || null,

          // === DATA MOBILE (extended) ===
          quantity: extendedInfo.quantity || null,
          crewCount: extendedInfo.crew_count || null,
          fuelCost: extendedInfo.fuel_cost || null,
          operationalCost: extendedInfo.operational_cost || null,
          totalCost: extendedInfo.total_cost || null,
          netProfit: extendedInfo.net_profit || null,
          photoUrl: extendedInfo.photo_path ? `/uploads/${extendedInfo.photo_path}` : null,
          mobileData: extendedInfo
        };
      });

      console.log('🐟 Sending', transformedData.length, 'transformed records');

      res.json({
        success: true,
        data: transformedData
      });
    } catch (error) {
      console.error('❌ Error fetching catch reports:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching catch reports',
        error: error.message
      });
    }
  },

    // Create new catch report
  async create(req, res) {
    try {
      console.log('📝 Creating catch report with body:', JSON.stringify(req.body, null, 2));
      const {
        kapalId,
        tripId,
        jenisIkan,
        beratKg,
        hargaPerKg,
        lokasi,
        tanggalTangkap,
        metodeTangkap,
        kondisiCuaca,
        catatan
      } = req.body;

      // Ensure berat is valid number
      if (!beratKg || isNaN(parseFloat(beratKg))) {
         return res.status(400).json({ success: false, message: 'Berat tangkapan harus berupa angka valid' });
      }

      // Get tax calculation from fish price service
      const taxCalculation = await fishPriceService.calculateCatchTax(
        jenisIkan,
        parseFloat(beratKg),
        hargaPerKg ? parseFloat(hargaPerKg) : null
      );
      
      console.log('💰 Tax calculation result:', taxCalculation);

      // Validasi kapalId sesuai trip jika tripId dikirim
      let finalKapalId = kapalId;
      if (tripId) {
        const tripRecord = await Trip.findByPk(tripId);
        if (!tripRecord) {
          return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
        }
        // Paksa kapalId dari trip agar konsisten
        finalKapalId = tripRecord.kapalId;
      }

      const catchData = {
        kapalId: finalKapalId,
        tripId: tripId || null,
        jenisIkan,
        beratKg: parseFloat(beratKg),
        hargaPerKg: taxCalculation.pricePerKg || null,
        totalHarga: taxCalculation.totalValue || null,
        taxPercentage: taxCalculation.taxPercentage,
        taxAmount: taxCalculation.taxAmount || null,
        netValue: taxCalculation.netValue || null,
        lokasi: lokasi || { lat: 0, lng: 0 },
        tanggalTangkap: tanggalTangkap || new Date(),
        metodeTangkap,
        kondisiCuaca,
        catatan,
        status: 'confirmed'
      };

      console.log('💾 Saving to DB:', catchData);

      const hasilTangkap = await HasilTangkap.create(catchData);

      res.status(201).json({
        success: true,
        message: 'Catch report created successfully',
        data: hasilTangkap,
        taxInfo: {
          priceConfigured: taxCalculation.priceConfigured,
          message: taxCalculation.message,
          taxCalculation: taxCalculation.success ? {
            totalValue: taxCalculation.totalValue,
            taxPercentage: taxCalculation.taxPercentage,
            taxAmount: taxCalculation.taxAmount,
            netValue: taxCalculation.netValue
          } : null
        }
      });
    } catch (error) {
      console.error('❌ Error creating catch report:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error creating catch report',
        error: error.message,
        details: error.errors?.map(e => e.message) // Sequelize validation errors
      });
    }
  },

  // Update catch report
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Recalculate tax if fish type, weight, or price changed
      if (updateData.jenisIkan || updateData.beratKg || updateData.hargaPerKg) {
        const currentRecord = await HasilTangkap.findByPk(id);
        if (!currentRecord) {
          return res.status(404).json({
            success: false,
            message: 'Catch report not found'
          });
        }

        const fishType = updateData.jenisIkan || currentRecord.jenisIkan;
        const weight = updateData.beratKg || currentRecord.beratKg;
        const price = updateData.hargaPerKg || currentRecord.hargaPerKg;

        const taxCalculation = await fishPriceService.calculateCatchTax(
          fishType,
          parseFloat(weight),
          price ? parseFloat(price) : null
        );

        if (taxCalculation.success) {
          updateData.totalHarga = taxCalculation.totalValue;
          updateData.taxPercentage = taxCalculation.taxPercentage;
          updateData.taxAmount = taxCalculation.taxAmount;
          updateData.netValue = taxCalculation.netValue;
        }
      }

      const [updatedRows] = await HasilTangkap.update(updateData, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Catch report not found'
        });
      }

      const updatedReport = await HasilTangkap.findByPk(id, {
        include: [
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['id', 'namaKapal', 'nomorKapal']
          },
          {
            model: Trip,
            as: 'trip',
            attributes: ['id', 'targetIkan', 'areaTangkap'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        message: 'Catch report updated successfully',
        data: updatedReport
      });
    } catch (error) {
      console.error('Error updating catch report:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating catch report',
        error: error.message
      });
    }
  },

  // Delete catch report
  async delete(req, res) {
    try {
      const { id } = req.params;

      const deletedRows = await HasilTangkap.destroy({
        where: { id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Catch report not found'
        });
      }

      res.json({
        success: true,
        message: 'Catch report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting catch report:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting catch report',
        error: error.message
      });
    }
  },

  // Get statistics
  async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      let whereClause = {};
      if (startDate && endDate) {
        whereClause.tanggalTangkap = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const stats = await HasilTangkap.findAll({
        where: whereClause,
        attributes: [
          'jenisIkan',
          [sequelize.fn('SUM', sequelize.col('hasil_tangkap.berat_kg')), 'totalBerat'],
          [sequelize.fn('SUM', sequelize.col('hasil_tangkap.total_harga')), 'totalNilai'],
          [sequelize.fn('SUM', sequelize.col('hasil_tangkap.tax_amount')), 'totalPajak'],
          [sequelize.fn('SUM', sequelize.col('hasil_tangkap.net_value')), 'totalBersih'],
          [sequelize.fn('COUNT', sequelize.col('hasil_tangkap.id')), 'jumlahTangkapan']
        ],
        group: ['jenisIkan'],
        order: [[sequelize.fn('SUM', sequelize.col('hasil_tangkap.berat_kg')), 'DESC']]
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching catch statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching catch statistics',
        error: error.message
      });
    }
  },

  // Get fish price info for tax calculation
  async getFishPriceInfo(req, res) {
    try {
      const { fishType } = req.params;
      
      const priceInfo = await fishPriceService.getFishPriceInfo(fishType);
      
      res.json({
        success: true,
        data: priceInfo
      });
    } catch (error) {
      console.error('Error getting fish price info:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting fish price info',
        error: error.message
      });
    }
  },

  // Calculate tax for catch
  async calculateTax(req, res) {
    try {
      const { fishType, weightKg, pricePerKg } = req.body;
      
      if (!fishType || !weightKg) {
        return res.status(400).json({
          success: false,
          message: 'Fish type and weight are required'
        });
      }
      
      const taxCalculation = await fishPriceService.calculateCatchTax(
        fishType,
        parseFloat(weightKg),
        pricePerKg ? parseFloat(pricePerKg) : null
      );
      
      res.json({
        success: true,
        data: taxCalculation
      });
    } catch (error) {
      console.error('Error calculating tax:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating tax',
        error: error.message
      });
    }
  },

  // Get active fish prices for dropdown
  async getActiveFishPrices(req, res) {
    try {
      const result = await fishPriceService.getActiveFishPrices();
      
      res.json(result);
    } catch (error) {
      console.error('Error getting active fish prices:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting active fish prices',
        error: error.message
      });
    }
  }
};

module.exports = hasilTangkapController;