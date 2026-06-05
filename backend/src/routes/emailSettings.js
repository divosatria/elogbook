const express = require('express');
const router = express.Router();
const emailSettingController = require('../controllers/emailSettingController');
const { authenticate, authorize, ADMIN_ONLY } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize(ADMIN_ONLY));

router.get('/', emailSettingController.getSettings);
router.put('/', emailSettingController.updateSettings);
router.post('/test', emailSettingController.testEmail);
router.get('/templates', emailSettingController.getTemplates);

module.exports = router;
