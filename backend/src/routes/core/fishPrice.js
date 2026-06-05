const express = require('express');
const router = express.Router();
const fishPriceController = require('../../controllers/core/fishPriceController');
const { authenticate, authorize } = require('../../middleware/auth/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/fish-prices - Get all fish prices (all authenticated users)
router.get('/', fishPriceController.getAll);

// POST /api/fish-prices - Create new fish price (admin only)
router.post('/', authorize(['admin']), fishPriceController.create);

// PUT /api/fish-prices/:id - Update fish price (admin only)
router.put('/:id', authorize(['admin']), fishPriceController.update);

// DELETE /api/fish-prices/:id - Delete fish price (admin only)
router.delete('/:id', authorize(['admin']), fishPriceController.delete);

module.exports = router;