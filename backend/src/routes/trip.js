const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const tripDocumentController = require('../controllers/tripDocumentController');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../middleware/auth');

router.use(authenticate);

// Read: semua web roles
router.get('/', authorize(ALL_WEB), tripController.getAllTrips);
router.get('/:id/logbook-data', authorize(ALL_WEB), tripController.getTripLogbookData);
router.get('/:id', authorize(ALL_WEB), tripController.getTripById);
router.get('/:id/trip-documents', authorize(ALL_WEB), tripDocumentController.getTripDocuments);

// Write/approve: admin + operator
router.post('/', authorize(ADMIN_OPERATOR), tripController.createTrip);
router.patch('/:id/status', authorize(ADMIN_OPERATOR), tripController.updateTripStatus);
router.patch('/:id/documents', authorize(ADMIN_OPERATOR), tripController.updateTripDocuments);
router.patch('/:id/document/:documentType', authorize(ADMIN_OPERATOR), tripController.approveDocument);
router.patch('/:id/location', authorize(ADMIN_OPERATOR), tripController.updateVesselLocation);
router.post('/:id/upload-document', authorize([...ADMIN_OPERATOR, 'nahkoda']), tripDocumentController.upload.single('dokumen'), tripDocumentController.uploadTripDocument);

// Delete: admin only
router.delete('/:id', authorize(ADMIN_ONLY), tripController.deleteTrip);
router.post('/clean-vessel/:vesselId', authorize(ADMIN_ONLY), tripController.cleanVesselData);

module.exports = router;
