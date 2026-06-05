const express = require('express');
const router = express.Router();
const kapalController = require('../controllers/kapalController');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../middleware/auth');

router.use(authenticate);

// Read: semua web roles
router.get('/', authorize(ALL_WEB), kapalController.getAllKapal);
router.get('/active', authorize(ALL_WEB), kapalController.getActiveVessels);
router.get('/gps-devices', authorize(ALL_WEB), kapalController.getAvailableGPSDevices);
router.get('/alat-tangkap-options', authorize(ALL_WEB), kapalController.getAlatTangkapOptions);
router.get('/:id', authorize(ALL_WEB), kapalController.getKapalById);
router.get('/:id/debug-crew', authorize(ALL_WEB), kapalController.debugVesselCrew);
router.get('/:id/gps-history', authorize(ALL_WEB), kapalController.getVesselGPSHistory);

// Write: admin + operator
router.post('/', authorize(ADMIN_OPERATOR), kapalController.createKapal);
router.put('/:id', authorize(ADMIN_OPERATOR), kapalController.updateKapal);
router.post('/:id/location', authorize(ADMIN_OPERATOR), kapalController.updateLocation);

// Delete: admin only
router.delete('/:id', authorize(ADMIN_ONLY), kapalController.deleteKapal);

module.exports = router;
