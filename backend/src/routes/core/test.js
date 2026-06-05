const express = require('express');
const router = express.Router();

// Test endpoint tanpa auth
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is working',
    timestamp: new Date().toISOString(),
    database: 'Connected',
    auth: 'Available'
  });
});

// Test endpoint dengan data sample
router.get('/sample-data', (req, res) => {
  res.json({
    totalTrips: 5,
    activeTrips: 2,
    totalVessels: 3,
    totalFishermen: 8,
    activeAlerts: 1,
    catchData: {
      totalCatch: '12.5',
      fishTypes: [
        { name: 'Tuna', amount: 5.2, color: '#3b82f6' },
        { name: 'Kakap', amount: 3.8, color: '#10b981' },
        { name: 'Kerapu', amount: 2.1, color: '#f59e0b' }
      ]
    }
  });
});

module.exports = router;