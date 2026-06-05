const express = require('express');
const router = express.Router();
const tripTaskController = require('../../controllers/trip/tripTaskController');
const { authenticate } = require('../../middleware/auth/auth');

router.use(authenticate);

// Trip task routes
router.get('/', tripTaskController.getAllTripTasks);
router.get('/trip/:tripId', tripTaskController.getTripTasksByTripId);
router.get('/pending', tripTaskController.getPendingTasksForUser);
router.post('/', tripTaskController.createTripTask);
router.put('/:id', tripTaskController.updateTripTask);
router.put('/:id/complete', tripTaskController.completeTask);
router.delete('/:id', tripTaskController.deleteTripTask);

module.exports = router;