const Kapal = require('../../models/vessel/Kapal');
const { getKategoriKapal, getAlatTangkapByKategori } = require('../../models/vessel/Kapal');
const { User, HarborZone } = require('../../models');
const VesselCrew = require('../../models/vessel/VesselCrew');

// Associations are already defined in models/index.js - no need to redefine here

// Simplified getAllKapal function
exports.getAllKapal = async (req, res) => {
  try {
    console.log('📋 Mengambil semua kapal...');
    
    const vessels = await Kapal.findAll({
      include: [
        {
          model: require('../../models/monitoring/Perangkat'),
          as: 'gpsDevice',
          required: false
        },
        {
          model: HarborZone,
          as: 'pelabuhanAsalZone',
          required: false,
          attributes: ['id', 'name', 'type', 'coordinates', 'description']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('🔍 Kapal ditemukan:', vessels.length);
    
    // Process each vessel and add basic data
    const processedVessels = [];
    
    for (let vessel of vessels) {
      const vesselData = vessel.toJSON();
      vesselData.kategoriKapal = getKategoriKapal(vesselData.beratKapal);
      
      // Get nahkoda info if exists
      if (vesselData.nahkodaId) {
        try {
          const nahkoda = await User.findByPk(vesselData.nahkodaId, {
            attributes: ['id', 'username', 'nama', 'role']
          });
          vesselData.nahkoda = nahkoda;
        } catch (err) {
          console.log(`⚠️ Nahkoda not found for vessel ${vesselData.id}`);
          vesselData.nahkoda = null;
        }
      }
      
      // Get ABK count
      try {
        const abkCount = await VesselCrew.count({
          where: { 
            kapalId: vesselData.id,
            role: 'abk',
            isActive: true
          }
        });
        vesselData.abkCount = abkCount;
        const abkRows = await VesselCrew.findAll({
          where: { 
            kapalId: vesselData.id,
            role: 'abk',
            isActive: true
          },
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'nama', 'role']
          }]
        });
        vesselData.abkCount = abkRows.length;
        vesselData.abk = abkRows.map(row => row.User).filter(user => user); // Map to User objects for frontend compatibility
      } catch (err) {
        console.log(`⚠️ Error counting ABK for vessel ${vesselData.id}`);
        vesselData.abkCount = 0;
        vesselData.abk = [];
      }
      
      // Get GPS device info if assigned
      console.log(`🔍 [GPS DEBUG] Processing vessel ${vesselData.id} - GPS Device ID: ${vesselData.gpsDeviceId}`);
      
      if (vesselData.gpsDeviceId) {
        try {
          const { Perangkat } = require('../../models');
          const gpsDevice = await Perangkat.findByPk(vesselData.gpsDeviceId);
          if (gpsDevice) {
            vesselData.gpsDevice = {
              id: gpsDevice.id,
              namaPerangkat: gpsDevice.namaPerangkat,
              merk: gpsDevice.merk,
              model: gpsDevice.model,
              statusOperasional: gpsDevice.statusOperasional
            };
            console.log(`✅ [GPS DEBUG] GPS device loaded for vessel ${vesselData.id}:`, gpsDevice.namaPerangkat);
          } else {
            console.log(`❌ [GPS DEBUG] GPS device ${vesselData.gpsDeviceId} not found for vessel ${vesselData.id}`);
            vesselData.gpsDevice = null;
          }
        } catch (err) {
          console.log(`❌ [GPS DEBUG] Error loading GPS device for vessel ${vesselData.id}:`, err.message);
          vesselData.gpsDevice = null;
        }
      } else {
        console.log(`ℹ️ [GPS DEBUG] No GPS device assigned to vessel ${vesselData.id}`);
        vesselData.gpsDevice = null;
      }
      
      processedVessels.push(vesselData);
    }
    
    console.log('🗄️ Mengirim kapal yang telah diproses:', processedVessels.length);
    
    // Debug GPS devices in list
    console.log('📡 [GPS DEBUG] Final vessel list GPS summary:');
    processedVessels.forEach(v => {
      console.log(`- ${v.namaKapal}: GPS Device = ${v.gpsDevice ? v.gpsDevice.namaPerangkat : 'None'}`);
    });
    
    const responseData = processedVessels.map(vessel => ({
      ...vessel,
      gpsDevice: vessel.gpsDevice || null
    }));
    
    console.log('📤 [GPS DEBUG] Sending vessel list response with', responseData.filter(v => v.gpsDevice).length, 'vessels having GPS devices');
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching vessels:', error);
    res.status(500).json({ message: 'Gagal memuat data kapal: ' + error.message });
  }
};

exports.getKapalById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 [GPS DEBUG] Getting vessel by ID:', id);
    
    const vessel = await Kapal.findByPk(id, {
      include: [
        {
          model: require('../../models/monitoring/Perangkat'),
          as: 'gpsDevice',
          required: false
        },
        {
          model: HarborZone,
          as: 'pelabuhanAsalZone',
          required: false,
          attributes: ['id', 'name', 'type', 'coordinates', 'description']
        }
      ]
    });
    
    if (!vessel) {
      console.log('❌ [GPS DEBUG] Vessel not found for ID:', id);
      return res.status(404).json({ message: 'Kapal tidak ditemukan' });
    }
    
    const vesselData = vessel.toJSON();
    vesselData.kategoriKapal = getKategoriKapal(vesselData.beratKapal);
    console.log('📊 [GPS DEBUG] Vessel data loaded:', {
      id: vesselData.id,
      name: vesselData.namaKapal,
      gpsDeviceId: vesselData.gpsDeviceId
    });
    
    // Get GPS device info if assigned
    if (vesselData.gpsDeviceId) {
      console.log('🔍 [GPS DEBUG] Looking for GPS device ID:', vesselData.gpsDeviceId);
      try {
        const { Perangkat } = require('../../models');
        const gpsDevice = await Perangkat.findByPk(vesselData.gpsDeviceId);
        if (gpsDevice) {
          vesselData.gpsDevice = {
            id: gpsDevice.id,
            namaPerangkat: gpsDevice.namaPerangkat,
            merk: gpsDevice.merk,
            model: gpsDevice.model,
            statusOperasional: gpsDevice.statusOperasional
          };
          console.log('✅ [GPS DEBUG] GPS device found and added:', vesselData.gpsDevice);
        } else {
          console.log('❌ [GPS DEBUG] GPS device not found in database for ID:', vesselData.gpsDeviceId);
          vesselData.gpsDevice = null;
        }
      } catch (err) {
        console.log(`❌ [GPS DEBUG] Error loading GPS device:`, err.message);
        vesselData.gpsDevice = null;
      }
    } else {
      console.log('ℹ️ [GPS DEBUG] No GPS device assigned to vessel');
      vesselData.gpsDevice = null;
    }
    
    // Get nahkoda info if exists
    if (vesselData.nahkodaId) {
      try {
        const nahkoda = await User.findByPk(vesselData.nahkodaId, {
          attributes: ['id', 'username', 'nama', 'role']
        });
        vesselData.nahkoda = nahkoda;
      } catch (err) {
        console.log(`⚠️ Nahkoda not found for vessel ${vesselData.id}`);
        vesselData.nahkoda = null;
      }
    }
    
    // Get crew members (ABK)
    try {
      const crewMembers = await VesselCrew.findAll({
        where: { 
          kapalId: vesselData.id,
          role: 'abk',
          isActive: true
        },
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'nama', 'role']
        }]
      });
      vesselData.crewMembers = crewMembers;
      vesselData.abkCount = crewMembers.length;
    } catch (err) {
      console.log(`⚠️ Error getting crew for vessel ${vesselData.id}`);
      vesselData.crewMembers = [];
      vesselData.abkCount = 0;
    }
    
    console.log('✅ Kapal ditemukan:', vessel.namaKapal, 'dengan', vesselData.abkCount, 'ABK');
    
    // Debug GPS device
    console.log('📡 [GPS DEBUG] Final vessel data GPS info:', {
      gpsDeviceId: vesselData.gpsDeviceId,
      hasGpsDevice: !!vesselData.gpsDevice,
      gpsDeviceName: vesselData.gpsDevice?.namaPerangkat || 'None'
    });
    
    const responseData = {
      success: true, 
      data: {
        ...vesselData,
        gpsDevice: vesselData.gpsDevice || null
      }
    };
    
    console.log('📤 [GPS DEBUG] Sending response with GPS device:', !!responseData.data.gpsDevice);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching vessel by ID:', error);
    res.status(500).json({ message: 'Gagal memuat data kapal' });
  }
};

exports.createKapal = async (req, res) => {
  try {
    console.log('🚢 Membuat kapal baru:', req.body);
    
    const vesselData = {
      vesselId: req.body.vesselId || `VSL-${Date.now().toString().slice(-6)}`,
      namaKapal: req.body.namaKapal || req.body.name,
      nomorRegistrasi: req.body.nomorRegistrasi || req.body.registrationNumber || `REG-${Date.now()}`,
      nomorKapal: req.body.nomorKapal || req.body.vesselNumber || `KM-${Date.now().toString().slice(-3)}`,
      pemilik: req.body.pemilik || req.body.owner || 'Belum ada pemilik',
      tipeKapal: req.body.tipeKapal || 'penangkap_ikan',
      alatTangkap: req.body.alatTangkap || 'Jaring',
      panjangKapal: req.body.panjangKapal || req.body.length,
      lebarKapal: req.body.lebarKapal || req.body.width,
      tinggiKapal: req.body.tinggiKapal,
      beratKapal: req.body.beratKapal,
      netTonnage: req.body.netTonnage,
      spesifikasi: req.body.spesifikasi || { kapasitas: req.body.capacity || 0 },
      foto: req.body.foto || req.body.photo,
      statusOperasional: req.body.statusOperasional || 'active',
      statusPelayaran: req.body.statusPelayaran || req.body.sailingStatus || 'docked',
      nahkodaId: req.body.nahkodaId,
      gpsDeviceId: req.body.gpsDeviceId,
      mesin: req.body.mesin,
      gps: req.body.gps,
      sertifikatJalan: req.body.sertifikatJalan,
      dataBahanBakar: req.body.dataBahanBakar,
      asuransi: req.body.asuransi,
      pelabuhanAsal: req.body.pelabuhanAsal || null,
      pelabuhanAsalId: req.body.pelabuhanAsalId || null
    };
    
    const kapal = await Kapal.create(vesselData);
    
    // Assign GPS device if provided
    if (req.body.gpsDeviceId) {
      const { Perangkat } = require('../../models');
      await kapal.update({ gpsDeviceId: req.body.gpsDeviceId });
      await Perangkat.update(
        { kapalId: kapal.id },
        { where: { id: req.body.gpsDeviceId } }
      );
    }
    
    // Add ABK crew members
    if (req.body.abkIds && req.body.abkIds.length > 0) {
      const abkCrews = req.body.abkIds.map(userId => ({
        kapalId: kapal.id,
        userId: parseInt(userId),
        role: 'abk',
        isActive: true
      }));
      
      await VesselCrew.bulkCreate(abkCrews);
    }
    
    console.log('✅ Kapal berhasil dibuat:', kapal.id);
    res.status(201).json(kapal);
  } catch (error) {
    console.error('❌ Error creating vessel:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateKapal = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Memperbarui kapal:', id);
    
    const updateData = {
      vesselId: req.body.vesselId,
      namaKapal: req.body.namaKapal || req.body.name,
      nomorRegistrasi: req.body.nomorRegistrasi || req.body.registrationNumber,
      nomorKapal: req.body.nomorKapal || req.body.vesselNumber,
      pemilik: req.body.pemilik || req.body.owner,
      tipeKapal: req.body.tipeKapal,
      alatTangkap: req.body.alatTangkap,
      panjangKapal: req.body.panjangKapal || req.body.length,
      lebarKapal: req.body.lebarKapal || req.body.width,
      tinggiKapal: req.body.tinggiKapal,
      beratKapal: req.body.beratKapal,
      netTonnage: req.body.netTonnage,
      spesifikasi: req.body.spesifikasi || (req.body.capacity ? { kapasitas: req.body.capacity } : undefined),
      foto: req.body.foto || req.body.photo,
      statusOperasional: req.body.statusOperasional || req.body.status,
      statusPelayaran: req.body.statusPelayaran || req.body.sailingStatus,
      nahkodaId: req.body.nahkodaId,
      gpsDeviceId: req.body.gpsDeviceId,
      mesin: req.body.mesin,
      gps: req.body.gps,
      sertifikatJalan: req.body.sertifikatJalan,
      dataBahanBakar: req.body.dataBahanBakar,
      asuransi: req.body.asuransi,
      pelabuhanAsal: req.body.pelabuhanAsal || null,
      pelabuhanAsalId: req.body.pelabuhanAsalId !== undefined ? (req.body.pelabuhanAsalId || null) : undefined
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const [updated] = await Kapal.update(updateData, {
      where: { id }
    });
    
    // Update ABK crew members
    if (req.body.abkIds !== undefined) {
      console.log(`🔧 Updating ABK for vessel ${id}, abkIds:`, req.body.abkIds);
      
      // Remove existing ABK crew
      const deletedCount = await VesselCrew.destroy({
        where: {
          kapalId: id,
          role: 'abk'
        }
      });
      console.log(`🗑️ Deleted ${deletedCount} existing ABK records`);
      
      // Add new ABK crew
      if (req.body.abkIds && req.body.abkIds.length > 0) {
        const abkCrews = req.body.abkIds.map(userId => ({
          kapalId: parseInt(id),
          userId: parseInt(userId),
          role: 'abk',
          isActive: true
        }));
        
        console.log(`➕ Creating new ABK records:`, abkCrews);
        const createdCrew = await VesselCrew.bulkCreate(abkCrews);
        console.log(`✅ Created ${createdCrew.length} ABK records`);
        
        // Verify ABK was saved
        const verifyABK = await VesselCrew.findAll({
          where: { kapalId: parseInt(id), role: 'abk' },
          include: [{ model: User, as: 'User', attributes: ['id', 'username', 'nama'] }]
        });
        console.log(`🔍 Verification: Found ${verifyABK.length} ABK records after save:`, 
          verifyABK.map(v => ({ userId: v.userId, user: v.User ? v.User.nama : 'null' })));
        
      } else {
        console.log(`ℹ️ No ABK to assign for vessel ${id}`);
      }
    } else {
      console.log(`⚠️ abkIds not provided in request body for vessel ${id}`);
    }
    
    // Update GPS device assignment
    if (req.body.gpsDeviceId !== undefined) {
      console.log('🔍 [GPS DEBUG] Updating GPS device assignment:', {
        vesselId: id,
        oldGpsDeviceId: updateData.gpsDeviceId,
        newGpsDeviceId: req.body.gpsDeviceId
      });
      
      const { Perangkat } = require('../../models');
      
      // Clear previous GPS device assignment
      if (updateData.gpsDeviceId) {
        console.log('🔄 [GPS DEBUG] Clearing old GPS assignments for vessel', id);
        // Remove old assignment
        await Perangkat.update(
          { kapalId: null },
          { where: { kapalId: id } }
        );
        
        console.log('🔄 [GPS DEBUG] Setting new GPS assignment:', updateData.gpsDeviceId, 'to vessel', id);
        // Set new assignment
        await Perangkat.update(
          { kapalId: parseInt(id) },
          { where: { id: updateData.gpsDeviceId } }
        );
        
        console.log('✅ [GPS DEBUG] GPS device assignment updated successfully');
      } else {
        console.log('🔄 [GPS DEBUG] Removing all GPS devices from vessel', id);
        // Remove all GPS devices from this vessel
        await Perangkat.update(
          { kapalId: null },
          { where: { kapalId: id, jenisPerangkat: 'gps' } }
        );
      }
    }
    
    if (updated > 0) {
      const kapal = await Kapal.findByPk(id);
      console.log('✅ Kapal berhasil diperbarui');
      res.json(kapal);
    } else {
      res.status(404).json({ message: 'Kapal tidak ditemukan' });
    }
  } catch (error) {
    console.error('❌ Error updating vessel:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteKapal = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Menghapus kapal:', id);
    
    const deleted = await Kapal.destroy({ where: { id } });
    
    if (deleted > 0) {
      console.log('✅ Kapal berhasil dihapus');
      res.json({ message: 'Kapal berhasil dihapus' });
    } else {
      res.status(404).json({ message: 'Kapal tidak ditemukan' });
    }
  } catch (error) {
    console.error('❌ Error deleting vessel:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading, timestamp } = req.body;
    
    console.log('📍 Memperbarui lokasi kapal:', { id, latitude, longitude, speed });
    
    // Validate GPS data
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Koordinat GPS dan longitude diperlukan' });
    }
    
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Koordinat GPS tidak valid' });
    }
    
    const locationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed ? parseFloat(speed) : 0,
      heading: heading ? parseFloat(heading) : 0,
      timestamp: timestamp || new Date().toISOString(),
      accuracy: req.body.accuracy || 'high'
    };
    
    // Try to update in database
    try {
      const kapal = await Kapal.findByPk(id);
      if (!kapal) {
        return res.status(404).json({ message: 'Kapal tidak ditemukan' });
      }
      
      // Get existing GPS data or create new
      const existingGPS = kapal.gps || { locations: [] };
      
      // Add new location to history (keep last 100 locations)
      if (!existingGPS.locations) existingGPS.locations = [];
      existingGPS.locations.push(locationData);
      if (existingGPS.locations.length > 100) {
        existingGPS.locations = existingGPS.locations.slice(-100);
      }
      
      // Update current position
      existingGPS.currentPosition = locationData;
      existingGPS.lastUpdate = new Date().toISOString();
      existingGPS.isActive = true;
      
      // Determine vessel status based on speed
      let newStatus = 'docked';
      if (locationData.speed > 5) {
        newStatus = 'sailing';
      } else if (locationData.speed > 0.5) {
        newStatus = 'idle';
      }
      
      await kapal.update({ 
        gps: existingGPS,
        statusPelayaran: newStatus
      });
      
      console.log('✅ Lokasi GPS berhasil diperbarui dalam database');
      
      // Emit real-time update via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('vessel-location-update', {
          vesselId: id,
          location: locationData,
          status: newStatus
        });
      }
      
      res.json({ 
        success: true,
        message: 'Lokasi GPS berhasil diperbarui',
        data: {
          vesselId: id,
          location: locationData,
          status: newStatus
        }
      });
    } catch (dbError) {
      console.error('Gagal memperbarui GPS di database:', dbError);
      res.status(500).json({ message: 'Gagal menyimpan lokasi GPS' });
    }
  } catch (error) {
    console.error('❌ Error updating GPS location:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get active vessels with GPS tracking
exports.getActiveVessels = async (req, res) => {
  try {
    console.log('🔍 Mengambil kapal aktif dengan GPS...');
    
    const activeVessels = await Kapal.findAll({
      where: {
        statusOperasional: 'active'
      },
      attributes: [
        'id', 'namaKapal', 'nomorRegistrasi', 'pemilik', 
        'statusPelayaran', 'gps', 'nahkodaId'
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Transform data to include GPS status
    const vesselsWithGPS = activeVessels.map(vessel => {
      const vesselData = vessel.toJSON();
      const gpsData = vesselData.gps || {};
      
      return {
        ...vesselData,
        lastPosition: gpsData.currentPosition || null,
        isGPSActive: gpsData.isActive || false,
        lastGPSUpdate: gpsData.lastUpdate || null,
        locationHistory: gpsData.locations || [],
        status: vesselData.statusPelayaran || 'docked'
      };
    });
    
    // Filter vessels with recent GPS activity (last 24 hours)
    const now = new Date();
    const activeGPSVessels = vesselsWithGPS.filter(vessel => {
      if (!vessel.lastGPSUpdate) return false;
      const lastUpdate = new Date(vessel.lastGPSUpdate);
      const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
      return hoursDiff <= 24; // Active if updated within 24 hours
    });
    
    console.log(`📊 Ditemukan ${vesselsWithGPS.length} kapal, ${activeGPSVessels.length} dengan GPS aktif`);
    
    res.json({
      success: true,
      data: {
        totalVessels: vesselsWithGPS.length,
        activeGPSVessels: activeGPSVessels.length,
        vessels: vesselsWithGPS
      }
    });
  } catch (error) {
    console.error('❌ Error getting active vessels:', error);
    res.status(500).json({ message: 'Gagal memuat data kapal aktif' });
  }
};

// Debug endpoint to check VesselCrew data
exports.debugVesselCrew = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Debug: Checking VesselCrew for vessel ${id}`);
    
    // Get all VesselCrew records for this vessel
    const allCrew = await VesselCrew.findAll({
      where: { kapalId: id },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'nama', 'role']
      }]
    });
    
    console.log(`📊 Found ${allCrew.length} crew records for vessel ${id}`);
    
    const result = {
      vesselId: id,
      totalCrew: allCrew.length,
      crewData: allCrew.map(crew => ({
        id: crew.id,
        userId: crew.userId,
        role: crew.role,
        isActive: crew.isActive,
        user: crew.User ? {
          id: crew.User.id,
          username: crew.User.username,
          nama: crew.User.nama,
          role: crew.User.role
        } : null
      }))
    };
    
    console.log('🔍 Debug result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get vessel GPS history
exports.getVesselGPSHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;
    
    const kapal = await Kapal.findByPk(id, {
      attributes: ['id', 'namaKapal', 'gps']
    });
    
    if (!kapal) {
      return res.status(404).json({ message: 'Kapal tidak ditemukan' });
    }
    
    const gpsData = kapal.gps || {};
    let locations = gpsData.locations || [];
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      locations = locations.filter(loc => {
        const locDate = new Date(loc.timestamp);
        return locDate >= start && locDate <= end;
      });
    }
    
    // Limit results
    locations = locations.slice(-parseInt(limit));
    
    res.json({
      success: true,
      data: {
        vesselId: id,
        vesselName: kapal.namaKapal,
        currentPosition: gpsData.currentPosition || null,
        locationHistory: locations,
        totalLocations: locations.length,
        isActive: gpsData.isActive || false,
        lastUpdate: gpsData.lastUpdate || null
      }
    });
  } catch (error) {
    console.error('❌ Error getting GPS history:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available GPS devices
exports.getAvailableGPSDevices = async (req, res) => {
  try {
    console.log('📡 [GPS DEBUG] Fetching available GPS devices...');
    const { Perangkat } = require('../../models');
    
    const gpsDevices = await Perangkat.findAll({
      where: {
        jenisPerangkat: 'gps'
        // Remove statusOperasional filter to show all GPS devices
      },
      attributes: ['id', 'namaPerangkat', 'merk', 'model', 'kapalId', 'statusOperasional', 'kondisi'],
      order: [['namaPerangkat', 'ASC']]
    });
    
    console.log('📡 [GPS DEBUG] Found GPS devices:', gpsDevices.length);
    gpsDevices.forEach(device => {
      console.log(`- ID: ${device.id}, Name: ${device.namaPerangkat}, Status: ${device.statusOperasional}, Assigned to: ${device.kapalId || 'None'}`);
    });
    
    res.json({
      success: true,
      data: gpsDevices
    });
  } catch (error) {
    console.error('❌ Error getting GPS devices:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET alat tangkap rekomendasi berdasarkan GT
exports.getAlatTangkapOptions = (req, res) => {
  const { gt } = req.query;
  const kategori = getKategoriKapal(gt);
  const semua = {
    kecil:          getAlatTangkapByKategori('kecil'),
    menengah_kecil: getAlatTangkapByKategori('menengah_kecil'),
    menengah:       getAlatTangkapByKategori('menengah'),
    besar:          getAlatTangkapByKategori('besar'),
  };
  res.json({
    success: true,
    data: {
      kategori,
      rekomendasiUntukGT: kategori ? getAlatTangkapByKategori(kategori.kode) : Object.values(semua).flat(),
      semua
    }
  });
};