const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for user photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/profile-photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.id || 'new';
    const uniqueName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
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
});

exports.uploadMiddleware = upload.single('foto');

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    let whereClause = {};
    if (role) {
      const roles = role.split(',');
      whereClause.role = { [Op.in]: roles };
    }
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    // Add fotoUrl to each user
    const usersWithFotoUrl = users.map(user => {
      const userData = user.toJSON();
      return {
        ...userData,
        fotoUrl: userData.foto ? `/uploads/profile-photos/${userData.foto}` : null,
        dokumen: userData.dokumen || [],
        mobileAccess: ['nahkoda', 'abk'].includes(userData.role)
      };
    });
    
    res.json({
      success: true,
      data: usersWithFotoUrl
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data user',
      data: []
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    console.log('=== CREATE USER DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Files:', req.file ? 'File present' : 'No file');
    
    // Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body kosong. Pastikan data dikirim dengan benar.',
        debug: {
          contentType: req.headers['content-type'],
          hasBody: !!req.body,
          bodyKeys: Object.keys(req.body || {}),
          suggestion: 'Pastikan Content-Type: application/json dan data dikirim dalam format JSON'
        }
      });
    }
    
    // Handle both JSON and multipart form data
    let userData;
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
    
    if (isMultipart) {
      // Data comes from form fields in multipart
      userData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
        nama: req.body.nama,
        noTelepon: req.body.noTelepon,
        alamat: req.body.alamat
      };
    } else {
      // Regular JSON data
      userData = req.body;
    }
    
    console.log('Processed user data:', { ...userData, password: userData.password ? '[HIDDEN]' : 'Not provided' });
    
    const { username, email, password, role, nama, noTelepon, alamat } = userData;
    
    // Validasi field wajib
    if (!username || !email || !password) {
      console.log('VALIDATION FAILED - Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Username, email, dan password wajib diisi',
        validationInfo: {
          hasUsername: !!username,
          hasEmail: !!email,
          hasPassword: !!password
        }
      });
    }
    
    // Cek duplikasi
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah digunakan'
      });
    }
    
    // Validasi role — ambil dari DB agar mendukung role custom
    const userRole = role || 'nelayan';
    const roleRows = await sequelize.query(
      'SELECT DISTINCT role FROM role_permissions',
      { type: QueryTypes.SELECT }
    );
    const validRoles = roleRows.map(r => r.role);
    const mobileRoles = ['nahkoda', 'abk'];
    
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: `Role tidak valid. Role yang tersedia: ${validRoles.join(', ')}`
      });
    }
    
    console.log('Final role to use:', userRole);
    console.log('Mobile access:', mobileRoles.includes(userRole) ? 'Yes' : 'No');
    
    const finalUserData = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: userRole,
      nama,
      noTelepon,
      alamat,
      isActive: true
    };

    console.log('Final user data to create:', { ...finalUserData, password: '[HIDDEN]' });

    // Add photo if uploaded
    if (req.file) {
      finalUserData.foto = req.file.filename;
    }
    
    const user = await User.create(finalUserData);
    
    console.log('User created successfully:', user.id);
    
    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nama: user.nama,
        noTelepon: user.noTelepon,
        alamat: user.alamat,
        foto: user.foto,
        fotoUrl: user.foto ? `/uploads/profile-photos/${user.foto}` : null,
        isActive: user.isActive,
        mobileAccess: ['nahkoda', 'abk'].includes(user.role)
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle specific Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => `${err.path}: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: 'Validasi database gagal: ' + validationErrors.join(', ')
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah digunakan'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Gagal membuat user: ' + error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, nama, noTelepon, alamat } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Validasi role jika disediakan — ambil dari DB agar mendukung role custom
    if (role) {
      const roleRows = await sequelize.query(
        'SELECT DISTINCT role FROM role_permissions',
        { type: QueryTypes.SELECT }
      );
      const validRoles = roleRows.map(r => r.role);
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role tidak valid. Role yang tersedia: ${validRoles.join(', ')}`
        });
      }
    }

    const updateData = {
      username: username?.toLowerCase() || user.username,
      email: email?.toLowerCase() || user.email,
      role: role || user.role,
      nama: nama || user.nama,
      noTelepon: noTelepon || user.noTelepon,
      alamat: alamat !== undefined ? alamat : user.alamat
    };

    // Update photo if uploaded
    if (req.file) {
      // Delete old photo if exists
      if (user.foto) {
        const oldPath = path.join(__dirname, '../../uploads/profile-photos', user.foto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.foto = req.file.filename;
    }
    
    await user.update(updateData);
    
    res.json({
      success: true,
      message: 'User berhasil diupdate',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nama: user.nama,
        noTelepon: user.noTelepon,
        alamat: user.alamat,
        foto: user.foto,
        fotoUrl: user.foto ? `/uploads/profile-photos/${user.foto}` : null,
        isActive: user.isActive,
        mobileAccess: ['nahkoda', 'abk'].includes(user.role)
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate user: ' + error.message
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    await user.update({ isActive: !user.isActive });
    
    res.json({
      success: true,
      message: `User berhasil ${user.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: { isActive: user.isActive }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status user: ' + error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    // Delete photo file if exists
    if (user.foto) {
      const photoPath = path.join(__dirname, '../../uploads/profile-photos', user.foto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    await user.destroy();
    
    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus user: ' + error.message
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    const userData = user.toJSON();
    res.json({
      success: true,
      data: {
        ...userData,
        fotoUrl: userData.foto ? `/uploads/profile-photos/${userData.foto}` : null,
        mobileAccess: ['nahkoda', 'abk'].includes(userData.role)
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data user: ' + error.message
    });
  }
};