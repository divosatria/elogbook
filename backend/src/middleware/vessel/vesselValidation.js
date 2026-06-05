const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    console.log('📋 Request body:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

const vesselValidation = {
  uploadSertifikat: [
    param('kapalId').isInt().withMessage('ID kapal tidak valid'),
    body('nama').optional().isString().trim().isLength({ min: 1, max: 100 })
      .withMessage('Nama sertifikat maksimal 100 karakter'),
    body('nomorSertifikat')
      .notEmpty().withMessage('Nomor sertifikat wajib diisi')
      .isLength({ min: 3, max: 50 }).withMessage('Nomor sertifikat 3-50 karakter')
      .matches(/^[A-Za-z0-9\-\/\s]+$/).withMessage('Format nomor sertifikat tidak valid'),
    body('tanggalBerlaku')
      .notEmpty().withMessage('Tanggal berlaku wajib diisi')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Format tanggal tidak valid')
      .custom((value) => {
        const date = new Date(value + 'T00:00:00.000Z');
        if (isNaN(date.getTime())) {
          throw new Error('Format tanggal tidak valid');
        }
        return true;
      }),
    handleValidationErrors
  ],

  uploadBahanBakar: [
    param('kapalId').isInt().withMessage('ID kapal tidak valid'),
    handleValidationErrors
  ],

  getDocuments: [
    param('kapalId').isInt().withMessage('ID kapal tidak valid'),
    handleValidationErrors
  ],

  getFuelSummary: [
    param('kapalId').isInt().withMessage('ID kapal tidak valid'),
    query('startDate').optional().isISO8601().withMessage('Format startDate tidak valid'),
    query('endDate').optional().isISO8601().withMessage('Format endDate tidak valid')
      .custom((value, { req }) => {
        if (req.query.startDate && value) {
          const start = new Date(req.query.startDate);
          const end = new Date(value);
          if (end < start) {
            throw new Error('endDate harus setelah startDate');
          }
        }
        return true;
      }),
    handleValidationErrors
  ]
};

module.exports = {
  vesselValidation,
  sanitizeString,
  handleValidationErrors
};
