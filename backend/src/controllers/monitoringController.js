const { Trip, Kapal, User, HarborZone, POI, CatchPolygon, Emergency, FishingPoint } = require('../models');
const { emitSocketEvent, broadcastVesselUpdate, emitToMonitoring } = require('../services/socketService');
const { Op } = require('sequelize'); // Op masih dipakai di checkZoneViolations jika diperlukan

// Haversine formula — returns distance in nautical miles
function haversineNM(lat1, lng1, lat2, lng2) {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Batas mil laut berdasarkan GT kapal (Permen KP No. 71/2016)
function getMilLimit(gt) {
  const gtNum = parseFloat(gt);
  if (!gt || isNaN(gtNum)) return null;
  if (gtNum < 5)   return { maxMil: 12,  kategori: 'Nelayan Kecil (< 5 GT)' };
  if (gtNum <= 10) return { maxMil: 24,  kategori: 'Nelayan Menengah Kecil (5–10 GT)' };
  if (gtNum <= 30) return { maxMil: 60,  kategori: 'Nelayan Menengah (10–30 GT)' };
  return               { maxMil: null, kategori: 'Nelayan Besar (> 30 GT)' };
}

// Hitung pusat koordinat harbor zone (polygon → centroid, circle → center)
function getHarborCenter(harborZone) {
  if (!harborZone?.coordinates) return null;
  if (Array.isArray(harborZone.coordinates)) {
    const coords = harborZone.coordinates;
    const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
    return { lat, lng };
  }
  return { lat: harborZone.coordinates.lat, lng: harborZone.coordinates.lng };
}

// Point-in-polygon (ray casting)
function isPointInPolygon(lat, lng, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lng, yi = coords[i].lat;
    const xj = coords[j].lng, yj = coords[j].lat;
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

async function checkZoneViolations(lat, lng, vesselGt, tripId, vesselName) {
  try {
    const polygons = await CatchPolygon.findAll({ where: { is_active: true } });
    const violations = [];
    for (const polygon of polygons) {
      if (!polygon.coordinates || !Array.isArray(polygon.coordinates) || polygon.coordinates.length < 3) continue;
      if (!isPointInPolygon(lat, lng, polygon.coordinates)) continue;

      const gt = parseFloat(vesselGt);
      const minGt = polygon.min_gt !== null ? parseFloat(polygon.min_gt) : null;
      const maxGt = polygon.max_gt !== null ? parseFloat(polygon.max_gt) : null;

      if (polygon.zone_type === 'restricted') {
        violations.push({ zoneId: polygon.id, zoneName: polygon.name, type: 'restricted_zone', severity: 'critical', message: `${vesselName} masuk zona terlarang: ${polygon.name}` });
      } else if (minGt !== null && gt < minGt) {
        violations.push({ zoneId: polygon.id, zoneName: polygon.name, type: 'gt_too_small', severity: 'warning', message: `${vesselName}: GT (${gt}) terlalu kecil untuk zona ${polygon.name} (min: ${minGt} GT)` });
      } else if (maxGt !== null && gt > maxGt) {
        violations.push({ zoneId: polygon.id, zoneName: polygon.name, type: 'gt_too_large', severity: 'warning', message: `${vesselName}: GT (${gt}) melebihi batas zona ${polygon.name} (max: ${maxGt} GT)` });
      }
    }
    return violations;
  } catch (e) {
    console.error('Zone check error:', e.message);
    return [];
  }
}

exports.getMonitoringData = async (req, res) => {
  try {
    // Get active trips with all relations - with proper validation
    const activeTrips = await Trip.findAll({
      where: { 
        status: ['disetujui', 'sedang_melaut', 'darurat']
      },
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal', 'panjangKapal', 'lebarKapal', 'beratKapal', 'statusOperasional', 'lastPosition', 'lastPositionUpdate', 'pelabuhanAsal', 'pelabuhanAsalId'],
          required: true,
          where: {
            statusOperasional: 'active'
          },
          include: [{
            model: HarborZone,
            as: 'pelabuhanAsalZone',
            attributes: ['id', 'name', 'coordinates'],
            required: false
          }]
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama', 'username', 'email'],
          required: false
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type', 'coordinates', 'facilities', 'radius'],
          required: false
        },

      ],
      order: [['createdAt', 'DESC']]
    });

    // 🚨 GET ACTIVE SOS ALERTS
    const sosAlerts = await Emergency.findAll({
      where: { 
        status: 'active' // Hanya SOS yang masih aktif
      },
      include: [
        {
          model: Kapal,
          as: 'vessel',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi'],
          include: [{
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'noTelepon', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform SOS data for map display
    const transformedSOS = sosAlerts.map(sos => ({
      id: sos.id,
      vesselId: sos.vesselId,
      vesselName: sos.vessel?.namaKapal || 'Unknown Vessel',
      nahkoda: sos.vessel?.nahkoda ? {
        id: sos.vessel.nahkoda.id,
        nama: sos.vessel.nahkoda.nama,
        noTelepon: sos.vessel.nahkoda.noTelepon,
        email: sos.vessel.nahkoda.email
      } : null,
      location: {
        lat: sos.location?.latitude || 0,
        lng: sos.location?.longitude || 0
      },
      jenisEmergency: sos.type || 'SOS',
      deskripsi: sos.note || 'Sinyal darurat dari kapal',
      status: sos.status,
      waktuLapor: sos.createdAt,
      priority: sos.priority || 'critical'
    }));

    // Filter dan validasi data kapal
    const validTrips = activeTrips.map(trip => {
      // Ensure trip has currentLocation, fallback to vessel lastPosition
      if (!trip.currentLocation && trip.kapal?.lastPosition) {
        trip.currentLocation = {
          ...trip.kapal.lastPosition,
          timestamp: trip.kapal.lastPositionUpdate || new Date()
        };
      }

      // Hitung jarak dari pelabuhan asal
      const harborCenter = getHarborCenter(trip.kapal?.pelabuhanAsalZone || trip.harborZone);
      const loc = trip.currentLocation;
      if (harborCenter && loc?.lat && loc?.lng) {
        const distNM = haversineNM(harborCenter.lat, harborCenter.lng, loc.lat, loc.lng);
        const milInfo = getMilLimit(trip.kapal?.beratKapal);
        trip.distanceFromHarbor = {
          nauticalMiles: parseFloat(distNM.toFixed(2)),
          harborName: trip.kapal?.pelabuhanAsalZone?.name || trip.harborZone?.name || trip.kapal?.pelabuhanAsal || 'Pelabuhan',
          maxMil: milInfo?.maxMil || null,
          kategori: milInfo?.kategori || null,
          isViolating: milInfo?.maxMil ? distNM > milInfo.maxMil : false
        };
      } else {
        trip.distanceFromHarbor = null;
      }

      return trip;
    }).filter(trip => {
      const kapal = trip.kapal;
      if (!kapal) {
        console.warn(`Trip ${trip.id} tidak memiliki data kapal`);
        return false;
      }
      if (!kapal.namaKapal || !kapal.nomorRegistrasi) {
        console.warn(`Kapal ${kapal.id} memiliki data tidak lengkap:`, {
          nama: kapal.namaKapal,
          nomor: kapal.nomorRegistrasi
        });
        return false;
      }
      return true;
    });

    // Get harbor zones with POIs
    const harborZones = await HarborZone.findAll({
      where: { is_active: true },
      include: [{
        model: POI,
        as: 'pois',
        where: { is_active: true },
        required: false
      }],
      order: [['name', 'ASC']]
    });

    // Get catch polygons
    const catchPolygons = await CatchPolygon.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    // Get fishing points - semua titik jaring tanpa batasan waktu
    const fishingPoints = await FishingPoint.findAll({
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
          required: false
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    // Get active POIs
    const pois = await POI.findAll({
      where: { is_active: true },
      include: [{
        model: HarborZone,
        as: 'harborZone',
        attributes: ['id', 'name', 'type'],
        required: false
      }],
      order: [['name', 'ASC']]
    });

    // Calculate statistics dengan data yang sudah divalidasi
    const stats = {
      totalActiveTrips: validTrips.length,
      totalActiveSOS: transformedSOS.length, // 🚨 Total SOS aktif
      invalidTrips: activeTrips.length - validTrips.length,
      tripsWithGPS: validTrips.filter(trip => trip.currentLocation).length,
      totalHarborZones: harborZones.length,
      totalCatchPolygons: catchPolygons.length,
      totalPOIs: pois.length,
      vesselsByStatus: {
        sailing: validTrips.filter(trip => trip.status === 'sedang_melaut').length,
        approved: validTrips.filter(trip => trip.status === 'disetujui').length
      },
      dataQuality: {
        validVessels: validTrips.length,
        totalQueried: activeTrips.length,
        validityRate: activeTrips.length > 0 ? ((validTrips.length / activeTrips.length) * 100).toFixed(1) + '%' : '100%'
      },
      lastUpdate: new Date().toISOString()
    };

    // Map configuration for frontend
    const mapConfig = {
      vesselMarkers: {
        icon: 'ship-blue',
        color: '#2196F3'
      },
      sosMarkers: {
        icon: 'emergency-red',
        color: '#F44336',
        animation: 'pulse'
      }
    };

    res.json({
      success: true,
      data: {
        activeTrips: validTrips,
        sosAlerts: transformedSOS,
        harborZones,
        catchPolygons,
        pois,
        fishingPoints,
        summary: stats,
        mapConfig
      },
      timestamp: new Date().toISOString(),
      warnings: activeTrips.length !== validTrips.length ? 
        [`${activeTrips.length - validTrips.length} trip memiliki data kapal tidak valid`] : []
    });
  } catch (error) {
    console.error('❌ Get monitoring data error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data monitoring: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getVesselsByZone = async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId, 10);
    if (!zoneId || isNaN(zoneId)) {
      return res.status(400).json({ success: false, message: 'zoneId tidak valid' });
    }

    const trips = await Trip.findAll({
      where: { 
        harborZoneId: zoneId,
        status: ['disetujui', 'sedang_melaut']
      },
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi'],
          required: true
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type', 'coordinates'],
          required: true
        }
      ]
    });

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error('❌ Get vessels by zone error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data kapal per zona: ' + error.message
    });
  }
};

exports.updateVesselZone = async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId, 10);
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ success: false, message: 'tripId tidak valid' });
    }
    const harborZoneId = req.body.harborZoneId;

    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi']
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type']
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    // Validate harbor zone if provided
    if (harborZoneId && harborZoneId !== 'null' && harborZoneId !== '') {
      const harborZone = await HarborZone.findByPk(harborZoneId);
      if (!harborZone) {
        return res.status(404).json({
          success: false,
          message: 'Harbor zone tidak ditemukan'
        });
      }
    }

    const oldZoneId = trip.harborZoneId;
    const newZoneId = (harborZoneId && harborZoneId !== 'null' && harborZoneId !== '') ? harborZoneId : null;
    
    await trip.update({ harborZoneId: newZoneId });

    // Prepare update data for real-time broadcast
    const updateData = {
      tripId,
      vesselId: trip.kapal?.id,
      vesselName: trip.kapal?.namaKapal,
      oldZoneId,
      newZoneId,
      timestamp: new Date().toISOString()
    };

    // Emit real-time updates
    broadcastVesselUpdate(updateData);
    emitToMonitoring('vessel_zone_update', updateData);

    res.json({
      success: true,
      message: 'Zona kapal berhasil diupdate',
      data: updateData
    });
  } catch (error) {
    console.error('❌ Update vessel zone error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate zona kapal: ' + error.message
    });
  }
};

exports.updateVesselLocation = async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId, 10);
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ success: false, message: 'tripId tidak valid' });
    }
    const latRaw = parseFloat(req.body.lat);
    const lngRaw = parseFloat(req.body.lng);
    const speed = parseFloat(req.body.speed) || 0;
    const heading = parseFloat(req.body.heading) || 0;
    const accuracy = typeof req.body.accuracy === 'string' ? req.body.accuracy.substring(0, 20) : 'high';

    const lat = latRaw;
    const lng = lngRaw;

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Koordinat tidak valid'
      });
    }

    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'beratKapal']
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    const locationData = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: parseFloat(speed),
      heading: parseFloat(heading),
      accuracy,
      timestamp: new Date().toISOString()
    };

    await trip.update({ currentLocation: locationData });

    // Cek pelanggaran zona berdasarkan GT kapal
    const vesselGt = trip.kapal?.beratKapal;
    const vesselName = trip.kapal?.namaKapal || 'Unknown';
    const violations = vesselGt ? await checkZoneViolations(lat, lng, vesselGt, tripId, vesselName) : [];

    // Hitung jarak dari pelabuhan untuk real-time update
    let distanceFromHarbor = null;
    if (trip.harborZoneId) {
      const hz = await HarborZone.findByPk(trip.harborZoneId, { attributes: ['id', 'name', 'coordinates'] });
      const center = getHarborCenter(hz);
      if (center) {
        const distNM = haversineNM(center.lat, center.lng, parseFloat(lat), parseFloat(lng));
        const milInfo = getMilLimit(vesselGt);
        distanceFromHarbor = {
          nauticalMiles: parseFloat(distNM.toFixed(2)),
          harborName: hz.name,
          maxMil: milInfo?.maxMil || null,
          kategori: milInfo?.kategori || null,
          isViolating: milInfo?.maxMil ? distNM > milInfo.maxMil : false
        };
        if (distanceFromHarbor.isViolating) {
          violations.push({
            type: 'mil_violation',
            severity: 'warning',
            message: `${vesselName}: ${distNM.toFixed(1)} mil dari ${hz.name}, melebihi batas ${milInfo.maxMil} mil (${milInfo.kategori})`
          });
        }
      }
    }

    // Prepare broadcast data
    const broadcastData = {
      tripId,
      vesselId: trip.kapal?.id,
      vesselName,
      vesselGt: vesselGt ? parseFloat(vesselGt) : null,
      location: locationData,
      harborZoneId: trip.harborZoneId,
      distanceFromHarbor,
      zoneViolations: violations,
      hasViolation: violations.length > 0
    };

    // Emit real-time location update
    broadcastVesselUpdate(broadcastData);
    emitToMonitoring('vessel_location_update', broadcastData);

    // Emit pelanggaran zona jika ada
    if (violations.length > 0) {
      console.log(`⚠️ Zone violations for ${vesselName}:`, violations);
      emitToMonitoring('zone_violation', {
        tripId,
        vesselId: trip.kapal?.id,
        vesselName,
        vesselGt: parseFloat(vesselGt),
        location: locationData,
        violations,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Lokasi kapal berhasil diupdate',
      data: broadcastData
    });
  } catch (error) {
    console.error('❌ Update vessel location error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate lokasi kapal: ' + error.message
    });
  }
};

exports.getVesselRealTimeData = async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId, 10);
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ success: false, message: 'tripId tidak valid' });
    }

    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal']
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama']
        },
        {
          model: HarborZone,
          as: 'harborZone',
          attributes: ['id', 'name', 'type', 'coordinates']
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        tripId: trip.id,
        vessel: trip.kapal,
        nahkoda: trip.nahkoda,
        status: trip.status,
        currentLocation: trip.currentLocation,
        harborZone: trip.harborZone,
        lastUpdate: trip.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Get vessel real-time data error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data real-time kapal: ' + error.message
    });
  }
};