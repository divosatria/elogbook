// Quick fix for profile document upload
// This will replace the existing upload configuration

const multer = require('multer');
const path = require('path');

// Create a more flexible multer configuration
const storage = multer.memoryStorage();
const flexibleUpload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('=== MULTER FILE FILTER ===');
    console.log('Field name:', file.fieldname);
    console.log('Original name:', file.originalname);
    console.log('Mimetype:', file.mimetype);
    
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      console.log('✅ File accepted');
      return cb(null, true);
    } else {
      console.log('❌ File rejected - invalid type');
      cb(new Error('Hanya file JPG/PNG/PDF yang diizinkan'));
    }
  }
});

// Export the flexible upload middleware
module.exports = {
  // Accept any field name for file upload
  uploadAny: flexibleUpload.any(),
  
  // Middleware to normalize file field
  normalizeFileField: (req, res, next) => {
    console.log('=== NORMALIZE FILE FIELD ===');
    console.log('Files received:', req.files ? req.files.length : 0);
    
    if (req.files && req.files.length > 0) {
      // Find any file that could be a document or photo
      const docFile = req.files.find(f => 
        ['dokumen', 'file', 'document', 'foto', 'photo', 'suratKeteranganSehat', 'upload'].includes(f.fieldname) ||
        f.mimetype.includes('image') || 
        f.mimetype.includes('pdf')
      );
      
      if (docFile) {
        req.file = docFile; // Set req.file for compatibility
        console.log('✅ Document/Photo file found:', docFile.fieldname, docFile.originalname);
      } else {
        console.log('❌ No valid document/photo file found');
        console.log('Available fields:', req.files.map(f => f.fieldname));
        return res.status(400).json({
          success: false,
          message: 'File tidak ditemukan',
          availableFields: req.files.map(f => f.fieldname)
        });
      }
    } else {
      console.log('ℹ️ No files received - continuing (optional file upload)');
      // Don't return error here - file upload might be optional
    }
    
    next();
  },

  // Middleware for optional file upload (for profile updates)
  normalizeOptionalFile: (req, res, next) => {
    console.log('=== NORMALIZE OPTIONAL FILE ===');
    console.log('Files received:', req.files ? req.files.length : 0);
    
    if (req.files && req.files.length > 0) {
      // Find any file that could be a photo
      const photoFile = req.files.find(f => 
        ['foto', 'photo', 'image'].includes(f.fieldname) ||
        f.mimetype.includes('image')
      );
      
      if (photoFile) {
        req.file = photoFile; // Set req.file for compatibility
        console.log('✅ Photo file found:', photoFile.fieldname, photoFile.originalname);
      }
    }
    
    // Always continue - file is optional
    next();
  }
};