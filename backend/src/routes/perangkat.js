const express = require('express');
const router = express.Router();
const perangkatController = require('../controllers/perangkatController');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../middleware/auth');

router.use(authenticate);

// Read: semua web roles
router.get('/', authorize(ALL_WEB), perangkatController.getAllPerangkat);
router.get('/statistics', authorize(ALL_WEB), perangkatController.getStatistics);
router.get('/:id', authorize(ALL_WEB), perangkatController.getPerangkatById);

// Write: admin + operator
router.post('/', authorize(ADMIN_OPERATOR), perangkatController.uploadPhoto, perangkatController.createPerangkat);
router.put('/:id', authorize(ADMIN_OPERATOR), perangkatController.uploadPhoto, perangkatController.updatePerangkat);

// Delete: admin only
router.delete('/:id', authorize(ADMIN_ONLY), perangkatController.deletePerangkat);

module.exports = router;
