const express = require('express');
const router = express.Router();
const multer = require('multer');
const storageDataController = require('../../controllers/core/storageDataController');
const { authenticate } = require('../../middleware/auth/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

router.use(authenticate);

router.post('/:kapalId/storage-data', upload.single('foto'), storageDataController.uploadStorageData);
router.get('/:kapalId/storage-data', storageDataController.getStorageData);

module.exports = router;
