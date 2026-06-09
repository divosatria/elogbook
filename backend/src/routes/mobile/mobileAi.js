const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../../middleware/auth/auth');
const aiController = require('../../controllers/mobile/aiController');

const upload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => { const fs = require("fs"); const dir = "uploads/temp"; if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); cb(null, dir); }, filename: (req, file, cb) => { cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname.replace(/\s+/g, "_")); } }),
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
