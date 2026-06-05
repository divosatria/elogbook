const { Trip, Kapal, User } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { sanitizeString } = require('../middleware/vesselValidation');

// Configure multer for trip document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const tripId = req.params.id;
      const uploadDir = path.join(__dirname, '../../uploads/trip-documents', tripId.toString());
      
      // Create directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const { jenisDokumen } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedType = jenisDokumen ? sanitizeString(jenisDokumen).toLowerCase().replace(/\s+/g, '-') : 'dokumen';
    cb(null, `${sanitizedType}-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Gunakan PDF, JPG, atau PNG'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// Upload trip document
exports.uploadTripDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { jenisDokumen, keterangan } = req.body;
    
    console.log('📄 Uploading trip document:', { tripId: id, jenisDokumen });
    
    // Validate required fields
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File dokumen wajib diupload'
      });
    }
    
    if (!jenisDokumen) {
      return res.status(400).json({
        success: false,
        message: 'Jenis dokumen wajib diisi'
      });
    }
    
    // Validate document type
    const validDocTypes = ['izinMelaut', 'dokumenKapal', 'asuransi'];
    if (!validDocTypes.includes(jenisDokumen)) {
      return res.status(400).json({
        success: false,
        message: 'Jenis dokumen tidak valid. Pilih: izinMelaut, dokumenKapal, atau asuransi'
      });
    }
    
    // Get trip
    const trip = await Trip.findByPk(id, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['namaKapal']
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama']
        }
      ]
    });
    
    if (!trip) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Check authorization - only nahkoda of this trip or admin can upload
    const isNahkoda = trip.nahkodaId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isNahkoda && !isAdmin) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk mengupload dokumen trip ini'
      });
    }
    
    // Prepare document metadata
    const fileUrl = `/uploads/trip-documents/${id}/${req.file.filename}`;
    const documentData = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
      uploadedBy: req.user.userId,
      keterangan: keterangan || null
    };
    
    // Update trip perizinan
    let perizinan = trip.perizinan || {
      dokumen: {
        izinMelaut: false,
        dokumenKapal: false,
        asuransi: false
      },
      operasional: {
        kapasitasBensin: 0,
        bensinTersedia: 0,
        kapasitasEs: 0,
        esTersedia: 0
      }
    };
    
    // Initialize dokumen object if not exists
    if (!perizinan.dokumen) {
      perizinan.dokumen = {
        izinMelaut: false,
        dokumenKapal: false,
        asuransi: false
      };
    }
    
    // Mark document as uploaded
    perizinan.dokumen[jenisDokumen] = true;
    
    // Store document metadata
    if (!perizinan.dokumentasi) {
      perizinan.dokumentasi = {};
    }
    perizinan.dokumentasi[jenisDokumen] = documentData;
    
    // Check if all documents are complete
    const allDocsComplete = perizinan.dokumen.izinMelaut && 
                           perizinan.dokumen.dokumenKapal && 
                           perizinan.dokumen.asuransi;
    
    // Auto-update status if all documents complete
    if (allDocsComplete && trip.status === 'menunggu_dokumen') {
      trip.status = 'menunggu_izin';
      console.log('✅ All documents complete, status updated to menunggu_izin');
    }
    
    // Force Sequelize to detect JSON field change
    trip.perizinan = perizinan;
    trip.changed('perizinan', true);
    await trip.save();
    
    console.log('✅ Trip document uploaded:', jenisDokumen, 'for trip:', id);
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('trip_document_uploaded', {
        tripId: id,
        documentType: jenisDokumen,
        status: trip.status
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Dokumen ${jenisDokumen} berhasil diupload${allDocsComplete ? '. Semua dokumen lengkap, menunggu persetujuan admin.' : ''}`,
      data: {
        tripId: id,
        jenisDokumen,
        fileName: req.file.filename,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        uploadedAt: documentData.uploadedAt,
        keterangan: keterangan,
        tripStatus: trip.status,
        allDocumentsComplete: allDocsComplete,
        documents: {
          izinMelaut: perizinan.dokumen.izinMelaut,
          dokumenKapal: perizinan.dokumen.dokumenKapal,
          asuransi: perizinan.dokumen.asuransi
        }
      }
    });
  } catch (error) {
    console.error('❌ Upload trip document error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
    }
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload dokumen: ' + error.message
    });
  }
};

// Get trip documents
exports.getTripDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await Trip.findByPk(id, {
      include: [
        {
          model: Kapal,
          as: 'kapal',
          attributes: ['namaKapal', 'nomorRegistrasi']
        },
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'nama']
        }
      ]
    });
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Check authorization
    const isNahkoda = trip.nahkodaId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const isABK = trip.awakKapal && trip.awakKapal.includes(req.user.userId);
    
    if (!isNahkoda && !isAdmin && !isABK) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melihat dokumen trip ini'
      });
    }
    
    const perizinan = trip.perizinan || {};
    const dokumen = perizinan.dokumen || {};
    const dokumentasi = perizinan.dokumentasi || {};
    
    // Prepare document list
    const documents = [];
    const docTypes = ['izinMelaut', 'dokumenKapal', 'asuransi'];
    
    for (const docType of docTypes) {
      const isUploaded = dokumen[docType] === true;
      const metadata = dokumentasi[docType] || null;
      
      documents.push({
        jenisDokumen: docType,
        displayName: docType === 'izinMelaut' ? 'Izin Melaut' : 
                     docType === 'dokumenKapal' ? 'Dokumen Kapal' : 'Asuransi',
        isUploaded: isUploaded,
        fileName: metadata?.fileName || null,
        fileUrl: metadata?.fileUrl || null,
        fileSize: metadata?.fileSize || null,
        uploadedAt: metadata?.uploadedAt || null,
        uploadedBy: metadata?.uploadedBy || null,
        keterangan: metadata?.keterangan || null
      });
    }
    
    const allDocsComplete = dokumen.izinMelaut && dokumen.dokumenKapal && dokumen.asuransi;
    
    res.json({
      success: true,
      data: {
        tripId: id,
        tripStatus: trip.status,
        vesselName: trip.kapal?.namaKapal,
        nahkoda: trip.nahkoda?.nama,
        allDocumentsComplete: allDocsComplete,
        documents: documents,
        completionPercentage: Math.round((documents.filter(d => d.isUploaded).length / 3) * 100)
      }
    });
  } catch (error) {
    console.error('❌ Get trip documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat dokumen trip: ' + error.message
    });
  }
};

// Delete trip document
exports.deleteTripDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    
    console.log('🗑️ Deleting trip document:', { tripId: id, documentType });
    
    // Validate document type
    const validDocTypes = ['izinMelaut', 'dokumenKapal', 'asuransi'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Jenis dokumen tidak valid'
      });
    }
    
    const trip = await Trip.findByPk(id);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip tidak ditemukan'
      });
    }
    
    // Check authorization - only nahkoda of this trip or admin can delete
    const isNahkoda = trip.nahkodaId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isNahkoda && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk menghapus dokumen trip ini'
      });
    }
    
    const perizinan = trip.perizinan || {};
    const dokumentasi = perizinan.dokumentasi || {};
    
    // Check if document exists
    if (!dokumentasi[documentType]) {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tidak ditemukan'
      });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', dokumentasi[documentType].fileUrl);
    try {
      await fs.unlink(filePath);
      console.log('✅ File deleted:', filePath);
    } catch (fileError) {
      console.error('⚠️ Error deleting file:', fileError);
      // Continue even if file deletion fails
    }
    
    // Update perizinan
    perizinan.dokumen[documentType] = false;
    delete dokumentasi[documentType];
    perizinan.dokumentasi = dokumentasi;
    
    // Check if all documents are still complete
    const allDocsComplete = perizinan.dokumen.izinMelaut && 
                           perizinan.dokumen.dokumenKapal && 
                           perizinan.dokumen.asuransi;
    
    // Revert status if documents are no longer complete
    if (!allDocsComplete && trip.status === 'menunggu_izin') {
      trip.status = 'menunggu_dokumen';
      console.log('⚠️ Documents incomplete, status reverted to menunggu_dokumen');
    }
    
    // Force Sequelize to detect JSON field change
    trip.perizinan = perizinan;
    trip.changed('perizinan', true);
    await trip.save();
    
    console.log('✅ Trip document deleted:', documentType);
    
    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('trip_document_deleted', {
        tripId: id,
        documentType: documentType,
        status: trip.status
      });
    }
    
    res.json({
      success: true,
      message: `Dokumen ${documentType} berhasil dihapus`,
      data: {
        tripId: id,
        documentType: documentType,
        tripStatus: trip.status,
        allDocumentsComplete: allDocsComplete
      }
    });
  } catch (error) {
    console.error('❌ Delete trip document error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus dokumen: ' + error.message
    });
  }
};

module.exports = {
  upload,
  uploadTripDocument: exports.uploadTripDocument,
  getTripDocuments: exports.getTripDocuments,
  deleteTripDocument: exports.deleteTripDocument
};
