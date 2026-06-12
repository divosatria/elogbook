const express = require('express');
const router = express.Router();
const edgeController = require('../../controllers/monitoring/edgeController');
const { authenticate } = require('../../middleware/auth/auth');

// GET /api/edge/raw-data
// Menggunakan authenticate JWT biasa dari dashboard admin
router.get('/raw-data', authenticate, edgeController.getRawData);

module.exports = router;
