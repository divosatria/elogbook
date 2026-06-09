const { User } = require('../../models');
const multer = require('multer');
const path = require('path');
const { sequelize } = require('../../config/database');
const { Sequelize } = require('sequelize');
const uploadHelper = require('../../utils/uploadHelper');
const { sanitizeString } = require('../../middleware/vessel/vesselValidation');

// Configure multer
const storage = multer.diskStorage({ destination: (req, file, cb) => { const fs = require("fs"); const dir = "uploads/temp"; if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); cb(null, dir); }, filename: (req, file, cb) => { cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname.replace(/\s+/g, "_")); } });
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Upload dokumen profile (KTP, SIM, Sertifikat, dll)
exports.uploadProfileDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('=== DEBUG UPLOAD DOCUMENT ===');
    console.log('Body:', req.body);
    console.log('File:', req.file ? 'Present' : 'Missing');
    console.log('jenisDokumen:', req.body.jenisDokumen);
    console.log('nomorDokumen:', `"${req.body.nomorDokumen}"`);
    console.log('tanggalBerlaku:', `"${req.body.tanggalBerlaku}"`);
    console.log('==============================');

    const userId = req.user.userId;
    let { jenisDokumen, nomorDokumen, tanggalBerlaku, keterangan } = req.body;
    
    // Sanitize inputs
    jenisDokumen = sanitizeString(jenisDokumen);
    keterangan = sanitizeString(keterangan);
    
    // Validate file
    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'File dokumen wajib diupload' 
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
    
    // Category 1: KTP dan Pas Foto - hanya butuh file
    // Category 2: NPWP - butuh nomor, tidak butuh tanggal
    // Category 3: Lainnya - butuh nomor dan tanggal
    const category1Docs = ['KTP', 'Pas Foto'];
    const category2Docs = ['NPWP'];
    
    if (!category1Docs.includes(jenisDokumen)) {
      // Category 2 & 3 butuh nomor dokumen
      if (!nomorDokumen) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: `Nomor dokumen wajib diisi untuk ${jenisDokumen}` 
        });
      }
      nomorDokumen = sanitizeString(nomorDokumen);
      
      // Category 3 butuh tanggal berlaku (selain NPWP)
      if (!category2Docs.includes(jenisDokumen) && !tanggalBerlaku) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: `Tanggal berlaku wajib diisi untuk ${jenisDokumen}` 
        });
      }
    }
    
    // Lock row for update
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    // Save file to disk
    const fileInfo = await uploadHelper.saveFile(
      (req.file.buffer || req.file.path), 
      req.file.originalname,
      `profile-documents/${userId}`
    );

    const dokumenData = {
      id: Date.now().toString(),
      jenisDokumen,
      nomorDokumen: category1Docs.includes(jenisDokumen) ? null : nomorDokumen,
      tanggalBerlaku: (category1Docs.includes(jenisDokumen) || category2Docs.includes(jenisDokumen)) ? null : (tanggalBerlaku ? new Date(tanggalBerlaku) : null),
      keterangan,
      fileName: fileInfo.fileName,
      filePath: fileInfo.filePath,
      fileUrl: uploadHelper.getFileUrl(fileInfo.filePath),
      status: 'pending',
      uploadedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    // Get existing documents or create new array
    const existingDokumen = user.dokumen || [];
    console.log('=== UPLOAD DEBUG ===');
    console.log('User ID:', userId);
    console.log('Existing documents count:', existingDokumen.length);
    console.log('New document:', dokumenData.jenisDokumen);
    
    existingDokumen.push(dokumenData);
    console.log('After push, total documents:', existingDokumen.length);

    // Force Sequelize to recognize JSON field change
    user.dokumen = existingDokumen;
    user.changed('dokumen', true);
    await user.save({ transaction });
    
    console.log('Document saved to DB');
    console.log('=== END UPLOAD DEBUG ===');

    await transaction.commit();

    // Don't send full file path in response
    const responseData = { ...dokumenData };
    delete responseData.filePath;

    res.json({
      success: true,
      message: 'Dokumen berhasil diupload dan menunggu verifikasi admin',
      data: responseData
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error uploading profile document:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengupload dokumen' 
    });
  }
};

// Get profile documents
exports.getProfileDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📥 [GET DOCS] Fetching documents for user:', userId);
    
    // Force fresh read from database, bypass any caching
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'nama', 'noTelepon', 'dokumen'],
      raw: false, // Ensure we get model instance
      rejectOnEmpty: false
    });
    
    if (!user) {
      console.log('❌ [GET DOCS] User not found:', userId);
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    console.log('=== GET PROFILE DOCUMENTS DEBUG ===');
    console.log('👤 [GET DOCS] User ID:', userId);
    console.log('👤 [GET DOCS] User Name:', user.nama);
    console.log('📄 [GET DOCS] Raw dokumen from DB:', JSON.stringify(user.dokumen, null, 2));
    console.log('📊 [GET DOCS] Total documents:', (user.dokumen || []).length);
    
    // Log each document status
    (user.dokumen || []).forEach((doc, idx) => {
      console.log(`📄 [GET DOCS] Doc[${idx}]: id="${doc.id}", jenis="${doc.jenisDokumen}", status="${doc.status}"`);
    });

    // Remove sensitive file paths from response
    const dokumen = (user.dokumen || []).map(d => {
      const { filePath, ...rest } = d;
      return rest;
    });

    console.log('📤 [GET DOCS] Documents to send:', JSON.stringify(dokumen, null, 2));
    console.log('=== END GET PROFILE DOCUMENTS DEBUG ===');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nama: user.nama,
          noTelepon: user.noTelepon
        },
        dokumen
      }
    });
  } catch (error) {
    console.error('❌ [GET DOCS] Error fetching profile documents:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data dokumen' 
    });
  }
};

// Delete profile document
exports.deleteProfileDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.userId;
    const { documentId } = req.params;
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    const existingDokumen = user.dokumen || [];
    const documentIndex = existingDokumen.findIndex(d => d.id === documentId);
    
    if (documentIndex === -1) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Dokumen tidak ditemukan' 
      });
    }

    // Delete file from disk
    const document = existingDokumen[documentIndex];
    if (document.filePath) {
      await uploadHelper.deleteFile(document.filePath);
    }

    // Remove from array
    existingDokumen.splice(documentIndex, 1);

    await user.update(
      { dokumen: existingDokumen },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Dokumen berhasil dihapus'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting profile document:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus dokumen' 
    });
  }
};

// Admin: Approve document
exports.approveDocument = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });
  
  try {
    const { userId, documentId } = req.params;
    const adminId = req.user.userId;
    
    console.log('🔄 [APPROVE] Starting approval process');
    console.log('📋 [APPROVE] Params:', { userId, documentId, adminId });
    console.log('📋 [APPROVE] Document ID type:', typeof documentId, 'Value:', `"${documentId}"`);
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      console.log('❌ [APPROVE] User not found:', userId);
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    console.log('👤 [APPROVE] User found:', user.nama);
    console.log('📄 [APPROVE] Current documents count:', (user.dokumen || []).length);
    console.log('📄 [APPROVE] Current documents:', JSON.stringify(user.dokumen, null, 2));

    // 🛠️ FIX: Deep clone array to ensure Sequelize detects changes
    const existingDokumen = JSON.parse(JSON.stringify(user.dokumen || []));
    
    // Log all document IDs for debugging
    existingDokumen.forEach((doc, idx) => {
      console.log(`📄 [APPROVE] Doc[${idx}]: id="${doc.id}" (type: ${typeof doc.id}), status="${doc.status}", jenis="${doc.jenisDokumen}"`);
    });
    
    // Robust comparison: Convert both to string to handle "123" vs 123
    const docIndex = existingDokumen.findIndex(d => String(d.id) === String(documentId));
    
    console.log('🔍 [APPROVE] Looking for document ID:', documentId);
    console.log('🔍 [APPROVE] Document index found:', docIndex);
    
    if (docIndex === -1) {
      await transaction.rollback();
      console.log('❌ [APPROVE] Document not found in user\'s documents');
      return res.status(404).json({ 
        success: false,
        message: 'Dokumen tidak ditemukan' 
      });
    }

    console.log('📝 [APPROVE] Before update - Status:', existingDokumen[docIndex].status);
    console.log('📝 [APPROVE] Before update - Full doc:', existingDokumen[docIndex]);
    
    // Update status
    existingDokumen[docIndex].status = 'approved';
    existingDokumen[docIndex].verifiedAt = new Date();
    existingDokumen[docIndex].verifiedBy = adminId;
    existingDokumen[docIndex].rejectionReason = null;

    console.log('📝 [APPROVE] After update - Status:', existingDokumen[docIndex].status);

    // 🛠️ Re-assign to trigger update
    user.dokumen = existingDokumen;

    // Force Sequelize to recognize JSON field change
    user.changed('dokumen', true);
    console.log('💾 [APPROVE] Saving to database...');
    await user.save({ transaction });
    
    // 🔍 Verify the save worked
    console.log('🔍 [APPROVE] Reloading user from DB to verify...');
    await user.reload({ transaction });
    const savedDoc = (user.dokumen || []).find(d => String(d.id) === String(documentId));
    console.log('✅ [APPROVE] Verified in DB - Document found:', !!savedDoc);
    console.log('✅ [APPROVE] Verified in DB - Document status:', savedDoc ? savedDoc.status : 'NOT FOUND');
    console.log('✅ [APPROVE] Verified in DB - Full document:', JSON.stringify(savedDoc, null, 2));
    
    await transaction.commit();
    console.log('✅ [APPROVE] Transaction committed successfully');

    res.json({
      success: true,
      message: 'Dokumen berhasil disetujui',
      data: {
        documentId,
        status: 'approved',
        verifiedAt: savedDoc?.verifiedAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ [APPROVE] Error approving document:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menyetujui dokumen' 
    });
  }
};

// Admin: Reject document
exports.rejectDocument = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });
  
  try {
    const { userId, documentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;
    
    console.log('🔄 [REJECT] Starting rejection process');
    console.log('📋 [REJECT] Params:', { userId, documentId, adminId, reason });
    console.log('📋 [REJECT] Document ID type:', typeof documentId, 'Value:', `"${documentId}"`);
    
    if (!reason) {
      console.log('❌ [REJECT] Rejection reason is required');
      return res.status(400).json({ 
        success: false,
        message: 'Alasan penolakan wajib diisi' 
      });
    }
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      console.log('❌ [REJECT] User not found:', userId);
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    console.log('👤 [REJECT] User found:', user.nama);
    console.log('📄 [REJECT] Current documents count:', (user.dokumen || []).length);
    console.log('📄 [REJECT] Current documents:', JSON.stringify(user.dokumen, null, 2));

    // 🛠️ FIX: Deep clone array
    const existingDokumen = JSON.parse(JSON.stringify(user.dokumen || []));
    
    // Log all document IDs for debugging
    existingDokumen.forEach((doc, idx) => {
      console.log(`📄 [REJECT] Doc[${idx}]: id="${doc.id}" (type: ${typeof doc.id}), status="${doc.status}", jenis="${doc.jenisDokumen}"`);
    });
    
    // Robust comparison: Convert both to string
    const docIndex = existingDokumen.findIndex(d => String(d.id) === String(documentId));
    
    console.log('🔍 [REJECT] Looking for document ID:', documentId);
    console.log('🔍 [REJECT] Document index found:', docIndex);
    
    if (docIndex === -1) {
      await transaction.rollback();
      console.log('❌ [REJECT] Document not found in user\'s documents');
      return res.status(404).json({ 
        success: false,
        message: 'Dokumen tidak ditemukan' 
      });
    }

    console.log('📝 [REJECT] Before update - Status:', existingDokumen[docIndex].status);
    console.log('📝 [REJECT] Before update - Full doc:', existingDokumen[docIndex]);

    existingDokumen[docIndex].status = 'rejected';
    existingDokumen[docIndex].verifiedAt = new Date();
    existingDokumen[docIndex].verifiedBy = adminId;
    existingDokumen[docIndex].rejectionReason = sanitizeString(reason);
    existingDokumen[docIndex].autoDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log('📝 [REJECT] After update - Status:', existingDokumen[docIndex].status);
    console.log('📝 [REJECT] After update - Reason:', existingDokumen[docIndex].rejectionReason);

    // 🛠️ Re-assign to trigger update
    user.dokumen = existingDokumen;

    // Force Sequelize to recognize JSON field change
    user.changed('dokumen', true);
    console.log('💾 [REJECT] Saving to database...');
    await user.save({ transaction });
    
    // 🔍 Verify the save worked
    console.log('🔍 [REJECT] Reloading user from DB to verify...');
    await user.reload({ transaction });
    const savedDoc = (user.dokumen || []).find(d => String(d.id) === String(documentId));
    console.log('✅ [REJECT] Verified in DB - Document found:', !!savedDoc);
    console.log('✅ [REJECT] Verified in DB - Document status:', savedDoc ? savedDoc.status : 'NOT FOUND');
    console.log('✅ [REJECT] Verified in DB - Rejection reason:', savedDoc ? savedDoc.rejectionReason : 'N/A');
    console.log('✅ [REJECT] Verified in DB - Full document:', JSON.stringify(savedDoc, null, 2));
    
    await transaction.commit();
    console.log('✅ [REJECT] Transaction committed successfully');

    res.json({
      success: true,
      message: 'Dokumen ditolak. Dokumen akan dihapus otomatis dalam 24 jam.',
      data: {
        documentId,
        status: 'rejected',
        rejectionReason: savedDoc?.rejectionReason,
        autoDeleteAt: existingDokumen[docIndex].autoDeleteAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ [REJECT] Error rejecting document:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menolak dokumen' 
    });
  }
};

// Admin: Get all users with their documents (all statuses)
exports.getAllDocuments = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'nama', 'role', 'dokumen'],
      where: {
        role: ['nahkoda', 'abk']
      }
    });
    
    const usersWithDocs = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nama: user.nama,
      role: user.role,
      allDocuments: (user.dokumen || []).map(d => {
        const { filePath, ...rest } = d;
        return rest;
      })
    }));

    res.json({
      success: true,
      data: usersWithDocs
    });
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data dokumen' 
    });
  }
};

// Admin: Get all users with pending documents
exports.getPendingDocuments = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'nama', 'role', 'dokumen'],
      where: {
        role: ['nahkoda', 'abk']
      }
    });
    
    const usersWithPending = users.filter(user => {
      const dokumen = user.dokumen || [];
      return dokumen.some(d => d.status === 'pending');
    }).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nama: user.nama,
      role: user.role,
      pendingDocuments: (user.dokumen || []).filter(d => d.status === 'pending').map(d => {
        const { filePath, ...rest } = d;
        return rest;
      })
    }));

    res.json({
      success: true,
      data: usersWithPending
    });
  } catch (error) {
    console.error('Error fetching pending documents:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data dokumen pending' 
    });
  }
};

// Admin: Delete document by admin
exports.deleteDocumentByAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, documentId } = req.params;
    const adminId = req.user.userId;
    
    console.log('Admin deleting document:', { userId, documentId, adminId });
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    // 🛠️ FIX: Deep clone array
    const existingDokumen = JSON.parse(JSON.stringify(user.dokumen || []));
    // Robust comparison: Convert both to string
    const docIndex = existingDokumen.findIndex(d => String(d.id) === String(documentId));
    
    if (docIndex === -1) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Dokumen tidak ditemukan' 
      });
    }

    // Delete file from disk
    const document = existingDokumen[docIndex];
    if (document.filePath) {
      try {
        await uploadHelper.deleteFile(document.filePath);
      } catch (fileError) {
        console.warn('Failed to delete file:', fileError.message);
      }
    }

    // Remove from array
    existingDokumen.splice(docIndex, 1);

    // Force Sequelize to recognize JSON field change
    user.dokumen = existingDokumen;
    user.changed('dokumen', true);
    await user.save({ transaction });
    
    await transaction.commit();

    console.log('Document deleted successfully by admin');

    res.json({
      success: true,
      message: 'Dokumen berhasil dihapus'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting document by admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus dokumen' 
    });
  }
};
// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'nama', 'noTelepon', 'alamat', 'foto', 'role', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        nama: user.nama,
        noTelepon: user.noTelepon,
        alamat: user.alamat,
        foto: user.foto,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data profile' 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.userId;
    const { nama, noTelepon, alamat } = req.body;
    
    // 🔍 DEBUG LOGGING
    console.log('🔍 [UPDATE PROFILE] Request received');
    console.log('📋 [UPDATE PROFILE] User ID:', userId);
    console.log('📋 [UPDATE PROFILE] Request body:', req.body);
    console.log('📋 [UPDATE PROFILE] nama:', nama);
    console.log('📋 [UPDATE PROFILE] noTelepon:', noTelepon);
    console.log('📋 [UPDATE PROFILE] alamat:', alamat);
    console.log('📋 [UPDATE PROFILE] Has file:', !!req.file);
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }

    console.log('👤 [UPDATE PROFILE] Current user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat
    });

    // Update fields if provided
    const updateData = {};
    if (nama !== undefined) updateData.nama = sanitizeString(nama);
    if (noTelepon !== undefined) updateData.noTelepon = sanitizeString(noTelepon);
    if (alamat !== undefined) updateData.alamat = sanitizeString(alamat);
    
    console.log('📝 [UPDATE PROFILE] Update data prepared:', updateData);

    // Handle photo upload
    if (req.file) {
      // Validate file
      const fileErrors = uploadHelper.validateFile(req.file);
      if (fileErrors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: 'Validasi file gagal',
          errors: fileErrors 
        });
      }

      // Delete old photo if exists
      if (user.foto) {
        try {
          const oldPhotoPath = user.foto.replace('/uploads/', '');
          await uploadHelper.deleteFile(oldPhotoPath);
        } catch (deleteError) {
          console.warn('Failed to delete old photo:', deleteError.message);
        }
      }

      // Save new photo
      const fileInfo = await uploadHelper.saveFile(
        (req.file.buffer || req.file.path), 
        req.file.originalname,
        `profile-photos/${userId}`
      );

      updateData.foto = uploadHelper.getFileUrl(fileInfo.filePath);
    }

    await user.update(updateData, { transaction });
    
    // 🔍 DEBUG: Reload user to see actual saved data
    await user.reload({ transaction });
    console.log('[UPDATE PROFILE] After update - user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat,
      foto: user.foto
    });
    
    await transaction.commit();

    res.json({
      success: true,
      message: 'Profile berhasil diperbarui',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        nama: user.nama,
        noTelepon: user.noTelepon,
        alamat: user.alamat,
        foto: user.foto,
        role: user.role
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui profile' 
    });
  }
};

module.exports = { 
  upload,
  uploadProfileDocument: exports.uploadProfileDocument,
  getProfileDocuments: exports.getProfileDocuments,
  getProfile: exports.getProfile,
  updateProfile: exports.updateProfile,
  deleteProfileDocument: exports.deleteProfileDocument,
  approveDocument: exports.approveDocument,
  rejectDocument: exports.rejectDocument,
  getPendingDocuments: exports.getPendingDocuments,
  getAllDocuments: exports.getAllDocuments,
  deleteDocumentByAdmin: exports.deleteDocumentByAdmin
};