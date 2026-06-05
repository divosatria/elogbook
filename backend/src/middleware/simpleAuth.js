const jwt = require('jsonwebtoken');

const simpleAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = { 
      userId: decoded.userId,
      username: 'admin',
      email: 'admin@seaguard.com',
      role: 'admin'
    };
    
    next();
  } catch (error) {
    console.error('Simple auth error:', error.message);
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

module.exports = { simpleAuth };