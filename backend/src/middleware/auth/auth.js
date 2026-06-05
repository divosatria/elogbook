const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/auth/User');

// Role constants
const WEB_ROLES = ['admin', 'operator', 'supervisor'];
const ADMIN_ONLY = ['admin'];
const ADMIN_OPERATOR = ['admin', 'operator'];
const ALL_WEB = ['admin', 'operator', 'supervisor', 'nahkoda', 'abk', 'nelayan'];

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Token tidak ditemukan atau format salah' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET tidak ditemukan di environment variables');
      return res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Token tidak valid - userId tidak ditemukan' 
      });
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User tidak ditemukan' 
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Akun tidak aktif' 
      });
    }
    
    req.user = { 
      userId: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token sudah expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token tidak valid' 
      });
    }
    
    console.error('❌ Auth error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

const authorize = (...roles) => {
  // Support both authorize('admin') and authorize(['admin','operator'])
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User tidak terautentikasi' 
      });
    }
    
    if (!req.user.role) {
      return res.status(403).json({ 
        success: false,
        message: 'Role user tidak ditemukan' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Akses ditolak. Role yang dibutuhkan: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
};

// Middleware untuk validasi input
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize, validateInput, WEB_ROLES, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB };