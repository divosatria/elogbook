const express = require('express');
const router = express.Router();
const syncController = require('../../controllers/sync/desktopSync');
const { checkMobileApiKey } = require('../../middleware/auth/mobileApiKey'); // Use mobile API key auth

// Define routes for desktop synchronization
router.get('/data', checkMobileApiKey, syncController.getSyncData);
router.post('/data', checkMobileApiKey, syncController.postSyncData);
router.get('/status', checkMobileApiKey, syncController.getSyncStatus);

module.exports = router;