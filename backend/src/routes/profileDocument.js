const express = require('express');
const router = express.Router();
const profileDocumentController = require('../controllers/profileDocumentController');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/vesselValidation');
const flexibleUpload = require('../middleware/flexibleUpload');

// Apply authentication to all routes
router.use(authenticate);

// Validation for upload
const uploadValidation = [
  body('jenisDokumen')
    .trim()
    .isIn([
      'KTP',
      'Buku Pelaut',
      'Sertifikat Nahkoda',
      'BST',
      'Surat Keterangan Sehat',
      'SKCK',
      'Pas Foto',
      'NPWP'
    ])
    .withMessage('Jenis dokumen tidak valid'),
  body('nomorDokumen')
    .custom((value, { req }) => {
      const jenisDokumen = req.body.jenisDokumen;
      const category1Docs = ['KTP', 'Pas Foto'];
      
      // Category 1 tidak butuh nomor dokumen - allow empty string, null, undefined
      if (category1Docs.includes(jenisDokumen)) {
        return true;
      }
      
      // Category 2 & 3 butuh nomor dokumen
      const strValue = String(value || '').trim();
      if (strValue === '' || strValue.length < 3 || strValue.length > 50) {
        throw new Error('Nomor dokumen 3-50 karakter');
      }
      return true;
    }),
  body('tanggalBerlaku')
    .custom((value, { req }) => {
      const jenisDokumen = req.body.jenisDokumen;
      const category1Docs = ['KTP', 'Pas Foto'];
      const category2Docs = ['NPWP'];
      
      // Category 1 & 2 tidak butuh tanggal berlaku - allow empty string, null, undefined
      if (category1Docs.includes(jenisDokumen) || category2Docs.includes(jenisDokumen)) {
        return true;
      }
      
      // Category 3 butuh tanggal berlaku
      const strValue = String(value || '').trim();
      if (strValue === '') {
        throw new Error('Format tanggal tidak valid');
      }
      
      // Validasi format tanggal
      if (!strValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Format tanggal tidak valid');
      }
      
      return true;
    }),
  body('keterangan')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Keterangan maksimal 200 karakter'),
  handleValidationErrors
];

// Upload profile document
router.post('/documents', 
  flexibleUpload.uploadAny,
  flexibleUpload.normalizeFileField,
  uploadValidation,
  profileDocumentController.uploadProfileDocument
);

// Get all profile documents
router.get('/documents', 
  profileDocumentController.getProfileDocuments
);

// Update user profile
router.put('/', 
  flexibleUpload.uploadAny,
  flexibleUpload.normalizeOptionalFile,
  body('nama').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('noTelepon').optional().trim().isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('alamat').optional().trim().isLength({ max: 200 }).withMessage('Alamat maksimal 200 karakter'),
  handleValidationErrors,
  profileDocumentController.updateProfile
);

// Get user profile
router.get('/', 
  profileDocumentController.getProfile
);

// Delete profile document
router.delete('/documents/:documentId',
  param('documentId').notEmpty().withMessage('Document ID required'),
  handleValidationErrors,
  profileDocumentController.deleteProfileDocument
);

// ===== ADMIN ROUTES =====

// Get all documents (admin only)
router.get('/admin/all-documents',
  authorize('admin'),
  profileDocumentController.getAllDocuments
);

// Get all pending documents (admin only)
router.get('/admin/pending-documents',
  authorize('admin'),
  profileDocumentController.getPendingDocuments
);

// Approve document (admin only)
router.patch('/admin/users/:userId/documents/:documentId/approve',
  authorize('admin'),
  param('userId').isInt().withMessage('User ID harus integer'),
  param('documentId').notEmpty().withMessage('Document ID required'),
  handleValidationErrors,
  profileDocumentController.approveDocument
);

// Reject document (admin only)
router.patch('/admin/users/:userId/documents/:documentId/reject',
  authorize('admin'),
  param('userId').isInt().withMessage('User ID harus integer'),
  param('documentId').notEmpty().withMessage('Document ID required'),
  body('reason').trim().notEmpty().withMessage('Alasan penolakan wajib diisi'),
  handleValidationErrors,
  profileDocumentController.rejectDocument
);

// Delete document (admin only)
router.delete('/admin/users/:userId/documents/:documentId',
  authorize('admin'),
  param('userId').isInt().withMessage('User ID harus integer'),
  param('documentId').notEmpty().withMessage('Document ID required'),
  handleValidationErrors,
  profileDocumentController.deleteDocumentByAdmin
);

module.exports = router;
