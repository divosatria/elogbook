const errorHandler = (err, req, res, next) => {
  console.error('=== ERROR HANDLER DEBUG ===');
  console.error('Error name:', err.name);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  console.error('Error field:', err.field);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Content-Type:', req.headers['content-type']);
  console.error('==============================');

  // Multer errors
  if (err.code === 'UNEXPECTED_FIELD') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected field',
      details: {
        field: err.field,
        expectedField: 'dokumen',
        receivedField: err.field
      }
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File terlalu besar'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      details: {
        field: err.field,
        expectedField: 'dokumen'
      }
    });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return res.status(400).json({
      success: false,
      message: `${field} sudah terdaftar`
    });
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Data terkait tidak ditemukan'
    });
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error'
    });
  }

  // CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  if (err.message && err.message.includes('misconfigured csrf')) {
    return res.status(500).json({
      success: false,
      message: 'misconfigured csrf'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token sudah expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;