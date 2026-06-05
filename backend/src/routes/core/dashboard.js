const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/core/dashboardController');
const { simpleAuth } = require('../../middleware/auth/simpleAuth');

router.use(simpleAuth);

router.get('/', dashboardController.getDashboardData);

// Real-time dashboard updates endpoint
router.get('/realtime', async (req, res) => {
  try {
    const io = req.app.get('io');
    
    // Create a proper mock response object
    const mockRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => data })
    };
    
    // Get dashboard data using proper controller call
    const dashboardData = await new Promise((resolve, reject) => {
      const mockResWithResolve = {
        json: (data) => resolve(data),
        status: (code) => ({ json: (data) => resolve(data) })
      };
      
      dashboardController.getDashboardData(req, mockResWithResolve)
        .catch(reject);
    });
    
    if (io) {
      io.emit('dashboard-update', dashboardData);
    }
    
    res.json({ 
      success: true,
      message: 'Real-time update sent', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('❌ Real-time dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send real-time update', 
      error: error.message 
    });
  }
});

module.exports = router;