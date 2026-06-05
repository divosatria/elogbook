const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Password Reset Requests
 * Prevents brute force attacks and abuse
 * 
 * Limits: 3 requests per 15 minutes per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: 'Terlalu banyak permintaan reset password. Silakan coba lagi dalam 15 menit.',
    errorType: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for password reset from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak permintaan reset password. Silakan coba lagi dalam 15 menit.',
      errorType: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 menit'
    });
  }
});

/**
 * Rate Limiter for Password Reset Submission
 * More restrictive to prevent password reset abuse
 * 
 * Limits: 5 attempts per 15 minutes per IP
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 password reset attempts per windowMs
  message: {
    success: false,
    message: 'Terlalu banyak percobaan reset password. Silakan coba lagi dalam 15 menit.',
    errorType: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for password reset submission from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan reset password. Silakan coba lagi dalam 15 menit.',
      errorType: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 menit'
    });
  }
});

/**
 * Rate Limiter for Token Verification
 * Moderate limits for checking token validity
 * 
 * Limits: 10 requests per 15 minutes per IP
 */
const verifyTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 10 token verification requests per windowMs
  message: {
    success: false,
    message: 'Terlalu banyak permintaan verifikasi token. Silakan coba lagi nanti.',
    errorType: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for token verification from IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak permintaan verifikasi token. Silakan coba lagi nanti.',
      errorType: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

module.exports = {
  passwordResetLimiter,
  resetPasswordLimiter,
  verifyTokenLimiter
};
