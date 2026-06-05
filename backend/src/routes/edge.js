const express = require('express');
const router = express.Router();
const edgeController = require('../controllers/edgeController');
const { edgeAuth } = require('../middleware/edgeAuth');
const { authenticate } = require('../middleware/auth');

// POST /api/edge/sync
// Menggunakan edgeAuth untuk mengecek Static API Key (bukan JWT token user biasa)
router.post('/sync', edgeAuth, edgeController.syncData);

// GET /api/edge/raw-data
// Menggunakan authenticate JWT biasa dari dashboard admin
router.get('/raw-data', authenticate, edgeController.getRawData);

module.exports = router;
