const express = require('express');
const router = express.Router();
const multer = require('multer');
const mobileCatchController = require('../../controllers/mobile/mobileCatchController');
const { authenticate } = require('../../middleware/auth/auth');

// Configure multer for photo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// POST /api/mobile/catches - Submit catch data
router.post('/', upload.single('photo'), mobileCatchController.submitCatch);

// GET /api/mobile/catches - Get my catches
router.get('/', mobileCatchController.getMyCatches);

module.exports = router;
