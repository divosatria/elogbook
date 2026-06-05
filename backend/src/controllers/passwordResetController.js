const { User } = require('../models');
const PasswordResetToken = require('../models/PasswordResetToken');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

/**
 * Password Reset Controller
 * Handles forgot password, token verification, and password reset
 */

/**
 * Request password reset - Send reset link via email
 * POST /api/auth/forgot-password
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email wajib diisi'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    // For security, always return success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      console.log(`⚠️  Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'Jika email terdaftar, link reset password telah dikirim'
      });
    }

    // Note: We don't check isActive here to allow inactive users to reset password
    // This enables account reactivation through password reset

    // Delete any existing tokens for this user
    await PasswordResetToken.deleteUserTokens(user.id);

    // Create new reset token (expires in 1 hour)
    const tokenExpiry = parseInt(process.env.RESET_PASSWORD_TOKEN_EXPIRY) || 3600;
    const expiryHours = tokenExpiry / 3600;
    const resetToken = await PasswordResetToken.createToken(user.id, expiryHours);

    // Generate reset link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken.token}`;

    // Send email with reset link
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.nama || user.username,
        resetLink,
        expiryHours
      );

      console.log(`✅ Password reset email sent to: ${user.email}`);

      res.json({
        success: true,
        message: 'Link reset password telah dikirim ke email Anda'
      });
    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      
      // Delete the token if email fails
      await PasswordResetToken.destroy({
        where: { token: resetToken.token }
      });

      return res.status(500).json({
        success: false,
        message: 'Gagal mengirim email. Silakan coba lagi atau hubungi administrator'
      });
    }

  } catch (error) {
    console.error('❌ Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify reset token validity
 * GET /api/auth/verify-reset-token/:token
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    // Find valid token
    const resetToken = await PasswordResetToken.findValidToken(token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token tidak valid atau sudah kadaluarsa',
        errorType: 'INVALID_TOKEN'
      });
    }

    // Get user info (without sensitive data)
    const user = await User.findByPk(resetToken.userId, {
      attributes: ['id', 'email', 'username', 'nama', 'isActive']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Note: We don't check isActive here to allow inactive users to reset password
    // This enables account reactivation through password reset

    res.json({
      success: true,
      message: 'Token valid',
      data: {
        email: user.email,
        username: user.username,
        nama: user.nama
      }
    });

  } catch (error) {
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi password wajib diisi'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password dan konfirmasi password tidak cocok'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 8 karakter'
      });
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password harus mengandung huruf besar, huruf kecil, dan angka'
      });
    }

    // Find valid token
    const resetToken = await PasswordResetToken.findValidToken(token);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token tidak valid atau sudah kadaluarsa',
        errorType: 'INVALID_TOKEN'
      });
    }

    // Get user
    const user = await User.findByPk(resetToken.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Note: We don't check isActive here to allow inactive users to reset password
    // This enables account reactivation through password reset

    // Update password (will be hashed by User model hook)
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.requirePasswordChange = false;
    await user.save();

    // Mark token as used
    await PasswordResetToken.markAsUsed(token);

    // Delete all other tokens for this user
    await PasswordResetToken.deleteUserTokens(user.id);

    // Send confirmation email
    try {
      await emailService.sendPasswordResetConfirmation(
        user.email,
        user.nama || user.username
      );
    } catch (emailError) {
      console.error('⚠️  Failed to send confirmation email:', emailError);
      // Don't fail the request if confirmation email fails
    }

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru Anda'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
