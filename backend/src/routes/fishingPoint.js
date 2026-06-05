const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const fishingPointController = require('../controllers/fishingPointController');

router.use(authenticate);

// Mobile: submit titik jaring
router.post('/', fishingPointController.submitFishingPoint);

// Web monitoring: get semua titik jaring
router.get('/', fishingPointController.getFishingPoints);

// Web monitoring: get titik jaring trip aktif
router.get('/active', fishingPointController.getActiveFishingPoints);

// Admin: hapus titik jaring
router.delete('/:id', fishingPointController.deleteFishingPoint);

// Get titik jaring berdasarkan ID hasil tangkap
router.get('/by-catch/:catchId', fishingPointController.getFishingPointByCatch);

module.exports = router;
