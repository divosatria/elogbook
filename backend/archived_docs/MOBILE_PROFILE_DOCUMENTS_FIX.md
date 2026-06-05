# Fix untuk Mobile Profile Documents Endpoint

## Masalah yang Ditemukan

1. **Konflik Multer Configuration**: 
   - Ada dua konfigurasi multer yang berbeda untuk dokumen
   - Mobile route menggunakan `documentStorage` yang menyimpan ke `/uploads/documents/`
   - Tapi controller mencari file di `/uploads/profile-documents/`

2. **Path Upload yang Salah**:
   - Multer menyimpan file ke folder yang salah
   - Tidak ada folder per-user untuk organisasi file

3. **Missing Crypto Import**:
   - Diperlukan untuk generate unique filename

## Perbaikan yang Dilakukan

### 1. Perbaikan Multer Configuration

```javascript
// Multer config untuk dokumen kapal (vessel documents)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.userId}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Multer config untuk dokumen profil pribadi
const profileDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.userId;
    const dir = path.join(__dirname, `../../uploads/profile-documents/${userId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.createHash('md5').update(file.originalname + Date.now()).digest('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
```

### 2. Pemisahan Upload Handler

```javascript
// Untuk dokumen kapal
const uploadDocument = multer({
  storage: documentStorage,
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
});

// Untuk dokumen profil pribadi
const uploadProfileDocument = multer({
  storage: profileDocumentStorage,
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
});
```

### 3. Update Endpoint

```javascript
// Upload Personal Documents - menggunakan uploadProfileDocument
router.post('/profile/documents', authenticate, uploadProfileDocument.single('dokumen'), async (req, res) => {
  // ... implementation
});

// Upload Vessel Documents - menggunakan uploadDocument
router.post('/vessel/:kapalId/documents', authenticate, uploadDocument.single('file'), async (req, res) => {
  // ... implementation
});
```

### 4. Perbaikan File Path

```javascript
// Dalam endpoint upload profile documents
const documentData = {
  id: Date.now().toString(),
  jenisDokumen: jenisDokumen,
  nomorDokumen: nomorDokumen || null,
  tanggalBerlaku: tanggalBerlaku ? new Date(tanggalBerlaku) : null,
  keterangan: keterangan || null,
  fileName: req.file.filename,
  filePath: req.file.path,
  fileUrl: `/uploads/profile-documents/${userId}/${req.file.filename}`, // Path yang benar
  uploadedAt: new Date(),
  status: 'pending',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null
};
```

### 5. Debug Endpoint

Ditambahkan endpoint debug untuk troubleshooting:

```javascript
router.get('/profile/documents-debug', authenticate, async (req, res) => {
  // Menampilkan informasi debug tentang:
  // - User ID dan role
  // - Upload directory path
  // - Files yang ada di directory
  // - Documents yang ada di database
});
```

## Struktur Folder Upload

```
uploads/
├── profile-documents/          # Dokumen profil pribadi
│   ├── 1/                     # User ID 1
│   │   ├── 1234567890-abc123.jpg
│   │   └── 1234567891-def456.pdf
│   ├── 2/                     # User ID 2
│   │   └── 1234567892-ghi789.jpg
│   └── ...
├── documents/                  # Dokumen kapal
│   ├── 1-1234567890-sertifikat.pdf
│   └── 2-1234567891-izin.pdf
└── ...
```

## Testing

1. **Check Mobile Users**: 
   ```bash
   node check-mobile-users.js
   ```

2. **Test Profile Documents Upload**:
   ```bash
   node test-mobile-profile-documents.js
   ```

3. **Debug Endpoint**:
   ```
   GET /api/mobile/profile/documents-debug
   ```

## Endpoint yang Diperbaiki

- `POST /api/mobile/profile/documents` - Upload dokumen profil pribadi
- `GET /api/mobile/profile/documents` - Get dokumen profil pribadi
- `DELETE /api/mobile/profile/documents/:documentId` - Hapus dokumen profil pribadi
- `GET /api/mobile/profile/documents-debug` - Debug info (baru)

## Jenis Dokumen yang Didukung

Untuk mobile app (nahkoda dan ABK):
- KTP
- Pas Foto
- NPWP
- Buku Pelaut
- Sertifikat Nahkoda
- BST (Basic Safety Training)
- Surat Keterangan Sehat
- SKCK

## File Types yang Didukung

- JPG/JPEG
- PNG
- PDF

## Ukuran File Maksimal

- 10MB per file

## Authentication

- Hanya user dengan role `nahkoda` atau `abk` yang bisa mengakses
- Menggunakan JWT token dari mobile login