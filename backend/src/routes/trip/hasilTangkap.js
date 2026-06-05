const express = require('express');
const router = express.Router();
const hasilTangkapController = require('../../controllers/trip/hasilTangkapController');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../../middleware/auth/auth');

router.use(authenticate);

// Read: semua web roles
router.get('/stats', authorize(ALL_WEB), hasilTangkapController.getStats);
router.get('/fish-prices', authorize(ALL_WEB), hasilTangkapController.getActiveFishPrices);
router.get('/fish-price/:fishType', authorize(ALL_WEB), hasilTangkapController.getFishPriceInfo);
router.get('/', authorize(ALL_WEB), hasilTangkapController.getAll);

// Write: admin + operator
router.post('/calculate-tax', authorize(ADMIN_OPERATOR), hasilTangkapController.calculateTax);
router.post('/', authorize(ADMIN_OPERATOR), hasilTangkapController.create);
router.put('/:id', authorize(ADMIN_OPERATOR), hasilTangkapController.update);

// Delete: admin only
router.delete('/:id', authorize(ADMIN_ONLY), hasilTangkapController.delete);

module.exports = router;
