const express = require('express');
const router = express.Router();
const mobileTripController = require('../../controllers/mobile/mobileTripController');
const { authenticate } = require('../../middleware/auth/auth');

router.use(authenticate);

router.get('/:tripId/readiness', mobileTripController.checkReadiness);
router.patch('/:tripId/start', mobileTripController.startTrip);
router.patch('/:tripId/complete', mobileTripController.completeTrip);

module.exports = router;
