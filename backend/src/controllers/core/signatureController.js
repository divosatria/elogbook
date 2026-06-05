const { sequelize: db } = require('../../config/database');
const { QueryTypes } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for signature image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPEG, JPG, PNG) yang diperbolehkan!'));
    }
  }
}).single('signature');

class SignatureController {
  // Get current signature settings
  async getSignatureSettings(req, res) {
    try {
      const rows = await db.query('SELECT * FROM signature_settings ORDER BY id DESC LIMIT 1', { type: QueryTypes.SELECT });
      
      if (rows.length === 0) {
        return res.json({
          name: 'Kepala Dinas Kelautan dan Perikanan',
          position: 'Kepala Dinas',
          signature_image_path: null
        });
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching signature settings:', error);
      res.status(500).json({ message: 'Gagal mengambil pengaturan tanda tangan', error: error.message });
    }
  }

  // Update signature settings (name and position)
  async updateSignatureSettings(req, res) {
    try {
      const { name, position } = req.body;

      if (!name || !position) {
        return res.status(400).json({ message: 'Nama dan jabatan harus diisi' });
      }

      const existing = await db.query('SELECT id FROM signature_settings LIMIT 1', { type: QueryTypes.SELECT });

      if (existing.length > 0) {
        await db.query(
          'UPDATE signature_settings SET name = ?, position = ?, updated_at = NOW() WHERE id = ?',
          { replacements: [name, position, existing[0].id], type: QueryTypes.UPDATE }
        );
      } else {
        await db.query(
          'INSERT INTO signature_settings (name, position) VALUES (?, ?)',
          { replacements: [name, position], type: QueryTypes.INSERT }
        );
      }

      const updated = await db.query('SELECT * FROM signature_settings ORDER BY id DESC LIMIT 1', { type: QueryTypes.SELECT });
      res.json({
        message: 'Pengaturan tanda tangan berhasil diperbarui',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error updating signature settings:', error);
      res.status(500).json({ message: 'Gagal memperbarui pengaturan tanda tangan', error: error.message });
    }
  }

  // Upload signature image
  async uploadSignatureImage(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diupload' });
      }

      try {
        const signatureImagePath = `/uploads/signatures/${req.file.filename}`;

        const existing = await db.query('SELECT id, signature_image_path FROM signature_settings LIMIT 1', { type: QueryTypes.SELECT });

        if (existing.length > 0) {
          if (existing[0].signature_image_path) {
            const oldImagePath = path.join(__dirname, '../..', existing[0].signature_image_path);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
          }
          await db.query(
            'UPDATE signature_settings SET signature_image_path = ?, updated_at = NOW() WHERE id = ?',
            { replacements: [signatureImagePath, existing[0].id], type: QueryTypes.UPDATE }
          );
        } else {
          await db.query(
            'INSERT INTO signature_settings (name, position, signature_image_path) VALUES (?, ?, ?)',
            { replacements: ['Kepala Dinas Kelautan dan Perikanan', 'Kepala Dinas', signatureImagePath], type: QueryTypes.INSERT }
          );
        }

        const updated = await db.query('SELECT * FROM signature_settings ORDER BY id DESC LIMIT 1', { type: QueryTypes.SELECT });
        res.json({
          message: 'Gambar tanda tangan berhasil diupload',
          data: updated[0]
        });
      } catch (error) {
        console.error('Error saving signature image:', error);
        // Delete uploaded file on error
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Gagal menyimpan gambar tanda tangan', error: error.message });
      }
    });
  }

  // Delete signature image
  async deleteSignatureImage(req, res) {
    try {
      const existing = await db.query('SELECT id, signature_image_path FROM signature_settings LIMIT 1', { type: QueryTypes.SELECT });

      if (existing.length === 0 || !existing[0].signature_image_path) {
        return res.status(404).json({ message: 'Tidak ada gambar tanda tangan untuk dihapus' });
      }

      const imagePath = path.join(__dirname, '../..', existing[0].signature_image_path);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

      await db.query(
        'UPDATE signature_settings SET signature_image_path = NULL, updated_at = NOW() WHERE id = ?',
        { replacements: [existing[0].id], type: QueryTypes.UPDATE }
      );

      res.json({ message: 'Gambar tanda tangan berhasil dihapus' });
    } catch (error) {
      console.error('Error deleting signature image:', error);
      res.status(500).json({ message: 'Gagal menghapus gambar tanda tangan', error: error.message });
    }
  }
}

module.exports = new SignatureController();
