const express = require('express');
const router = express.Router();
const mobileVesselController = require('../../controllers/mobile/mobileVesselController');
const { authenticate } = require('../../middleware/auth/auth');
const { vesselValidation } = require('../../middleware/vessel/vesselValidation');
const { uploadSertifikat } = require('../../middleware/vessel/sertifikatValidation');

// Apply authentication to all routes
router.use(authenticate);

// Production endpoints only - debug endpoints removed for security

// Get vessel for current user (Must be before /:kapalId to avoid conflict)
router.get('/my-vessel', mobileVesselController.getMyVessel);

// Upload sertifikat jalan (WITH PROPER VALIDATION)
router.post('/:kapalId/sertifikat-jalan', 
  uploadSertifikat,
  mobileVesselController.upload.single('sertifikat'), 
  mobileVesselController.uploadSertifikatJalan
);

// Upload data bahan bakar
router.post('/:kapalId/bahan-bakar', 
  vesselValidation.uploadBahanBakar,
  mobileVesselController.upload.single('bukti'), 
  mobileVesselController.uploadDataBahanBakar
);

// Update data bahan bakar
router.put('/:kapalId/bahan-bakar/:fuelId', 
  vesselValidation.uploadBahanBakar,
  mobileVesselController.upload.single('bukti'), 
  mobileVesselController.updateDataBahanBakar
);

// Delete data bahan bakar
router.delete('/:kapalId/bahan-bakar/:fuelId', 
  mobileVesselController.deleteDataBahanBakar
);

// Get vessel documents and fuel data
router.get('/:kapalId/documents', 
  vesselValidation.getDocuments,
  mobileVesselController.getVesselDocuments
);

// Get fuel consumption summary
router.get('/:kapalId/fuel-summary', 
  vesselValidation.getFuelSummary,
  mobileVesselController.getFuelSummary
);

module.exports = router;