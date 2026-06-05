# 📋 Alur Manajemen Pengguna & Dokumen

## 🔄 Workflow Lengkap

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. ADMIN MEMBUAT AKUN                        │
│                     (Website Dashboard)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. USER LOGIN DI MOBILE APP                        │
│              (Nahkoda/ABK menggunakan email)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           3. USER UPLOAD DOKUMEN DI MOBILE                      │
│                                                                 │
│   📄 KTP:                                                       │
│      - Upload file saja (JPG/PNG/PDF)                          │
│      - Tidak perlu nomor & tanggal                             │
│                                                                 │
│   📄 Dokumen Lain:                                              │
│      - Upload file (JPG/PNG/PDF)                               │
│      - Nomor dokumen (wajib)                                   │
│      - Tanggal berlaku (wajib)                                 │
│      - Keterangan (opsional)                                   │
│                                                                 │
│   Status: PENDING (menunggu verifikasi)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         4. ADMIN MELIHAT DOKUMEN PENDING                        │
│              (Website Dashboard)                                │
│                                                                 │
│   - List semua user dengan dokumen pending                     │
│   - Preview dokumen                                             │
│   - Cek kelengkapan data                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
        ┌──────────────┐  ┌──────────────┐
        │   APPROVE    │  │    REJECT    │
        │   ✅ ACC     │  │   ❌ TOLAK   │
        └──────┬───────┘  └──────┬───────┘
               │                  │
               │                  ▼
               │         ┌─────────────────┐
               │         │ Beri alasan     │
               │         │ penolakan       │
               │         └────────┬────────┘
               │                  │
               ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. USER MELIHAT STATUS DOKUMEN                     │
│                    (Mobile App)                                 │
│                                                                 │
│   ✅ APPROVED: Dokumen disetujui, bisa akses penuh             │
│   ❌ REJECTED: Dokumen ditolak, lihat alasan & upload ulang    │
│   ⏳ PENDING: Menunggu verifikasi admin                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 API Endpoints

### **Mobile User Endpoints**

#### 1. Upload Dokumen
```http
POST /api/mobile/profile/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Untuk KTP
{
  "dokumen": <file>,
  "jenisDokumen": "KTP",
  "keterangan": "KTP terbaru" (optional)
}

# Untuk Dokumen Lain
{
  "dokumen": <file>,
  "jenisDokumen": "Buku Pelaut",
  "nomorDokumen": "BP-123456",
  "tanggalBerlaku": "2025-12-31",
  "keterangan": "Buku pelaut aktif" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dokumen berhasil diupload dan menunggu verifikasi admin",
  "data": {
    "id": "1768440000000",
    "jenisDokumen": "KTP",
    "nomorDokumen": null,
    "tanggalBerlaku": null,
    "fileName": "ktp-1768440000000.jpg",
    "fileUrl": "/uploads/profile-documents/5/ktp-1768440000000.jpg",
    "status": "pending",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 2. Lihat Dokumen Saya
```http
GET /api/mobile/profile/documents
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "username": "nahkoda1",
      "email": "nahkoda@example.com",
      "nama": "Kapten Ahmad"
    },
    "dokumen": [
      {
        "id": "1768440000000",
        "jenisDokumen": "KTP",
        "fileName": "ktp.jpg",
        "fileUrl": "/uploads/...",
        "status": "approved",
        "uploadedAt": "2024-01-15T10:30:00.000Z",
        "verifiedAt": "2024-01-15T11:00:00.000Z"
      },
      {
        "id": "1768440000001",
        "jenisDokumen": "Buku Pelaut",
        "nomorDokumen": "BP-123456",
        "tanggalBerlaku": "2025-12-31",
        "fileName": "buku-pelaut.pdf",
        "fileUrl": "/uploads/...",
        "status": "pending",
        "uploadedAt": "2024-01-15T10:35:00.000Z"
      }
    ]
  }
}
```

#### 3. Hapus Dokumen
```http
DELETE /api/mobile/profile/documents/:documentId
Authorization: Bearer <token>
```

---

### **Admin Website Endpoints**

#### 1. Lihat Semua Dokumen Pending
```http
GET /api/mobile/profile/admin/pending-documents
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "username": "nahkoda1",
      "email": "nahkoda@example.com",
      "nama": "Kapten Ahmad",
      "role": "nahkoda",
      "pendingDocuments": [
        {
          "id": "1768440000001",
          "jenisDokumen": "Buku Pelaut",
          "nomorDokumen": "BP-123456",
          "tanggalBerlaku": "2025-12-31",
          "fileName": "buku-pelaut.pdf",
          "fileUrl": "/uploads/...",
          "status": "pending",
          "uploadedAt": "2024-01-15T10:35:00.000Z"
        }
      ]
    }
  ]
}
```

#### 2. Approve Dokumen
```http
PATCH /api/mobile/profile/admin/users/:userId/documents/:documentId/approve
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Dokumen berhasil disetujui"
}
```

#### 3. Reject Dokumen
```http
PATCH /api/mobile/profile/admin/users/:userId/documents/:documentId/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Foto KTP tidak jelas, mohon upload ulang dengan kualitas lebih baik"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dokumen ditolak"
}
```

---

## 📄 Jenis Dokumen

### 1. **KTP** (Khusus)
- ✅ Upload file saja
- ❌ Tidak perlu nomor dokumen
- ❌ Tidak perlu tanggal berlaku
- Format: JPG, PNG, PDF (max 10MB)

### 2. **Pas Foto** (Khusus)
- ✅ Upload file saja
- ❌ Tidak perlu nomor dokumen
- ❌ Tidak perlu tanggal berlaku
- Format: JPG, PNG (max 10MB)

### 3. **NPWP** (Khusus)
- ✅ Upload file
- ✅ Nomor dokumen (wajib)
- ❌ Tidak perlu tanggal berlaku (NPWP tidak ada masa berlaku)
- Format: JPG, PNG, PDF (max 10MB)

### 4. **Dokumen Lain** (Standar)
- ✅ Upload file
- ✅ Nomor dokumen (wajib)
- ✅ Tanggal berlaku (wajib)
- ✅ Keterangan (opsional)

**Daftar Dokumen:**
- Buku Pelaut
- Sertifikat Nahkoda
- BST (Basic Safety Training)
- Surat Keterangan Sehat
- SKCK (Surat Keterangan Catatan Kepolisian)

---

## 🔐 Status Dokumen

| Status | Deskripsi | Aksi User | Aksi Admin |
|--------|-----------|-----------|------------|
| **pending** | Menunggu verifikasi | Tunggu | Review & Approve/Reject |
| **approved** | Disetujui | Lihat dokumen | - |
| **rejected** | Ditolak | Upload ulang | - |

---

## 💾 Struktur Data Dokumen

```json
{
  "id": "1768440000000",
  "jenisDokumen": "KTP",
  "nomorDokumen": null,
  "tanggalBerlaku": null,
  "keterangan": "KTP terbaru",
  "fileName": "ktp-1768440000000.jpg",
  "filePath": "uploads/profile-documents/5/ktp-1768440000000.jpg",
  "fileUrl": "/uploads/profile-documents/5/ktp-1768440000000.jpg",
  "status": "pending",
  "uploadedAt": "2024-01-15T10:30:00.000Z",
  "verifiedAt": null,
  "verifiedBy": null,
  "rejectionReason": null
}
```

---

## ✅ Validasi

### Upload KTP
```javascript
// Hanya file yang wajib
{
  jenisDokumen: "KTP",
  dokumen: <file>  // Required
}
```

### Upload Dokumen Lain
```javascript
// File + nomor + tanggal wajib
{
  jenisDokumen: "Buku Pelaut",
  dokumen: <file>,           // Required
  nomorDokumen: "BP-123456", // Required
  tanggalBerlaku: "2025-12-31" // Required
}
```

---

## 🎯 Contoh Implementasi Flutter

### Upload KTP
```dart
Future<void> uploadKTP(File file) async {
  final formData = FormData.fromMap({
    'dokumen': await MultipartFile.fromFile(file.path),
    'jenisDokumen': 'KTP',
  });

  final response = await dio.post(
    '/api/mobile/profile/documents',
    data: formData,
  );
}
```

### Upload Dokumen Lain
```dart
Future<void> uploadDocument({
  required File file,
  required String jenisDokumen,
  required String nomorDokumen,
  required String tanggalBerlaku,
}) async {
  final formData = FormData.fromMap({
    'dokumen': await MultipartFile.fromFile(file.path),
    'jenisDokumen': jenisDokumen,
    'nomorDokumen': nomorDokumen,
    'tanggalBerlaku': tanggalBerlaku,
  });

  final response = await dio.post(
    '/api/mobile/profile/documents',
    data: formData,
  );
}
```

---

## 🚀 Testing

### 1. Test Upload KTP (Mobile)
```bash
curl -X POST http://localhost:5000/api/mobile/profile/documents \
  -H "Authorization: Bearer <token>" \
  -F "dokumen=@ktp.jpg" \
  -F "jenisDokumen=KTP"
```

### 2. Test Upload Buku Pelaut (Mobile)
```bash
curl -X POST http://localhost:5000/api/mobile/profile/documents \
  -H "Authorization: Bearer <token>" \
  -F "dokumen=@buku-pelaut.pdf" \
  -F "jenisDokumen=Buku Pelaut" \
  -F "nomorDokumen=BP-123456" \
  -F "tanggalBerlaku=2025-12-31"
```

### 3. Test Approve (Admin)
```bash
curl -X PATCH http://localhost:5000/api/mobile/profile/admin/users/5/documents/1768440000000/approve \
  -H "Authorization: Bearer <admin-token>"
```

### 4. Test Reject (Admin)
```bash
curl -X PATCH http://localhost:5000/api/mobile/profile/admin/users/5/documents/1768440000000/reject \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Foto tidak jelas"}'
```

---

## 📊 Database Schema

```sql
-- Users table
CREATE TABLE Users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('admin', 'nahkoda', 'abk', 'nelayan'),
  dokumen JSON,  -- Array of documents
  ...
);

-- Struktur dokumen JSON
{
  "id": "timestamp",
  "jenisDokumen": "KTP|Buku Pelaut|...",
  "nomorDokumen": "string|null",
  "tanggalBerlaku": "date|null",
  "fileName": "string",
  "filePath": "string",
  "fileUrl": "string",
  "status": "pending|approved|rejected",
  "uploadedAt": "datetime",
  "verifiedAt": "datetime|null",
  "verifiedBy": "userId|null",
  "rejectionReason": "string|null"
}
```

---

## ✅ Checklist Implementasi

- [x] Backend: Upload dokumen dengan validasi berbeda untuk KTP
- [x] Backend: Status dokumen (pending/approved/rejected)
- [x] Backend: Admin endpoints untuk approve/reject
- [x] Backend: Get pending documents untuk admin
- [ ] Frontend Web: Halaman review dokumen untuk admin
- [ ] Frontend Web: Approve/reject dokumen
- [ ] Mobile: Upload dokumen dengan form berbeda untuk KTP
- [ ] Mobile: Lihat status dokumen
- [ ] Mobile: Notifikasi saat dokumen di-approve/reject

---

**Version:** 1.0  
**Last Updated:** 2024-01-15  
**Status:** ✅ Backend Ready, Frontend Pending
