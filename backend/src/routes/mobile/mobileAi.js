const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../../middleware/auth/auth');
const aiController = require('../../controllers/mobile/aiController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image');

router.post('/predict-fish', authenticate, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error in mobile AI predict:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, aiController.predictFish);

module.exports = router;
