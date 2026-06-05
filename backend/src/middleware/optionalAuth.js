const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Optional authentication middleware
 * Sets req.user if valid token is provided, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded && decoded.userId) {
      const user = await User.findByPk(decoded.userId);
      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        };
      }
    }
    
    next();
  } catch (error) {
    // Invalid token - continue without user
    console.log('⚠️ Invalid token in optional auth:', error.message);
    next();
  }
};

module.exports = { optionalAuth };