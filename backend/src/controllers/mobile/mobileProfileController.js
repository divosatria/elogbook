const { User } = require('../../models');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Get Profile
exports.getProfile = async (req, res) => {
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
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { nama, noTelepon, alamat } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Prepare update data
    const updateData = {};
    if (nama !== undefined && nama !== null) updateData.nama = nama;
    if (noTelepon !== undefined && noTelepon !== null) updateData.noTelepon = noTelepon;
    if (alamat !== undefined && alamat !== null) updateData.alamat = alamat;

    // Handle photo upload
    if (req.file) {
      const uploadDir = path.join(__dirname, `../../../uploads/profile-photos`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old photo if exists
      if (user.foto) {
        const oldPhotoPath = path.join(__dirname, `../../../uploads/profile-photos/${user.foto}`);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Save new photo
      const fileName = `${userId}-${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, (req.file.buffer || req.file.path));

      updateData.foto = fileName;
    }

    // Update user
    await user.update(updateData);
    await user.reload();

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      photoUrl: user.foto ? `/uploads/profile-photos/${user.foto}` : null
    });
  } catch (error) {
    console.error('❌ [MOBILE UPDATE PROFILE] Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Upload Personal Documents
exports.uploadDocument = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { jenisDokumen, nomorDokumen, tanggalBerlaku, keterangan } = req.body;

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

    const uploadDir = path.join(__dirname, `../../../uploads/profile-documents/${userId}`);
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
      data: documentData
    });
  } catch (error) {
    console.error('❌ Error uploading mobile document:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Personal Documents
exports.getDocuments = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat dokumen'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'nama', 'username', 'email', 'noTelepon', 'dokumen'],
      raw: false,
      rejectOnEmpty: false
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const dokumen = user.dokumen || [];
    const sortedDokumen = dokumen.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Alternative personal documents
exports.personalDocumentsAlt = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa upload dokumen pribadi'
      });
    }
    res.json({
      success: true,
      message: 'Gunakan endpoint /mobile/profile/documents untuk upload dokumen'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete profile document
exports.deleteDocument = async (req, res) => {
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
};

// Admin: Get pending documents
exports.getPendingDocuments = async (req, res) => {
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
};

// Admin: Approve document
exports.approveDocument = async (req, res) => {
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
};

// Admin: Reject document
exports.rejectDocument = async (req, res) => {
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
};
