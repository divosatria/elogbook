const express = require('express');
const router = express.Router();
const crewController = require('../../controllers/vessel/crewController');
const { authenticate } = require('../../middleware/auth/auth');

router.use(authenticate);

// Get available crew
router.get('/nahkoda/available', crewController.getAvailableNahkoda);
router.get('/abk/available', crewController.getAvailableABK);

// Get vessel with crew
router.get('/vessel/:id', crewController.getVesselWithCrew);

// Get crew suggestions for trip assignment
router.get('/suggestions', crewController.getCrewSuggestions);

module.exports = router;