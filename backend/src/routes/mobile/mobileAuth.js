const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const mobileAuthController = require('../../controllers/mobile/mobileAuthController');

// Rate limiter for mobile auth
const mobileAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.MOBILE_RATE_LIMIT_MAX || '10', 10),
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

router.post('/login', mobileAuthLimiter, mobileAuthController.login);

module.exports = router;
