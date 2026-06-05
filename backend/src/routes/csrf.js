const express = require('express');
const router = express.Router();
const { getCsrfToken } = require('../middleware/csrf');

// GET /api/csrf-token - Get CSRF token for frontend
router.get('/csrf-token', getCsrfToken);

module.exports = router;