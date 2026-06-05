const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const { authenticate } = require('../middleware/auth');

// Get all POIs
router.get('/', authenticate, poiController.getAllPOIs);

// Create new POI
router.post('/', authenticate, poiController.createPOI);

// Update POI
router.put('/:id', authenticate, poiController.updatePOI);

// Delete POI
router.delete('/:id', authenticate, poiController.deletePOI);

module.exports = router;