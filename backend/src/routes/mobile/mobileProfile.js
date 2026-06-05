const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

// Upload Personal Documents
router.post('/profile/documents', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
      }
    }
  }).any();

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { jenisDokumen, nomorDokumen, tanggalBerlaku, keterangan } = req.body;

    console.log('📄 Mobile document upload request');
    console.log('📄 Body:', req.body);
    console.log('📄 Files:', req.files ? req.files.length : 0);
    if (req.files) {
      console.log('📄 Field names:', req.files.map(f => f.fieldname));
    }

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa upload dokumen'
      });
    }

    let uploadedFile = null;
    if (req.files && req.files.length > 0) {
      uploadedFile = req.files[0];
    }

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'File dokumen wajib diupload'
      });
    }

    const uploadDir = path.join(__dirname, `../../uploads/profile-documents/${userId}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${crypto.createHash('md5').update(uploadedFile.originalname + Date.now()).digest('hex')}${path.extname(uploadedFile.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, uploadedFile.buffer);

    const allowedDocTypes = [
      'KTP', 'Pas Foto', 'NPWP',
      'Buku Pelaut', 'Sertifikat Nahkoda', 'BST',
      'Surat Keterangan Sehat', 'SKCK'
    ];

    if (!jenisDokumen || !allowedDocTypes.includes(jenisDokumen)) {
      return res.status(400).json({
        success: false,
        message: `Jenis dokumen harus salah satu dari: ${allowedDocTypes.join(', ')}`,
        allowedTypes: allowedDocTypes
      });
    }

    const dbConnected = req.app.get('dbConnected')();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const documentData = {
      id: Date.now().toString(),
      jenisDokumen: jenisDokumen,
      nomorDokumen: nomorDokumen || null,
      tanggalBerlaku: tanggalBerlaku ? new Date(tanggalBerlaku) : null,
      keterangan: keterangan || null,
      fileName: fileName,
      fileUrl: `/uploads/profile-documents/${userId}/${fileName}`,
      uploadedAt: new Date(),
      status: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    const currentDokumen = user.dokumen || [];
    const filteredDokumen = currentDokumen.filter(doc => doc.jenisDokumen !== jenisDokumen);
    filteredDokumen.push(documentData);

    user.dokumen = filteredDokumen;
    user.changed('dokumen', true);
    await user.save();

    res.json({
      success: true,
      message: 'Dokumen berhasil diupload dan menunggu verifikasi admin',
      data: {
        id: documentData.id,
        jenisDokumen: documentData.jenisDokumen,
        nomorDokumen: documentData.nomorDokumen,
        tanggalBerlaku: documentData.tanggalBerlaku,
        keterangan: documentData.keterangan,
        fileName: documentData.fileName,
        fileUrl: documentData.fileUrl,
        uploadedAt: documentData.uploadedAt,
        status: documentData.status,
        verifiedAt: documentData.verifiedAt,
        verifiedBy: documentData.verifiedBy,
        rejectionReason: documentData.rejectionReason
      }
    });
  } catch (error) {
    console.error('❌ Error uploading mobile document:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get Personal Documents
router.get('/profile/documents', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    console.log('📱 [MOBILE GET DOCS] Request from user:', userId, 'role:', role);

    if (role !== 'nahkoda' && role !== 'abk') {
      console.log('❌ [MOBILE GET DOCS] Access denied - invalid role:', role);
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat dokumen'
      });
    }

    const dbConnected = req.app.get('dbConnected')();

    if (!dbConnected) {
      console.log('❌ [MOBILE GET DOCS] Database not connected');
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }

    // Force fresh read from database, bypass any caching
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nama', 'username', 'email', 'noTelepon', 'dokumen'],
      raw: false, // Ensure we get model instance
      rejectOnEmpty: false
    });

    if (!user) {
      console.log('❌ [MOBILE GET DOCS] User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    console.log('=== MOBILE GET DOCUMENTS DEBUG ===');
    console.log('👤 [MOBILE GET DOCS] User ID:', userId);
    console.log('👤 [MOBILE GET DOCS] User Name:', user.nama);
    console.log('📄 [MOBILE GET DOCS] Raw dokumen from DB:', JSON.stringify(user.dokumen, null, 2));
    console.log('📊 [MOBILE GET DOCS] Total documents:', (user.dokumen || []).length);

    const dokumen = user.dokumen || [];

    // Log each document status in detail
    dokumen.forEach((doc, index) => {
      console.log(`📄 [MOBILE GET DOCS] Doc[${index}]: id="${doc.id}", jenis="${doc.jenisDokumen}", status="${doc.status}", verifiedAt=${doc.verifiedAt || 'null'}, verifiedBy=${doc.verifiedBy || 'null'}`);
    });

    const sortedDokumen = dokumen.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    console.log('📤 [MOBILE GET DOCS] Sending response with', sortedDokumen.length, 'documents');
    console.log('=== END MOBILE GET DOCUMENTS DEBUG ===');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nama: user.nama || user.username,
          noTelepon: user.noTelepon
        },
        dokumen: sortedDokumen
      }
    });
  } catch (error) {
    console.error('❌ [MOBILE GET DOCS] Error getting personal documents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'nama', 'noTelepon', 'alamat', 'foto', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Profile
router.put('/profile', authenticate, (req, res, next) => {
  // Handle multipart/form-data for photo uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Hanya file JPG/PNG yang diizinkan'));
      }
    }
  }).single('foto'); // Field name for photo

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { userId } = req.user;
    const { nama, noTelepon, alamat } = req.body;

    // 🔍 DEBUG LOGGING
    console.log('🔍 [MOBILE UPDATE PROFILE] Request received');
    console.log('📋 [MOBILE UPDATE PROFILE] User ID:', userId);
    console.log('📋 [MOBILE UPDATE PROFILE] Request body:', req.body);
    console.log('📋 [MOBILE UPDATE PROFILE] nama:', nama);
    console.log('📋 [MOBILE UPDATE PROFILE] noTelepon:', noTelepon);
    console.log('📋 [MOBILE UPDATE PROFILE] alamat:', alamat);
    console.log('📋 [MOBILE UPDATE PROFILE] Has file:', !!req.file);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    console.log('👤 [MOBILE UPDATE PROFILE] Current user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat,
      foto: user.foto
    });

    // Prepare update data
    const updateData = {};
    if (nama !== undefined && nama !== null) updateData.nama = nama;
    if (noTelepon !== undefined && noTelepon !== null) updateData.noTelepon = noTelepon;
    if (alamat !== undefined && alamat !== null) updateData.alamat = alamat;

    // Handle photo upload
    if (req.file) {
      const uploadDir = path.join(__dirname, `../../uploads/profile-photos`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old photo if exists
      if (user.foto) {
        const oldPhotoPath = path.join(__dirname, `../../uploads/profile-photos/${user.foto}`);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
          console.log('🗑️ [MOBILE UPDATE PROFILE] Old photo deleted');
        }
      }

      // Save new photo
      const fileName = `${userId}-${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      updateData.foto = fileName;
      console.log('📸 [MOBILE UPDATE PROFILE] New photo saved:', fileName);
    }

    console.log('📝 [MOBILE UPDATE PROFILE] Update data prepared:', updateData);

    // Update user
    await user.update(updateData);

    // Reload to get fresh data
    await user.reload();
    console.log('✅ [MOBILE UPDATE PROFILE] After update - user data:', {
      id: user.id,
      nama: user.nama,
      noTelepon: user.noTelepon,
      alamat: user.alamat,
      foto: user.foto
    });

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      photoUrl: user.foto ? `/uploads/profile-photos/${user.foto}` : null
    });
  } catch (error) {
    console.error('❌ [MOBILE UPDATE PROFILE] Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Personal documents (alternative endpoint)
router.post('/personal-documents', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa upload dokumen pribadi'
      });
    }

    // This is an alternative to /profile/documents
    res.json({
      success: true,
      message: 'Gunakan endpoint /mobile/profile/documents untuk upload dokumen'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete profile document
router.delete('/profile/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.user;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const filteredDokumen = dokumen.filter(doc => doc.id !== documentId);

    await user.update({ dokumen: filteredDokumen });

    res.json({
      success: true,
      message: 'Dokumen berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get pending documents
router.get('/profile/admin/pending-documents', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa mengakses' });
    }

    const users = await User.findAll({
      where: { role: ['nahkoda', 'abk'] },
      attributes: ['id', 'username', 'email', 'nama', 'role', 'dokumen']
    });

    const pendingUsers = users.filter(user => {
      const dokumen = user.dokumen || [];
      return dokumen.some(doc => doc.status === 'pending');
    }).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nama: user.nama,
      role: user.role,
      pendingDocuments: (user.dokumen || []).filter(doc => doc.status === 'pending')
    }));

    res.json({
      success: true,
      data: pendingUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Approve user document
router.patch('/profile/admin/users/:userId/documents/:documentId/approve', authenticate, async (req, res) => {
  try {
    const { role, userId: adminId } = req.user;
    const { userId, documentId } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menyetujui' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const docIndex = dokumen.findIndex(doc => doc.id === documentId);

    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    dokumen[docIndex].status = 'approved';
    dokumen[docIndex].verifiedAt = new Date();
    dokumen[docIndex].verifiedBy = adminId;

    await user.update({ dokumen });

    res.json({
      success: true,
      message: 'Dokumen berhasil disetujui'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Reject user document
router.patch('/profile/admin/users/:userId/documents/:documentId/reject', authenticate, async (req, res) => {
  try {
    const { role, userId: adminId } = req.user;
    const { userId, documentId } = req.params;
    const { reason } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menolak' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const dokumen = user.dokumen || [];
    const docIndex = dokumen.findIndex(doc => doc.id === documentId);

    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    dokumen[docIndex].status = 'rejected';
    dokumen[docIndex].rejectionReason = reason;
    dokumen[docIndex].verifiedAt = new Date();
    dokumen[docIndex].verifiedBy = adminId;

    await user.update({ dokumen });

    res.json({
      success: true,
      message: 'Dokumen ditolak'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
