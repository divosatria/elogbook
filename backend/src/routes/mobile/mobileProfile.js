const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../../middleware/auth/auth');
const mobileProfileController = require('../../controllers/mobile/mobileProfileController');

// Multer configurations
const docUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => { const fs = require("fs"); const dir = "uploads/temp"; if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); cb(null, dir); }, filename: (req, file, cb) => { cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname.replace(/\s+/g, "_")); } }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
    }
  }
}).any();

const photoUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => { const fs = require("fs"); const dir = "uploads/temp"; if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); cb(null, dir); }, filename: (req, file, cb) => { cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname.replace(/\s+/g, "_")); } }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPG/PNG yang diizinkan'));
    }
  }
}).single('foto');

// Helper middleware for multer errors
const handleUpload = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Routes
router.post('/profile/documents', authenticate, handleUpload(docUpload), mobileProfileController.uploadDocument);
router.get('/profile/documents', authenticate, mobileProfileController.getDocuments);
router.delete('/profile/documents/:documentId', authenticate, mobileProfileController.deleteDocument);

router.get('/profile', authenticate, mobileProfileController.getProfile);
router.put('/profile', authenticate, handleUpload(photoUpload), mobileProfileController.updateProfile);
router.post('/personal-documents', authenticate, mobileProfileController.personalDocumentsAlt);

// Admin Routes
router.get('/profile/admin/pending-documents', authenticate, mobileProfileController.getPendingDocuments);
router.patch('/profile/admin/users/:userId/documents/:documentId/approve', authenticate, mobileProfileController.approveDocument);
router.patch('/profile/admin/users/:userId/documents/:documentId/reject', authenticate, mobileProfileController.rejectDocument);

module.exports = router;
