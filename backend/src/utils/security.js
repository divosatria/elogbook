const crypto = require('crypto');

/**
 * Validate and sanitize host header to prevent injection attacks
 */
const validateHost = (host) => {
  if (!host || typeof host !== 'string') {
    return null;
  }
  
  // Remove any suspicious characters and limit length
  const sanitized = host.replace(/[^a-zA-Z0-9.-:]/g, '').substring(0, 253);
  
  // Basic hostname/IP validation
  const hostPattern = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(:[0-9]{1,5})?$|^(\d{1,3}\.){3}\d{1,3}(:[0-9]{1,5})?$|^\[([0-9a-fA-F:]+)\](:[0-9]{1,5})?$/;
  
  if (!hostPattern.test(sanitized)) {
    return null;
  }
  
  return sanitized;
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

module.exports = { validateHost, safeCompare };