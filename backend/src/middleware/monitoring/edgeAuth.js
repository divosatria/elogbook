const edgeAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or invalid Authorization header format'
    });
  }

  const token = authHeader.split(' ')[1];
  const expectedApiKey = process.env.EDGE_API_KEY;

  if (!expectedApiKey) {
    console.error('CRITICAL: EDGE_API_KEY is not defined in .env');
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error: IoT Edge Sync is not configured properly'
    });
  }

  if (token !== expectedApiKey) {
    console.warn(`Unauthorized Edge Sync attempt with invalid token: ${token.substring(0, 5)}...`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid API Key'
    });
  }

  next();
};

module.exports = { edgeAuth };
