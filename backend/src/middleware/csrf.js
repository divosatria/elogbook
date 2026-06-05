const csrf = require('csurf');

// CSRF protection configuration
// Only active in production
const csrfMiddleware = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

const csrfProtection = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return csrfMiddleware(req, res, next);
  }
  next();
};

// Endpoint to get CSRF token
const getCsrfToken = (req, res) => {
  // Safe check if csrfToken function exists (it might not in development)
  const token = typeof req.csrfToken === 'function' ? req.csrfToken() : null;
  
  res.json({
    success: true,
    csrfToken: token,
    message: token ? 'Token generated' : 'CSRF protection disabled in this environment'
  });
};

module.exports = { csrfProtection, getCsrfToken };