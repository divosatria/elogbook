# 🚀 API QUICK REFERENCE - E-LOGBOOK MOBILE

## 📋 ENDPOINT CHEAT SHEET

### 🔐 AUTH
```
POST   /api/mobile/login                    Login mobile
GET    /api/mobile/profile                  Get profile
PUT    /api/mobile/profile                  Update profile
```

### 👤 PROFILE DOCUMENTS (Dokumen User)
```
POST   /api/mobile/profile/documents        Upload dokumen profile
GET    /api/mobile/profile/documents        List dokumen profile
DELETE /api/mobile/profile/documents/:id    Hapus dokumen profile
```

### 🚢 VESSEL DOCUMENTS (Dokumen Kapal)
```
POST   /api/mobile/vessel/:id/sertifikat-jalan    Upload sertifikat kapal
POST   /api/mobile/vessel/:id/bahan-bakar         Upload data BBM
GET    /api/mobile/vessel/:id/documents           List dokumen kapal
GET    /api/mobile/vessel/:id/fuel-summary        Ringkasan BBM
```

### 📊 DATA
```
GET    /api/mobile/dashboard                Get dashboard
GET    /api/mobile/trip-tasks               Get tasks (nahkoda)
PATCH  /api/mobile/trip-tasks/:id/complete  Complete task
```

### 📍 TRACKING
```
POST   /api/mobile/location                 Update GPS
POST   /api/mobile/sos                      Emergency SOS
```

---

## 🎯 PERBEDAAN UTAMA

### Profile Documents vs Vessel Documents

| | Profile Documents | Vessel Documents |
|---|---|---|
| **Endpoint** | `/profile/documents` | `/vessel/:id/...` |
| **Milik** | User (nahkoda/abk) | Kapal |
| **Contoh** | KTP, Buku Pelaut, BST | Sertifikat Jalan, BBM |
| **Folder** | `profile-documents/{userId}/` | `sertifikat/{kapalId}/` |

---

## 📝 REQUEST BODY EXAMPLES

### Upload Profile Document
```json
{
  "jenisDokumen": "KTP",
  "nomorDokumen": "3201234567890123",
  "tanggalBerlaku": "2030-12-31",
  "keterangan": "KTP Asli"
}
+ file: dokumen (multipart)
```

### Upload Vessel Certificate
```json
{
  "nama": "Sertifikat Jalan 2024",
  "nomorSertifikat": "SJ-001-2024",
  "tanggalBerlaku": "2025-12-31"
}
+ file: sertifikat (multipart)
```

### Upload Fuel Data
```json
{
  "jenisBahanBakar": "Solar",
  "jumlahLiter": 500,
  "hargaPerLiter": 6500,
  "totalHarga": 3250000,
  "tanggalPengisian": "2024-01-15T08:00:00Z",
  "lokasiPengisian": "SPBU Pelabuhan",
  "keterangan": "Pengisian rutin"
}
+ file: bukti (multipart, optional)
```

---

## 🔑 FIELD NAMING

### Konsisten camelCase:
- ✅ `jenisDokumen` (bukan jenis_dokumen)
- ✅ `nomorDokumen` (bukan nomor_dokumen)
- ✅ `tanggalBerlaku` (bukan tanggal_berlaku)
- ✅ `uploadedAt` (bukan uploaded_at)

### URL kebab-case:
- ✅ `sertifikat-jalan` (bukan sertifikatJalan)
- ✅ `bahan-bakar` (bukan bahanBakar)
- ✅ `trip-tasks` (bukan tripTasks)

---

## 📱 FLUTTER QUICK CODE

### Upload Profile Document
```dart
await dio.post(
  '${ApiConfig.mobileUrl}/profile/documents',
  data: FormData.fromMap({
    'dokumen': await MultipartFile.fromFile(file.path),
    'jenisDokumen': 'KTP',
    'nomorDokumen': '3201234567890123',
    'tanggalBerlaku': '2030-12-31',
  }),
);
```

### Upload Vessel Certificate
```dart
await dio.post(
  '${ApiConfig.mobileUrl}/vessel/$kapalId/sertifikat-jalan',
  data: FormData.fromMap({
    'sertifikat': await MultipartFile.fromFile(file.path),
    'nama': 'Sertifikat Jalan 2024',
    'nomorSertifikat': 'SJ-001-2024',
    'tanggalBerlaku': '2025-12-31',
  }),
);
```

---

## ✅ RESPONSE FORMAT

### Success
```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...]
}
```

---

## 🔐 AUTHENTICATION

Semua endpoint (kecuali login) butuh header:
```
Authorization: Bearer <token>
```

---

## 📚 DOKUMENTASI LENGKAP

- **API_NAMING_CONVENTION.md** - Standar penamaan
- **MOBILE_DEVELOPER_GUIDE.md** - Panduan lengkap
- **PROFILE_DOCUMENTS_GUIDE.md** - Panduan dokumen profile
- **USER_FLOW_COMPLETE.md** - Alur lengkap
- **Swagger UI** - http://localhost:5000/api-docs

---

**Version**: 2.1.0
**Print & Keep This!** 📌
