const express = require('express');
const router = express.Router();
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR } = require('../middleware/auth');
const catchPolygonController = require('../controllers/catchPolygonController');

// Public endpoints (dipakai mobile juga)
router.get('/', catchPolygonController.getAllCatchPolygons);
router.post('/check-point', catchPolygonController.checkPointInPolygon);

// Write: admin + operator
router.post('/', authenticate, authorize(ADMIN_OPERATOR), catchPolygonController.createCatchPolygon);
router.put('/:id', authenticate, authorize(ADMIN_OPERATOR), catchPolygonController.updateCatchPolygon);
router.patch('/:id/toggle-status', authenticate, authorize(ADMIN_OPERATOR), catchPolygonController.togglePolygonStatus);

// Delete: admin only
router.delete('/:id', authenticate, authorize(ADMIN_ONLY), catchPolygonController.deleteCatchPolygon);

module.exports = router;
