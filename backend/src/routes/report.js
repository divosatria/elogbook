const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/catch', reportController.getCatchReports);
router.post('/catch', reportController.createCatchReport);

module.exports = router;