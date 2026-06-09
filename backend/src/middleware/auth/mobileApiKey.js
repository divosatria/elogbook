
// Middleware Security untuk Client Mobile (Edge)
const checkMobileApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.EDGE_API_KEY;

  // Jika env requireMobileApiKey = true, maka wajibkan.
  // Default = false (soft mode) agar tidak merusak aplikasi Flutter yang belum update.
  const requireStrict = process.env.REQUIRE_MOBILE_API_KEY === 'true';

  if (!expectedKey) {
    return next(); // API Key belum dikonfigurasi di backend
  }

  if (apiKey !== expectedKey) {
    if (requireStrict) {
      return res.status(403).json({
        success: false,
        message: 'Akses Ditolak: API Key tidak valid atau tidak ditemukan.'
      });
    } else {
      // Soft-check mode (hanya log)
      // console.warn(`[API KEY WARNING] Akses dari ${req.ip} ke ${req.originalUrl} tanpa x-api-key valid.`);
    }
  }

  next();
};

module.exports = { checkMobileApiKey };
