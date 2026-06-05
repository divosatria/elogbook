# 📚 API NAMING CONVENTION & ENDPOINT REFERENCE

## ✅ STANDARDISASI PENAMAAN

### 🎯 Prinsip Penamaan:
1. **Konsisten** - Semua endpoint menggunakan pola yang sama
2. **RESTful** - Mengikuti standar REST API
3. **Jelas** - Nama endpoint menjelaskan fungsinya
4. **Bahasa** - Konsisten antara Bahasa Indonesia dan Inggris

---

## 📋 DAFTAR ENDPOINT LENGKAP

### 🔐 AUTHENTICATION
```
POST   /api/mobile/login              - Login mobile (nahkoda/abk)
GET    /api/mobile/profile            - Get user profile
PUT    /api/mobile/profile            - Update user profile
```

### 👤 PROFILE DOCUMENTS (User Documents)
```
POST   /api/mobile/profile/documents           - Upload dokumen profile
GET    /api/mobile/profile/documents           - Get all profile documents
DELETE /api/mobile/profile/documents/:id       - Delete profile document
```

**Dokumen Profile:**
- KTP
- Buku Pelaut
- Sertifikat Nahkoda
- BST
- Surat Keterangan Sehat
- SKCK
- Pas Foto
- NPWP

### 🚢 VESSEL DOCUMENTS (Kapal Documents)
```
POST   /api/mobile/vessel/:kapalId/sertifikat-jalan    - Upload sertifikat kapal
POST   /api/mobile/vessel/:kapalId/bahan-bakar         - Upload data bahan bakar
GET    /api/mobile/vessel/:kapalId/documents           - Get all vessel documents
GET    /api/mobile/vessel/:kapalId/fuel-summary        - Get fuel summary
```

**Dokumen Kapal:**
- Sertifikat Jalan
- Data Bahan Bakar

### 📊 DASHBOARD & DATA
```
GET    /api/mobile/dashboard          - Get dashboard data
GET    /api/mobile/trip-tasks         - Get trip tasks (nahkoda only)
PATCH  /api/mobile/trip-tasks/:id/complete  - Complete trip task
```

### 📍 LOCATION & TRACKING
```
POST   /api/mobile/location           - Update GPS location
```

### 🆘 EMERGENCY
```
POST   /api/mobile/sos                - Send emergency alert
```

---

## 🔍 PERBEDAAN PENTING

### ❌ YANG SALAH (Tidak Konsisten):
```
POST /api/mobile/uploadDocument        ❌ Tidak jelas dokumen apa
POST /api/mobile/documents             ❌ Ambigu (profile atau vessel?)
POST /api/mobile/vessel/certificate    ❌ Bahasa campur
GET  /api/mobile/getDokumen            ❌ Tidak RESTful
```

### ✅ YANG BENAR (Konsisten & Jelas):
```
POST /api/mobile/profile/documents              ✅ Jelas: dokumen profile user
POST /api/mobile/vessel/:kapalId/sertifikat-jalan  ✅ Jelas: sertifikat kapal
GET  /api/mobile/profile/documents              ✅ RESTful: GET untuk ambil data
DELETE /api/mobile/profile/documents/:id        ✅ RESTful: DELETE untuk hapus
```

---

## 📊 STRUKTUR ENDPOINT

### Pattern 1: Resource-based (RESTful)
```
/api/mobile/{resource}
/api/mobile/{resource}/{id}
/api/mobile/{resource}/{id}/{action}
```

**Contoh:**
```
GET    /api/mobile/profile              - Get profile
PUT    /api/mobile/profile              - Update profile
POST   /api/mobile/profile/documents    - Create document
GET    /api/mobile/profile/documents    - List documents
DELETE /api/mobile/profile/documents/:id - Delete document
```

### Pattern 2: Nested Resource
```
/api/mobile/{parent}/{parentId}/{child}
```

**Contoh:**
```
POST /api/mobile/vessel/:kapalId/sertifikat-jalan
POST /api/mobile/vessel/:kapalId/bahan-bakar
GET  /api/mobile/vessel/:kapalId/documents
```

---

## 🎯 NAMING RULES

### 1. URL Path
- ✅ Gunakan **lowercase**
- ✅ Gunakan **kebab-case** untuk multi-word: `sertifikat-jalan`
- ✅ Gunakan **plural** untuk collections: `documents`, `tasks`
- ✅ Gunakan **singular** untuk single resource: `profile`, `dashboard`

### 2. Request Body (JSON)
- ✅ Gunakan **camelCase**: `jenisDokumen`, `nomorDokumen`
- ✅ Konsisten dengan response format
- ✅ Nama field jelas dan deskriptif

### 3. Response Body (JSON)
- ✅ Gunakan **camelCase**: `tanggalBerlaku`, `uploadedAt`
- ✅ Selalu ada field `success` (boolean)
- ✅ Selalu ada field `message` (string)
- ✅ Data dalam field `data` (object/array)

---

## 📝 CONTOH LENGKAP

### Upload Profile Document
```http
POST /api/mobile/profile/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

dokumen: [FILE]
jenisDokumen: "KTP"
nomorDokumen: "3201234567890123"
tanggalBerlaku: "2030-12-31"
keterangan: "KTP Asli"
```

**Response:**
```json
{
  "success": true,
  "message": "Dokumen berhasil diupload",
  "data": {
    "id": "1234567890",
    "jenisDokumen": "KTP",
    "nomorDokumen": "3201234567890123",
    "tanggalBerlaku": "2030-12-31T00:00:00.000Z",
    "fileUrl": "/uploads/profile-documents/1/1234567890-abc123.jpg",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Upload Vessel Certificate
```http
POST /api/mobile/vessel/1/sertifikat-jalan
Authorization: Bearer <token>
Content-Type: multipart/form-data

sertifikat: [FILE]
nama: "Sertifikat Jalan 2024"
nomorSertifikat: "SJ-001-2024"
tanggalBerlaku: "2025-12-31"
```

**Response:**
```json
{
  "success": true,
  "message": "Sertifikat jalan berhasil diupload",
  "data": {
    "id": "1234567890",
    "nama": "Sertifikat Jalan 2024",
    "nomorSertifikat": "SJ-001-2024",
    "tanggalBerlaku": "2025-12-31T00:00:00.000Z",
    "fileUrl": "/uploads/sertifikat/1/1234567890-abc123.pdf",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🔑 KEY DIFFERENCES

### Profile Documents vs Vessel Documents

| Aspect | Profile Documents | Vessel Documents |
|--------|------------------|------------------|
| **Endpoint** | `/api/mobile/profile/documents` | `/api/mobile/vessel/:kapalId/sertifikat-jalan` |
| **Belongs to** | User (nahkoda/abk) | Kapal (vessel) |
| **Examples** | KTP, Buku Pelaut, BST | Sertifikat Jalan, Bahan Bakar |
| **Stored in** | User.dokumen (JSON) | Kapal.sertifikatJalan (JSON) |
| **Upload folder** | `uploads/profile-documents/{userId}/` | `uploads/sertifikat/{kapalId}/` |

---

## 📱 FLUTTER NAMING

### Service Classes
```dart
class AuthService {
  Future<LoginResponse> login(String email, String password);
  Future<User> getProfile();
  Future<User> updateProfile(ProfileUpdateRequest request);
}

class ProfileDocumentService {
  Future<void> uploadDocument(UploadDocumentRequest request);
  Future<List<Document>> getDocuments();
  Future<void> deleteDocument(String documentId);
}

class VesselDocumentService {
  Future<void> uploadSertifikatJalan(int kapalId, UploadSertifikatRequest request);
  Future<void> uploadBahanBakar(int kapalId, UploadBahanBakarRequest request);
  Future<VesselDocuments> getVesselDocuments(int kapalId);
  Future<FuelSummary> getFuelSummary(int kapalId, {DateTime? startDate, DateTime? endDate});
}
```

### Model Classes
```dart
// Profile Document
class ProfileDocument {
  final String id;
  final String jenisDokumen;
  final String nomorDokumen;
  final DateTime? tanggalBerlaku;
  final String fileUrl;
  final DateTime uploadedAt;
}

// Vessel Certificate
class VesselCertificate {
  final String id;
  final String nama;
  final String nomorSertifikat;
  final DateTime tanggalBerlaku;
  final String fileUrl;
  final DateTime uploadedAt;
}

// Fuel Data
class FuelData {
  final String id;
  final String jenisBahanBakar;
  final double jumlahLiter;
  final double hargaPerLiter;
  final double totalHarga;
  final DateTime tanggalPengisian;
  final String? buktiFileUrl;
}
```

---

## ✅ CHECKLIST KONSISTENSI

### Endpoint Naming
- [x] Semua endpoint lowercase
- [x] Multi-word menggunakan kebab-case
- [x] RESTful verbs (GET, POST, PUT, DELETE)
- [x] Nested resources jelas parent-child
- [x] Tidak ada verb di URL (kecuali action spesifik)

### Request/Response Format
- [x] camelCase untuk field names
- [x] Konsisten success/message/data structure
- [x] ISO8601 untuk dates
- [x] Bahasa Indonesia untuk messages
- [x] File paths tidak exposed

### Documentation
- [x] Setiap endpoint ada contoh request
- [x] Setiap endpoint ada contoh response
- [x] Setiap endpoint ada Flutter code example
- [x] Validation rules jelas
- [x] Error responses documented

---

## 🎯 KESIMPULAN

**Penamaan sudah KONSISTEN dan PROFESIONAL:**

✅ **Endpoint Structure** - RESTful & jelas
✅ **Naming Convention** - Konsisten kebab-case & camelCase
✅ **Documentation** - Lengkap dengan contoh
✅ **Separation of Concerns** - Profile vs Vessel documents jelas
✅ **Flutter Integration** - Service & model classes terstruktur

**Tidak ada ambiguitas, developer bisa langsung paham!** 🎉

---

**Version**: 2.1.0
**Last Updated**: 2024
**Status**: ✅ PRODUCTION READY
