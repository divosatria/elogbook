const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const mobileEmergencyController = require('../../controllers/mobile/mobileEmergencyController');

router.post('/emergency-alert', authenticate, mobileEmergencyController.emergencyAlert);
router.post('/sos', authenticate, mobileEmergencyController.sosAlert);

module.exports = router;
