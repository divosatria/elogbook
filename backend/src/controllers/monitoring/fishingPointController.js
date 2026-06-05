const { FishingPoint, HasilTangkap, Trip, Kapal, User } = require('../../models');
const { emitToMonitoring } = require('../../services/core/socketService');
const { Op } = require('sequelize');

// Submit titik penurunan/pengangkatan jaring dari mobile (nahkoda ATAU abk)
exports.submitFishingPoint = async (req, res) => {
  try {
    const {
      tripId, lat, lng, depthMeters, actionType, notes,
      hasilTangkap // array: [{ jenisIkan, beratKg, hargaPerKg, metodeTangkap }]
    } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!tripId || !lat || !lng) {
      return res.status(400).json({ success: false, message: 'tripId, lat, lng wajib diisi' });
    }

    const isRetrieval = (actionType === 'net_retrieved');
    if (isRetrieval && (!hasilTangkap || !Array.isArray(hasilTangkap) || hasilTangkap.length === 0)) {
      return res.status(400).json({ success: false, message: 'Data hasil tangkapan wajib diisi saat pengangkatan jaring' });
    }

    if (!['nahkoda', 'abk'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Hanya nahkoda dan ABK yang bisa submit titik jaring' });
    }

    // Validasi trip — nahkoda: cek nahkodaId, abk: cek awakKapal
    let trip;
    if (userRole === 'nahkoda') {
      trip = await Trip.findOne({
        where: { id: parseInt(tripId), nahkodaId: userId },
        include: [{ model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorKapal', 'alatTangkap'] }]
      });
    } else {
      // ABK: cek apakah userId ada di awakKapal trip ini
      trip = await Trip.findOne({
        where: { id: parseInt(tripId) },
        include: [{ model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorKapal', 'alatTangkap'] }]
      });
      if (trip) {
        const awakKapal = trip.awakKapal || [];
        const isAssigned = awakKapal.includes(userId) || awakKapal.includes(String(userId));
        if (!isAssigned) {
          return res.status(403).json({ success: false, message: 'Anda tidak ditugaskan ke trip ini' });
        }
      }
    }

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });
    }

    if (!['disetujui', 'sedang_melaut'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Trip belum aktif' });
    }

    const waktuTangkap = new Date();

    // Simpan SEMUA hasil tangkapan jika net_retrieved
    let catchRecords = [];
    if (isRetrieval) {
      for (const item of hasilTangkap) {
        const beratKg = parseFloat(item.beratKg);
        if (isNaN(beratKg) || beratKg <= 0) continue;

        const catch_ = await HasilTangkap.create({
          kapalId: trip.kapalId,
          tripId: parseInt(tripId),
          jenisIkan: String(item.jenisIkan).substring(0, 100),
          beratKg,
          beratMobile: beratKg,
          hargaPerKg: item.hargaPerKg ? parseFloat(item.hargaPerKg) : null,
          metodeTangkap: item.metodeTangkap || trip.kapal?.alatTangkap || null,
          lokasi: { lat: parseFloat(lat), lng: parseFloat(lng) },
          tanggalTangkap: waktuTangkap,
          catatan: notes || null,
          status: 'confirmed',
          // Simpan quantity (jumlah ekor) di extendedData
          extendedData: item.quantity ? { quantity: parseInt(item.quantity) } : null
        });
        catchRecords.push(catch_);
      }
    }

    const catchIds = catchRecords.map(c => c.id);

    const point = await FishingPoint.create({
      tripId: parseInt(tripId),
      kapalId: trip.kapalId,
      submittedBy: userId,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      depthMeters: depthMeters ? parseFloat(depthMeters) : null,
      actionType: actionType || 'net_deployed',
      notes: notes || null,
      hasilTangkapId: catchIds.length > 0 ? catchIds[0] : null,
      hasilTangkapIds: catchIds,
      timestamp: waktuTangkap
    });

    const responseData = {
      id: point.id,
      tripId: point.tripId,
      kapalId: point.kapalId,
      submittedBy: userId,
      submittedByRole: userRole,
      kapalNama: trip.kapal?.namaKapal,
      alatTangkap: trip.kapal?.alatTangkap,
      location: point.location,
      depthMeters: point.depthMeters,
      actionType: point.actionType,
      notes: point.notes,
      timestamp: point.timestamp,
      hasilTangkap: catchRecords.map(c => ({
        id: c.id,
        jenisIkan: c.jenisIkan,
        beratKg: c.beratKg,
        hargaPerKg: c.hargaPerKg,
        totalHarga: c.totalHarga,
        tanggalTangkap: c.tanggalTangkap
      }))
    };

    emitToMonitoring('fishing_point_added', responseData);

    const msg = isRetrieval
      ? `Jaring diangkat, ${catchRecords.length} data tangkapan tersimpan`
      : 'Titik jaring berhasil disimpan';

    res.status(201).json({ success: true, message: msg, data: responseData });
  } catch (error) {
    console.error('❌ Error submitting fishing point:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: load semua hasil tangkap per titik berdasarkan hasilTangkapIds
async function loadCatchesForPoints(points) {
  return Promise.all(points.map(async (point) => {
    const p = typeof point.toJSON === 'function' ? point.toJSON() : { ...point };
    const ids = Array.isArray(p.hasilTangkapIds) && p.hasilTangkapIds.length > 0
      ? p.hasilTangkapIds
      : (p.hasilTangkapId ? [p.hasilTangkapId] : []);

    if (ids.length > 0) {
      const catches = await HasilTangkap.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'jenisIkan', 'beratKg', 'beratMobile', 'hargaPerKg', 'totalHarga', 'tanggalTangkap', 'metodeTangkap', 'extendedData']
      });
      p.hasilTangkap = catches.map(c => {
        const d = c.toJSON();
        // Normalisasi quantity: ambil dari extendedData jika ada
        d.quantity = d.extendedData?.quantity || null;
        return d;
      });
    } else {
      p.hasilTangkap = [];
    }
    return p;
  }));
}

// Get semua fishing points untuk monitoring (dengan filter trip/kapal)
exports.getFishingPoints = async (req, res) => {
  try {
    const tripId = req.query.tripId ? parseInt(req.query.tripId) : null;
    const kapalId = req.query.kapalId ? parseInt(req.query.kapalId) : null;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const where = {};
    if (tripId) where.tripId = tripId;
    if (kapalId) where.kapalId = kapalId;

    const points = await FishingPoint.findAll({
      where,
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorKapal', 'alatTangkap']
        },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'status'],
          include: [{ model: User, as: 'nahkoda', attributes: ['id', 'nama'] }]
        }
      ],
      order: [['timestamp', 'ASC']],
      limit
    });

    const result = await loadCatchesForPoints(points);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error getting fishing points:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get fishing points untuk trip aktif (dipakai monitoring)
exports.getActiveFishingPoints = async (req, res) => {
  try {
    const points = await FishingPoint.findAll({
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorKapal', 'alatTangkap']
        },
        {
          model: Trip,
          as: 'trip',
          attributes: ['id', 'status'],
          where: { status: ['disetujui', 'sedang_melaut'] },
          include: [{ model: User, as: 'nahkoda', attributes: ['id', 'nama'] }]
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: 200
    });

    const result = await loadCatchesForPoints(points);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error getting active fishing points:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get titik jaring berdasarkan ID hasil tangkap
exports.getFishingPointByCatch = async (req, res) => {
  try {
    const catchId = parseInt(req.params.catchId);

    // Cari titik yang hasilTangkapIds mengandung catchId ini
    // MySQL JSON_CONTAINS untuk array
    const { sequelize } = require('../../config/database');
    const points = await FishingPoint.findAll({
      where: sequelize.literal(
        `(JSON_CONTAINS(hasil_tangkap_ids, '${catchId}') OR hasil_tangkap_id = ${catchId})`
      ),
      include: [
        { model: Kapal, as: 'kapal', attributes: ['id', 'namaKapal', 'nomorKapal', 'alatTangkap'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    const result = await loadCatchesForPoints(points);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error getting fishing point by catch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: hapus titik jaring (beserta hasil tangkap yang terkait jika diminta)
exports.deleteFishingPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteRelatedCatches } = req.query; // ?deleteRelatedCatches=true

    const point = await FishingPoint.findByPk(id);
    if (!point) {
      return res.status(404).json({ success: false, message: 'Titik jaring tidak ditemukan' });
    }

    // Hapus hasil tangkap terkait jika diminta
    if (deleteRelatedCatches === 'true') {
      const ids = Array.isArray(point.hasilTangkapIds) && point.hasilTangkapIds.length > 0
        ? point.hasilTangkapIds
        : (point.hasilTangkapId ? [point.hasilTangkapId] : []);

      if (ids.length > 0) {
        await HasilTangkap.destroy({ where: { id: { [Op.in]: ids } } });
      }
    }

    await point.destroy();
    res.json({ success: true, message: 'Titik jaring berhasil dihapus' });
  } catch (error) {
    console.error('❌ Error deleting fishing point:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
