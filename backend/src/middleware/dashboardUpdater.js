const dashboardController = require('../controllers/dashboardController');

// Middleware to emit real-time dashboard updates
const emitDashboardUpdate = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    if (io) {
      // Get fresh dashboard data
      const mockRes = {
        json: (data) => data
      };
      
      const dashboardData = await dashboardController.getDashboardData(req, mockRes);
      
      // Emit to all connected clients
      io.emit('dashboard-update', dashboardData);
      
      console.log('📡 Dashboard update emitted to all clients');
    }
  } catch (error) {
    console.error('❌ Failed to emit dashboard update:', error);
  }
  
  next();
};

module.exports = { emitDashboardUpdate };