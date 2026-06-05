const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/authController');
const passwordResetController = require('../../controllers/auth/passwordResetController');
const { authenticate } = require('../../middleware/auth/auth');
const { 
  passwordResetLimiter, 
  resetPasswordLimiter, 
  verifyTokenLimiter 
} = require('../../middleware/core/passwordResetRateLimiter');

// Auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);

// Profile endpoints
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

// Password reset endpoints (public - no authentication required)
router.post('/forgot-password', passwordResetLimiter, passwordResetController.requestPasswordReset);
router.get('/verify-reset-token/:token', verifyTokenLimiter, passwordResetController.verifyResetToken);
router.post('/reset-password/:token', resetPasswordLimiter, passwordResetController.resetPassword);

module.exports = router;