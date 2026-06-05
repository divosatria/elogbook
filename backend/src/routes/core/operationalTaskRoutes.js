const express = require('express');
const router = express.Router();
const operationalTaskController = require('../../controllers/core/operationalTaskController');
const { authenticate } = require('../../middleware/auth/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all operational tasks
router.get('/', operationalTaskController.getAllTasks);

// Get task by ID
router.get('/:id', operationalTaskController.getTaskById);

// Create new task
router.post('/', operationalTaskController.createTask);

// Update task
router.put('/:id', operationalTaskController.updateTask);

// Complete task
router.put('/:id/complete', operationalTaskController.completeTask);

// Convert task to trip
router.post('/:id/convert-to-trip', operationalTaskController.convertTaskToTrip);

// Delete task
router.delete('/:id', operationalTaskController.deleteTask);

// Get tasks by catch polygon zone
router.get('/zone/:zoneId', operationalTaskController.getTasksByZone);

module.exports = router;