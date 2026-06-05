const Kapal = require('../../models/vessel/Kapal');
const multer = require('multer');
const path = require('path');
const { sequelize } = require('../../config/database');
const uploadHelper = require('../../utils/uploadHelper');
const { sanitizeString } = require('../../middleware/vessel/vesselValidation');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Upload sertifikat jalan
exports.uploadSertifikatJalan = async (req, res) => {
  console.log('🚀 uploadSertifikatJalan called for vessel:', kapalId);
  
  // Only log detailed info in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('📋 Request params:', req.params);
    console.log('📋 Request body:', req.body);
    console.log('📎 Request file:', req.file ? 'File present' : 'No file');
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    const { kapalId } = req.params;
    let { nama, tanggalBerlaku, nomorSertifikat } = req.body;
    
    // Sanitize inputs
    nama = sanitizeString(nama || 'Sertifikat Jalan');
    nomorSertifikat = sanitizeString(nomorSertifikat);
    
    // Validate file
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'File sertifikat wajib diupload' 
      });
    }

    const fileErrors = uploadHelper.validateFile(req.file);
    if (fileErrors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Validasi file gagal',
        errors: fileErrors 
      });
    }
    
    // Lock row for update
    const kapal = await Kapal.findByPk(kapalId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!kapal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    // Save file to disk
    const fileInfo = await uploadHelper.saveFile(
      req.file.buffer, 
      req.file.originalname,
      `sertifikat/${kapalId}`
    );

    const sertifikatData = {
      id: Date.now().toString(),
      nama,
      nomorSertifikat,
      tanggalBerlaku: new Date(tanggalBerlaku),
      fileName: fileInfo.fileName,
      filePath: fileInfo.filePath,
      fileUrl: uploadHelper.getFileUrl(fileInfo.filePath),
      uploadedAt: new Date(),
      uploadedBy: req.user?.userId || req.user?.id
    };

    // Get existing sertifikat or create new array
    const existingSertifikat = kapal.sertifikatJalan || [];
    existingSertifikat.push(sertifikatData);

    await kapal.update(
      { sertifikatJalan: existingSertifikat },
      { transaction }
    );

    await transaction.commit();

    // Don't send full file path in response
    const responseData = { ...sertifikatData };
    delete responseData.filePath;

    res.json({
      success: true,
      message: 'Sertifikat jalan berhasil diupload',
      data: responseData
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error uploading sertifikat jalan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengupload sertifikat' 
    });
  }
};

// Upload data bahan bakar
exports.uploadDataBahanBakar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { kapalId } = req.params;
    let { 
      jenisBahanBakar, 
      jumlahLiter, 
      hargaPerLiter, 
      totalHarga, 
      tanggalPengisian, 
      lokasiPengisian,
      keterangan 
    } = req.body;
    
    // Sanitize inputs
    jenisBahanBakar = sanitizeString(jenisBahanBakar || 'Solar');
    lokasiPengisian = sanitizeString(lokasiPengisian);
    keterangan = sanitizeString(keterangan);
    
    // Validate numeric inputs
    jumlahLiter = parseFloat(jumlahLiter);
    hargaPerLiter = parseFloat(hargaPerLiter);
    totalHarga = parseFloat(totalHarga);
    
    if (isNaN(jumlahLiter) || jumlahLiter <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Jumlah liter tidak valid' 
      });
    }
    
    // Lock row for update
    const kapal = await Kapal.findByPk(kapalId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!kapal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    let fileInfo = null;
    if (req.file) {
      const fileErrors = uploadHelper.validateFile(req.file);
      if (fileErrors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: 'Validasi file gagal',
          errors: fileErrors 
        });
      }
      
      fileInfo = await uploadHelper.saveFile(
        req.file.buffer, 
        req.file.originalname,
        `bahan-bakar/${kapalId}`
      );
    }

    const bahanBakarData = {
      id: Date.now().toString(),
      jenisBahanBakar,
      jumlahLiter,
      hargaPerLiter,
      totalHarga,
      tanggalPengisian: new Date(tanggalPengisian),
      lokasiPengisian,
      keterangan,
      buktiFileName: fileInfo?.fileName || null,
      buktiFilePath: fileInfo?.filePath || null,
      buktiFileUrl: fileInfo ? uploadHelper.getFileUrl(fileInfo.filePath) : null,
      uploadedAt: new Date(),
      uploadedBy: req.user?.userId || req.user?.id
    };

    // Get existing data or create new array
    const existingData = kapal.dataBahanBakar || [];
    existingData.push(bahanBakarData);

    await kapal.update(
      { dataBahanBakar: existingData },
      { transaction }
    );

    await transaction.commit();

    // Don't send full file path in response
    const responseData = { ...bahanBakarData };
    delete responseData.buktiFilePath;

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diupload',
      data: responseData
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error uploading data bahan bakar:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengupload data bahan bakar' 
    });
  }
};

// Update data bahan bakar
exports.updateDataBahanBakar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { kapalId, fuelId } = req.params;
    let { 
      jenisBahanBakar, 
      jumlahLiter, 
      hargaPerLiter, 
      totalHarga, 
      tanggalPengisian, 
      lokasiPengisian,
      keterangan 
    } = req.body;
    
    // Sanitize inputs
    jenisBahanBakar = sanitizeString(jenisBahanBakar || 'Solar');
    lokasiPengisian = sanitizeString(lokasiPengisian);
    keterangan = sanitizeString(keterangan);
    
    // Validate numeric inputs
    jumlahLiter = parseFloat(jumlahLiter);
    hargaPerLiter = parseFloat(hargaPerLiter);
    totalHarga = parseFloat(totalHarga);
    
    if (isNaN(jumlahLiter) || jumlahLiter <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Jumlah liter tidak valid' 
      });
    }
    
    const kapal = await Kapal.findByPk(kapalId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!kapal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    const existingData = kapal.dataBahanBakar || [];
    console.log('Available fuel IDs:', existingData.map(item => item.id));
    console.log('Looking for fuel ID:', fuelId);
    
    const fuelIndex = existingData.findIndex(item => item.id === fuelId || item.id === String(fuelId));
    
    if (fuelIndex === -1) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: `Data bahan bakar tidak ditemukan. Available IDs: ${existingData.map(item => item.id).join(', ')}` 
      });
    }

    const existingFuel = existingData[fuelIndex];
    let fileInfo = null;
    
    // Handle new file upload
    if (req.file) {
      const fileErrors = uploadHelper.validateFile(req.file);
      if (fileErrors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: 'Validasi file gagal',
          errors: fileErrors 
        });
      }
      
      // Delete old file if exists
      if (existingFuel.buktiFilePath) {
        const deleteResult = await uploadHelper.deleteFile(existingFuel.buktiFilePath);
        if (deleteResult) {
          console.log('Old file deleted successfully');
        } else {
          console.warn('Failed to delete old file, but continuing with update');
        }
      }
      
      fileInfo = await uploadHelper.saveFile(
        req.file.buffer, 
        req.file.originalname,
        `bahan-bakar/${kapalId}`
      );
    }

    // Update fuel data
    const updatedFuelData = {
      ...existingFuel,
      jenisBahanBakar,
      jumlahLiter,
      hargaPerLiter,
      totalHarga,
      tanggalPengisian: new Date(tanggalPengisian),
      lokasiPengisian,
      keterangan,
      buktiFileName: fileInfo?.fileName || existingFuel.buktiFileName,
      buktiFilePath: fileInfo?.filePath || existingFuel.buktiFilePath,
      buktiFileUrl: fileInfo ? uploadHelper.getFileUrl(fileInfo.filePath) : existingFuel.buktiFileUrl,
      updatedAt: new Date(),
      updatedBy: req.user?.userId || req.user?.id
    };

    existingData[fuelIndex] = updatedFuelData;

    // Use raw SQL to ensure JSON update is committed
    await sequelize.query(
      'UPDATE kapals SET dataBahanBakar = :data WHERE id = :kapalId',
      {
        replacements: { 
          data: JSON.stringify(existingData), 
          kapalId: kapalId 
        },
        transaction
      }
    );

    await transaction.commit();

    console.log('Updated fuel data saved successfully with raw SQL');
    console.log('Verification - Updated data:', updatedFuelData);

    // Don't send full file path in response
    const responseData = { ...updatedFuelData };
    delete responseData.buktiFilePath;

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil diperbarui',
      data: responseData
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating data bahan bakar:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui data bahan bakar' 
    });
  }
};

// Delete data bahan bakar
exports.deleteDataBahanBakar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { kapalId, fuelId } = req.params;
    
    const kapal = await Kapal.findByPk(kapalId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!kapal) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    const existingData = kapal.dataBahanBakar || [];
    console.log('Available fuel IDs for delete:', existingData.map(item => item.id));
    console.log('Looking for fuel ID to delete:', fuelId);
    
    const fuelIndex = existingData.findIndex(item => item.id === fuelId || item.id === String(fuelId));
    
    if (fuelIndex === -1) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: `Data bahan bakar tidak ditemukan. Available IDs: ${existingData.map(item => item.id).join(', ')}` 
      });
    }

    const fuelToDelete = existingData[fuelIndex];
    
    // Delete associated file if exists
    if (fuelToDelete.buktiFilePath) {
      const deleteResult = await uploadHelper.deleteFile(fuelToDelete.buktiFilePath);
      if (deleteResult) {
        console.log('File deleted successfully during fuel deletion');
      } else {
        console.warn('Failed to delete file, but continuing with data deletion');
      }
    }

    // Remove from array
    existingData.splice(fuelIndex, 1);

    await kapal.update(
      { dataBahanBakar: existingData },
      { transaction }
    );

    // Force reload to ensure data is saved
    await kapal.reload({ transaction });

    await transaction.commit();

    console.log('Fuel data deleted successfully');

    res.json({
      success: true,
      message: 'Data bahan bakar berhasil dihapus'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting data bahan bakar:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus data bahan bakar' 
    });
  }
};

// Get vessel documents and fuel data
exports.getVesselDocuments = async (req, res) => {
  try {
    const { kapalId } = req.params;
    
    console.log('Getting fresh fuel data for vessel:', kapalId);
    
    // Force fresh data with explicit query
    const kapal = await Kapal.findByPk(kapalId, {
      attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'sertifikatJalan', 'dataBahanBakar'],
      raw: false
    });
    
    if (!kapal) {
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    // Force fresh reload from database
    await kapal.reload();
    
    // Get fresh data directly as backup
    const freshData = await Kapal.findByPk(kapalId, {
      attributes: ['sertifikatJalan', 'dataBahanBakar'],
      raw: true
    });
    
    console.log('Current fuel data count:', (freshData?.dataBahanBakar || kapal.dataBahanBakar || []).length);

    // Remove sensitive file paths from response
    const sertifikat = (freshData?.sertifikatJalan || kapal.sertifikatJalan || []).map(s => {
      const { filePath, ...rest } = s;
      return rest;
    });

    const bahanBakar = (freshData?.dataBahanBakar || kapal.dataBahanBakar || []).map(b => {
      const { buktiFilePath, ...rest } = b;
      return rest;
    });

    res.json({
      success: true,
      data: {
        kapal: {
          id: kapal.id,
          namaKapal: kapal.namaKapal,
          nomorRegistrasi: kapal.nomorRegistrasi
        },
        sertifikatJalan: sertifikat,
        dataBahanBakar: bahanBakar
      }
    });
  } catch (error) {
    console.error('Error fetching vessel documents:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data dokumen' 
    });
  }
};

// Get fuel consumption summary
exports.getFuelSummary = async (req, res) => {
  try {
    const { kapalId } = req.params;
    const { startDate, endDate } = req.query || {};
    
    // Force fresh data from database with explicit query
    const kapal = await Kapal.findByPk(kapalId, {
      attributes: ['id', 'namaKapal', 'dataBahanBakar'],
      raw: false
    });
    
    if (!kapal) {
      return res.status(404).json({ 
        success: false,
        message: 'Kapal tidak ditemukan' 
      });
    }

    // Force reload from database to get latest data
    await kapal.reload();
    
    // Get fresh data directly from database as backup
    const freshKapal = await Kapal.findByPk(kapalId, {
      attributes: ['dataBahanBakar'],
      raw: true
    });
    
    // Use fresh data if available
    let fuelData = freshKapal?.dataBahanBakar || kapal.dataBahanBakar || [];
    
    console.log('🔍 Fuel data count:', fuelData.length);
    console.log('📊 Sample fuel data:', fuelData[0] ? JSON.stringify(fuelData[0], null, 2) : 'No data');
    console.log('📋 All fuel data IDs:', fuelData.map(f => f.id));
    console.log('⛽ Total liters from all records:', fuelData.reduce((sum, data) => sum + (data.jumlahLiter || 0), 0));
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      fuelData = fuelData.filter(data => {
        const fuelDate = new Date(data.tanggalPengisian);
        return fuelDate >= start && fuelDate <= end;
      });
    }

    // Remove sensitive file paths
    const sanitizedFuelData = fuelData.map(data => {
      const { buktiFilePath, ...rest } = data;
      return rest;
    });

    // Calculate summary
    const summary = {
      totalPengisian: fuelData.length,
      totalLiter: Math.round(fuelData.reduce((sum, data) => sum + (data.jumlahLiter || 0), 0) * 100) / 100,
      totalBiaya: Math.round(fuelData.reduce((sum, data) => sum + (data.totalHarga || 0), 0)),
      rataRataHarga: fuelData.length > 0 ? 
        Math.round(fuelData.reduce((sum, data) => sum + (data.hargaPerLiter || 0), 0) / fuelData.length) : 0,
      pengisianTerakhir: fuelData.length > 0 ? 
        (() => {
          const latest = [...fuelData].sort((a, b) => new Date(b.tanggalPengisian) - new Date(a.tanggalPengisian))[0];
          const { buktiFilePath, ...sanitizedLatest } = latest;
          return sanitizedLatest;
        })() : null
    };

    res.json({
      success: true,
      data: {
        kapal: {
          id: kapal.id,
          namaKapal: kapal.namaKapal
        },
        summary,
        details: sanitizedFuelData
      }
    });
  } catch (error) {
    console.error('Error fetching fuel summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil ringkasan bahan bakar' 
    });
  }
};



// Get vessel by nahkoda ID (for mobile app)
exports.getMyVessel = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    console.log('🔍 Finding vessel for nahkoda:', userId);
    
    const vessel = await Kapal.findOne({
      where: { nahkodaId: userId }
    });
    
    if (!vessel) {
      console.log('❌ No vessel found for nahkoda:', userId);
      return res.status(404).json({
        success: false,
        message: 'Anda belum ditugaskan ke kapal manapun'
      });
    }
    
    console.log('✅ Vessel found:', vessel.namaKapal);
    
    res.json({
      success: true,
      data: vessel
    });
  } catch (error) {
    console.error('❌ Error in getMyVessel:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kapal'
    });
  }
};

module.exports = { 
  upload,
  uploadSertifikatJalan: exports.uploadSertifikatJalan,
  uploadDataBahanBakar: exports.uploadDataBahanBakar,
  updateDataBahanBakar: exports.updateDataBahanBakar,
  deleteDataBahanBakar: exports.deleteDataBahanBakar,
  getVesselDocuments: exports.getVesselDocuments,
  getFuelSummary: exports.getFuelSummary,
  getMyVessel: exports.getMyVessel
};