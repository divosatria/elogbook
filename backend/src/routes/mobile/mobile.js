const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../middleware/auth/auth');
const mobileAuthController = require('../../controllers/mobile/mobileAuthController');
const fishingPointController = require('../../controllers/monitoring/fishingPointController');
const aiController = require('../../controllers/mobile/aiController');
const multer = require('multer');

// Rate limiter for mobile auth
const mobileAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.MOBILE_RATE_LIMIT_MAX || '10', 10),
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/login', mobileAuthLimiter, mobileAuthController.login);

// ==========================================
// SUB-ROUTERS
// ==========================================
// Mount the separated God Object routers
const mobileProfileRouter = require('./mobileProfileRouter');
const mobileEmergencyRouter = require('./mobileEmergencyRouter');
const mobileDashboardRouter = require('./mobileDashboardRouter');
const mobileVesselRouter = require('./mobileVesselRouter');
const mobileTripRouter = require('./mobileTripRouter');
const mobileCatchRouter = require('./mobileCatchRouter');

// Profile & Documents (No additional prefix needed as paths in router are already complete)
router.use('/', mobileProfileRouter);

// Emergency & SOS
router.use('/', mobileEmergencyRouter);

// Dashboard & Notifications
router.use('/', mobileDashboardRouter);

// Vessels, Tracking, Logistics
router.use('/', mobileVesselRouter);

// Trips & Checklists
router.use('/', mobileTripRouter);

// Catches (Deprecated)
router.use('/', mobileCatchRouter);


// ==========================================
// FISHING POINT (Titik Penurunan Jaring)
// ==========================================
router.post('/fishing-point', fishingPointController.submitFishingPoint);


// ==========================================
// AI Fish Prediction for Mobile
// ==========================================
router.post('/predict-fish', authenticate, (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }).single('image');

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error in mobile AI predict:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, aiController.predictFish);

module.exports = router;
