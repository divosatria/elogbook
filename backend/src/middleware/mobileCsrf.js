const csrf = require('csurf');

// CSRF protection for mobile endpoints
const mobileCsrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Only protect state-changing methods
  value: (req) => {
    // Support both header and body token
    return req.headers['x-csrf-token'] || 
           req.headers['csrf-token'] || 
           req.body._csrf ||
           req.query._csrf;
  }
});

// Conditional CSRF - only in production
const conditionalCsrf = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return mobileCsrfProtection(req, res, next);
  }
  next();
};

module.exports = { conditionalCsrf, mobileCsrfProtection };