const express = require('express');
const router = express.Router();
const monitoringController = require('../../controllers/monitoring/monitoringController');
const { authenticate } = require('../../middleware/auth/auth');
const realtimeUpdater = require('../../middleware/core/realtimeUpdater');

router.use(authenticate);

// Get comprehensive monitoring data
router.get('/data', monitoringController.getMonitoringData);

// Live monitoring dashboard (alias untuk /data)
router.get('/live-monitoring', monitoringController.getMonitoringData);

// Get vessels by harbor zone
router.get('/zones/:zoneId/vessels', monitoringController.getVesselsByZone);

// Update vessel zone with real-time broadcast
router.patch('/vessels/:tripId/zone', 
  realtimeUpdater.broadcastZoneUpdate,
  monitoringController.updateVesselZone
);

// Update vessel location (real-time GPS) with broadcast
router.patch('/vessels/:tripId/location', 
  realtimeUpdater.broadcastLocationUpdate,
  monitoringController.updateVesselLocation
);

// Get vessel real-time data
router.get('/vessels/:tripId/realtime', monitoringController.getVesselRealTimeData);

module.exports = router;