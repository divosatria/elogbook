const { User } = require('../../models');
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { optionalAuth } = require('../../middleware/auth/optionalAuth');

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
    issuer: "e-logbook-api",
  });
};

// Validasi input
const validateRegisterInput = (data) => {
  const errors = [];

  if (!data.username || data.username.length < 3) {
    errors.push("Username minimal 3 karakter");
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Email tidak valid");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("Password minimal 6 karakter");
  }

  const validRoles = ["admin", "operator", "supervisor", "nelayan", "nahkoda", "abk"];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push("Role tidak valid");
  }

  return errors;
};

const validateLoginInput = (data) => {
  const errors = [];

  if (!data.username) {
    errors.push("Username wajib diisi");
  }

  if (!data.password) {
    errors.push("Password wajib diisi");
  }

  return errors;
};

exports.register = async (req, res) => {
  try {
    // Use optional auth middleware
    optionalAuth(req, res, async (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Authentication error'
        });
      }

      try {
        // Allow registration only by admin, except when creating the very first user (initial setup)
        let { username, email, password, role: requestedRole, nama, noTelepon } = req.body;

        // Check number of existing users with proper transaction
        const userCount = await User.count();

        if (userCount > 0) {
          // If there are users already, require that the requester is an authenticated admin
          if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Registrasi hanya dapat dilakukan oleh admin',
            });
          }
        } else {
          // For the very first user, force role to admin
          requestedRole = 'admin';
        }

        // Prepare final role
        const role = requestedRole || 'nelayan';

        // Validasi input
        const validationErrors = validateRegisterInput({ ...req.body, role });
        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: validationErrors,
          });
        }

        // Cek user yang sudah ada
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [
              { email: email.toLowerCase() },
              { username: username.toLowerCase() },
            ],
          },
        });

        if (existingUser) {
          // Proper field conflict detection
          const emailConflict = existingUser.email === email.toLowerCase();
          const usernameConflict = existingUser.username === username.toLowerCase();
          
          let conflictField = 'Field';
          if (emailConflict && usernameConflict) {
            conflictField = 'Email dan Username';
          } else if (emailConflict) {
            conflictField = 'Email';
          } else if (usernameConflict) {
            conflictField = 'Username';
          }
          
          return res.status(400).json({
            success: false,
            message: `${conflictField} sudah terdaftar`,
          });
        }

        // Buat user baru
        const user = await User.create({
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          password,
          role,
          nama,
          noTelepon,
        });

        const token = generateToken(user.id);

        res.status(201).json({
          success: true,
          message: 'User berhasil didaftarkan',
          data: {
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              nama: user.nama,
              noTelepon: user.noTelepon,
            },
          },
        });
      } catch (innerError) {
        console.error('❌ Register inner error:', innerError);
        res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan server',
          error: process.env.NODE_ENV === 'development' ? innerError.message : undefined,
        });
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    const validationErrors = validateLoginInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors,
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Username tidak ditemukan",
        errorType: "USERNAME_NOT_FOUND"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Akun tidak aktif. Hubungi administrator",
        errorType: "ACCOUNT_INACTIVE"
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
        errorType: "INVALID_PASSWORD"
      });
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
          alamat: user.alamat || null,
        },
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Untuk JWT stateless, logout dilakukan di client side
    // Tapi kita bisa log aktivitas logout
    res.json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nama, noTelepon, email } = req.body;
    const userId = req.user.userId;

    // Validasi email jika diubah
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    // Cek email duplikat jika email diubah
    if (email) {
      const existingUser = await User.findOne({
        where: {
          email: email.toLowerCase(),
          id: { [Op.ne]: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email sudah digunakan user lain",
        });
      }
    }

    const updateData = {};
    if (nama !== undefined) updateData.nama = nama;
    if (noTelepon !== undefined) updateData.noTelepon = noTelepon;
    if (email !== undefined) updateData.email = email.toLowerCase();

    await User.update(updateData, {
      where: { id: userId },
    });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    res.json({
      success: true,
      message: "Profile berhasil diupdate",
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru wajib diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Password lama tidak benar",
      });
    }

    // Set new password on the instance and save so hooks (e.g., beforeUpdate) run and hash it
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
