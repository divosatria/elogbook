const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate, authorize, ADMIN_ONLY, ALL_WEB } = require('../middleware/auth');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(ADMIN_ONLY));

// Live monitoring dashboard — semua web role bisa akses
router.get('/live-monitoring', authorize(ALL_WEB), monitoringController.getMonitoringData);

// Signature settings for PDF export
const signatureRoutes = require('./signature');
router.use('/signature', signatureRoutes);

module.exports = router;