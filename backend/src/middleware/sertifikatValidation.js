const { body, param, validationResult } = require('express-validator');

// Validation for sertifikat upload
const uploadSertifikat = [
  param('kapalId').isInt().withMessage('Vessel ID must be a valid integer'),
  body('nama').optional().isLength({ min: 1, max: 100 }).withMessage('Nama sertifikat maksimal 100 karakter'),
  body('nomorSertifikat').isLength({ min: 1, max: 50 }).withMessage('Nomor sertifikat wajib diisi (maksimal 50 karakter)'),
  body('tanggalBerlaku').isISO8601().withMessage('Tanggal berlaku harus dalam format yang valid'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    
    // Validate date is not in the past (allow 1 day tolerance)
    const tanggalBerlaku = new Date(req.body.tanggalBerlaku);
    const today = new Date();
    today.setDate(today.getDate() - 1); // 1 day tolerance
    
    if (tanggalBerlaku < today) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal berlaku tidak boleh di masa lalu'
      });
    }
    
    next();
  }
];

module.exports = {
  uploadSertifikat
};