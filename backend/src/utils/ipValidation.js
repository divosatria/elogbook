/**
 * Comprehensive IP address validation
 */
const isValidIP = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  // IPv4 validation with proper octet range checking
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 validation (comprehensive pattern)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Sanitize IP address while preserving valid characters
 */
const sanitizeIP = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return null;
  }
  
  // Allow IPv4 and IPv6 characters, limit length
  const sanitized = ip.replace(/[^0-9a-fA-F.:]/g, '').substring(0, 45);
  
  // Validate the sanitized result
  return isValidIP(sanitized) ? sanitized : null;
};

module.exports = { isValidIP, sanitizeIP };