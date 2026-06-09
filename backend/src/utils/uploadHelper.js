const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class UploadHelper {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png'],
      document: ['application/pdf']
    };
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  async saveFile(bufferOrPath, originalName, subfolder = '') {
    await this.ensureUploadDir();
    
    const fileName = this.generateFileName(originalName);
    const targetDir = subfolder ? path.join(this.uploadDir, subfolder) : this.uploadDir;
    
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }
    
    const filePath = path.join(targetDir, fileName);
    
    if (typeof bufferOrPath === 'string') {
      // It's a file path (diskStorage)
      await fs.copyFile(bufferOrPath, filePath);
      await fs.unlink(bufferOrPath).catch(e => console.warn('Temp file cleanup warning:', e.message));
    } else {
      // It's a buffer (memoryStorage)
      await fs.writeFile(filePath, bufferOrPath);
    }
    
    return {
      fileName,
      filePath: subfolder ? `${subfolder}/${fileName}` : fileName,
      fullPath: filePath
    };
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      
      // Check if file exists before trying to delete
      try {
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        console.log('File deleted successfully:', filePath);
        return true;
      } catch (accessError) {
        if (accessError.code === 'ENOENT') {
          console.warn('File already deleted or not found:', filePath);
          return true; // Consider as success since file doesn't exist
        }
        throw accessError;
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  validateFile(file) {
    const errors = [];
    
    if (!file) {
      errors.push('File tidak ditemukan');
      return errors;
    }

    if (file.size > this.maxFileSize) {
      errors.push(`Ukuran file maksimal ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const allAllowedTypes = [...this.allowedMimeTypes.image, ...this.allowedMimeTypes.document];
    if (!allAllowedTypes.includes(file.mimetype)) {
      errors.push('Tipe file tidak diizinkan. Hanya JPG, PNG, dan PDF');
    }

    return errors;
  }

  getFileUrl(filePath) {
    return `/uploads/${filePath}`;
  }
}

module.exports = new UploadHelper();
