const { User } = require('../../models');
const jwt = require('jsonwebtoken');
const { sanitizeIP } = require('../../utils/ipValidation');

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'e-logbook-mobile'
    }
  );
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    const dbConnected = req.app.get('dbConnected')();

    if (dbConnected) {
      const user = await User.findOne({
        where: {
          email: email.toLowerCase()
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Akun tidak aktif. Hubungi administrator'
        });
      }

      if (!['nahkoda', 'abk'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Akun tidak memiliki akses mobile app. Hanya Nahkoda dan ABK yang dapat menggunakan aplikasi mobile.',
          errorCode: 'MOBILE_ACCESS_DENIED',
          userRole: user.role,
          allowedRoles: ['nahkoda', 'abk']
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      const rawIp = (req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '').split(',')[0].trim();
      const sanitizedIp = sanitizeIP(rawIp);

      try {
        if (sanitizedIp) {
          user.lastLoginIp = sanitizedIp;
        }
        user.lastLoginAt = new Date();
        await user.save();
      } catch (e) {
        console.warn('⚠️ Failed to save login info:', e.message);
      }

      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: {
            nama: user.nama,
            telepon: user.noTelepon,
            alamat: user.alamat || null
          },
          lastLoginAt: user.lastLoginAt || user.updatedAt,
          mobileAccess: true,
          permissions: {
            canManageTrip: user.role === 'nahkoda',
            canUpdateLocation: true,
            canSendSOS: true,
            canUploadDocuments: true,
            canViewVesselData: true
          }
        }
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Database tidak tersedia'
      });
    }
  } catch (error) {
    console.error('❌ Mobile login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};
