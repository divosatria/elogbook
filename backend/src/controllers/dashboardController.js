const { Trip, Kapal, Emergency, User, HasilTangkap } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.getDashboardData = async (req, res) => {
  try {
    // Get real-time counts from database
    const [totalTrips, activeTrips, totalVessels, totalFishermen, activeAlerts] = await Promise.all([
      Trip.count(),
      Trip.count({ where: { status: 'sedang_melaut' } }),
      Kapal.count(),
      User.count({ where: { role: { [Op.in]: ['nahkoda', 'abk', 'nelayan'] } } }),
      Emergency.count({ where: { status: 'active' } })
    ]);
    
    // Get trip status breakdown from real data
    const tripStatusCounts = await Trip.findAll({
      attributes: [
        'status',
        [Trip.sequelize.fn('COUNT', Trip.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    const tripStatus = {
      pending: 0,
      approved: 0,
      active: 0,
      completed: 0
    };
    
    tripStatusCounts.forEach(item => {
      switch(item.status) {
        case 'menunggu_izin':
          tripStatus.pending = parseInt(item.count);
          break;
        case 'disetujui':
          tripStatus.approved = parseInt(item.count);
          break;
        case 'sedang_melaut':
          tripStatus.active = parseInt(item.count);
          break;
        case 'selesai':
          tripStatus.completed = parseInt(item.count);
          break;
      }
    });
    
    // Get recent trips for activity (without joins to avoid alias issues)
    const recentTrips = await Trip.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Get vessel names separately
    const vesselIds = recentTrips.map(trip => trip.kapalId).filter(Boolean);
    const vessels = await Kapal.findAll({
      where: { id: { [Op.in]: vesselIds } },
      attributes: ['id', 'namaKapal'],
      raw: true
    });
    
    const vesselMap = {};
    vessels.forEach(vessel => {
      vesselMap[vessel.id] = vessel.namaKapal;
    });
    
    // Generate activity from real trip data
    const tripActivity = recentTrips.map(trip => {
      const vesselName = vesselMap[trip.kapalId] || 'Kapal';
      const timeAgo = moment(trip.createdAt).fromNow();
      let message = '';
      let icon = 'ship';
      
      switch(trip.status) {
        case 'sedang_melaut':
          message = `${vesselName} sedang berlayar`;
          icon = 'ship';
          break;
        case 'selesai':
          message = `${vesselName} telah menyelesaikan trip`;
          icon = 'fish';
          break;
        case 'disetujui':
          message = `Trip ${vesselName} telah disetujui`;
          icon = 'file';
          break;
        default:
          message = `${vesselName} - ${trip.status}`;
          icon = 'ship';
      }
      
      return {
        type: 'trip',
        message,
        time: timeAgo,
        timestamp: trip.createdAt,
        icon
      };
    });

    // Get recent catches for activity
    const recentCatches = await HasilTangkap.findAll({
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [{
        model: Kapal,
        as: 'kapal',
        attributes: ['namaKapal'] 
      }]
    });

    const catchActivity = recentCatches.map(catchItem => {
      const vesselName = catchItem.kapal ? catchItem.kapal.namaKapal : 'Kapal';
      const fish = catchItem.jenisIkan || 'Ikan';
      const weight = catchItem.beratKg || 0;
      return {
        type: 'catch',
        message: `${vesselName} melaporkan tangkapan ${fish} ${weight}kg`,
        time: moment(catchItem.created_at).fromNow(),
        timestamp: catchItem.created_at,
        icon: 'fish'
      };
    });

    // Combine and sort activities
    const recentActivity = [...tripActivity, ...catchActivity]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 7) // Take top 7
      .map(({ timestamp, ...rest }) => rest); // Remove timestamp helper property
    
    // Get real catch data from HasilTangkap table using raw query
    const catchResults = await HasilTangkap.sequelize.query(
      `SELECT jenis_ikan as jenisIkan, SUM(berat_kg) as totalBerat 
       FROM hasil_tangkap 
       GROUP BY jenis_ikan 
       ORDER BY SUM(berat_kg) DESC 
       LIMIT 5`,
      { type: HasilTangkap.sequelize.QueryTypes.SELECT }
    );
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const fishTypes = catchResults.map((item, index) => ({
      name: item.jenisIkan,
      amount: parseFloat(item.totalBerat) / 1000, // Convert to tons
      color: colors[index] || '#64748b'
    }));
    
    // Calculate total catch from HasilTangkap using raw query
    const totalCatchResult = await HasilTangkap.sequelize.query(
      `SELECT SUM(berat_kg) as total FROM hasil_tangkap`,
      { type: HasilTangkap.sequelize.QueryTypes.SELECT }
    );
    
    const totalCatchFromDB = parseFloat(totalCatchResult[0]?.total || 0) / 1000; // Convert to tons
    
    // Get monthly statistics from real data
    const monthlyStats = [];
    const currentYear = moment().year();
    
    for (let month = 0; month < 12; month++) {
      const startOfMonth = moment().year(currentYear).month(month).startOf('month');
      const endOfMonth = moment().year(currentYear).month(month).endOf('month');
      
      const tripCount = await Trip.count({
        where: {
          createdAt: {
            [Op.between]: [startOfMonth.toDate(), endOfMonth.toDate()]
          }
        }
      });
      
      monthlyStats.push({
        month: startOfMonth.format('MMM'),
        trips: tripCount
      });
    }

    // --- Period Statistics (Dynamic) ---
    const period = req.query.period || 'month';
    let startDate;
    const endOfToday = moment().endOf('day').toDate();

    switch (period) {
      case 'month':
        startDate = moment().startOf('month').toDate();
        break;
      case '3months':
        startDate = moment().subtract(3, 'months').startOf('day').toDate();
        break;
      case '6months':
        startDate = moment().subtract(6, 'months').startOf('day').toDate();
        break;
      case '7days':
      default:
        startDate = moment().subtract(7, 'days').startOf('day').toDate();
        break;
    }
    
    const weeklyFilter = {
      tanggalTangkap: {
        [Op.between]: [startDate, endOfToday]
      }
    };

    // 1. Weekly Species Count
    const weeklySpeciesCount = await HasilTangkap.count({
      where: weeklyFilter,
      distinct: true,
      col: 'jenisIkan'
    });

    // 2. Weekly Total Catch (Weight)
    const weeklyTotalCatchSum = await HasilTangkap.sum('beratKg', {
      where: weeklyFilter
    });
    
    // 3. Weekly Total Realization (Sold status)
    const weeklyTotalRealizationSum = await HasilTangkap.sum('beratKg', {
      where: {
        ...weeklyFilter,
        status: 'sold'
      }
    });

    const weeklyStats = {
      speciesCount: weeklySpeciesCount || 0,
      totalCatch: (weeklyTotalCatchSum || 0) / 1000, // tons
      totalRealization: (weeklyTotalRealizationSum || 0) / 1000, // tons
      fishTypes: []
    };

// 4. Raw Catch Logs (Individual Records)
    // Fetch individual logs to show location vs species performance
    const rawLogs = await HasilTangkap.findAll({
      where: weeklyFilter,
      attributes: ['jenisIkan', 'beratKg', 'lokasi', 'tanggalTangkap', 'status'],
      include: [{
        model: Kapal,
        attributes: ['namaKapal'],
        as: 'kapal' // Lowercase alias as per association definition
      }],
      order: [['tanggalTangkap', 'DESC']],
      limit: 100, // Show last 100 logs to cover larger periods
    });

    weeklyStats.fishTypes = rawLogs.map((item, index) => {
      const loc = item.lokasi || {};
      // Format location string
      let locationName = loc.name ? loc.name : `${(loc.lat || 0).toFixed(2)}, ${(loc.lng || 0).toFixed(2)}`;
      
      return {
        name: `${item.jenisIkan} (${moment(item.tanggalTangkap).format('DD/MM')})`, // Short date format
        dateRaw: item.tanggalTangkap, // For sorting if needed
        locationName: locationName,
        vesselName: item.kapal ? item.kapal.namaKapal : 'Unknown Vessel',
        amount: parseFloat(item.beratKg || 0), // KG
        realization: item.status === 'sold' ? parseFloat(item.beratKg || 0) : 0, // KG
      };
    }).sort((a, b) => new Date(a.dateRaw) - new Date(b.dateRaw)); // Explicitly sort by Date Ascending
    
    const data = {
      totalTrips: totalTrips || 0,
      activeTrips: activeTrips || 0,
      totalVessels: totalVessels || 0,
      totalFishermen: totalFishermen || 0,
      activeAlerts: activeAlerts || 0,
      catchData: {
        totalCatch: totalCatchFromDB.toFixed(1),
        fishTypes: fishTypes
      },
      tripStatus,
      recentActivity,
      monthlyStats,
      weeklyStats: {
        ...weeklyStats,
        speciesCount: weeklySpeciesCount || 0,
        totalCatch: (weeklyTotalCatchSum || 0) / 1000, 
        totalRealization: (weeklyTotalRealizationSum || 0) / 1000
      },
      sailingOrders: [],
      lastUpdated: moment().toISOString()
    };
    
    res.json(data);
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Gagal memuat data dashboard: ' + error.message
    });
  }
};