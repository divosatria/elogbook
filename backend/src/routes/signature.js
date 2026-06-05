const express = require('express');
const router = express.Router();
const signatureController = require('../controllers/signatureController');

/**
 * @swagger
 * /api/admin/signature:
 *   get:
 *     summary: Get signature settings for PDF export
 *     tags: [Admin - Signature]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signature settings retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', signatureController.getSignatureSettings);

/**
 * @swagger
 * /api/admin/signature:
 *   put:
 *     summary: Update signature settings (name and position)
 *     tags: [Admin - Signature]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - position
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Kepala Dinas Kelautan dan Perikanan"
 *               position:
 *                 type: string
 *                 example: "Kepala Dinas"
 *     responses:
 *       200:
 *         description: Signature settings updated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/', signatureController.updateSignatureSettings);

/**
 * @swagger
 * /api/admin/signature/upload:
 *   post:
 *     summary: Upload signature image
 *     tags: [Admin - Signature]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Signature image uploaded successfully
 *       400:
 *         description: Invalid file type or no file provided
 *       500:
 *         description: Server error
 */
router.post('/upload', signatureController.uploadSignatureImage);

/**
 * @swagger
 * /api/admin/signature/image:
 *   delete:
 *     summary: Delete signature image
 *     tags: [Admin - Signature]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signature image deleted successfully
 *       404:
 *         description: No signature image found
 *       500:
 *         description: Server error
 */
router.delete('/image', signatureController.deleteSignatureImage);

module.exports = router;
