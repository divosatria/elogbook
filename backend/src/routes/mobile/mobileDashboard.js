const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth/auth');
const mobileDashboardController = require('../../controllers/mobile/mobileDashboardController');

router.get('/dashboard', authenticate, mobileDashboardController.getDashboard);
router.get('/notifications', authenticate, mobileDashboardController.getNotifications);
router.post('/notifications', authenticate, mobileDashboardController.readNotification);

module.exports = router;
