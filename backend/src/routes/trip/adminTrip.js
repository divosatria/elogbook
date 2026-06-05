const express = require('express');
const router = express.Router();
const adminTripController = require('../../controllers/trip/adminTripController');
const { authenticate, authorize } = require('../../middleware/auth/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.post('/trip', adminTripController.createTrip);
router.get('/trips/pending', adminTripController.getPendingTrips);
router.get('/trip/:tripId/documents', adminTripController.checkDocuments);
router.patch('/trip/:tripId/approve', adminTripController.approveTrip);
router.patch('/trip/:tripId/reject', adminTripController.rejectTrip);
router.get('/live-monitoring', adminTripController.liveMonitoring);

module.exports = router;
