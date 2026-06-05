# ✅ SWAGGER DOCUMENTATION - COMPLETE

## 🌐 Akses Swagger UI

```
http://192.168.1.21:5000/api-docs
```

atau jika dari localhost:
```
http://localhost:5000/api-docs
```

---

## 📋 ENDPOINT YANG TERDOKUMENTASI

### ✅ Mobile - Profile (User Documents)
- `POST   /api/mobile/profile/documents` - Upload dokumen profile
- `GET    /api/mobile/profile/documents` - List dokumen profile
- `DELETE /api/mobile/profile/documents/{id}` - Hapus dokumen

**Jenis Dokumen:**
- KTP
- Buku Pelaut
- Sertifikat Nahkoda
- BST
- Surat Keterangan Sehat
- SKCK
- Pas Foto
- NPWP

### ✅ Mobile - Vessel (Kapal Documents)
- `POST /api/mobile/vessel/{kapalId}/sertifikat-jalan` - Upload sertifikat
- `POST /api/mobile/vessel/{kapalId}/bahan-bakar` - Upload data BBM
- `GET  /api/mobile/vessel/{kapalId}/documents` - List dokumen kapal
- `GET  /api/mobile/vessel/{kapalId}/fuel-summary` - Ringkasan BBM

### ✅ Mobile - General
- `POST  /api/mobile/login` - Login mobile
- `GET   /api/mobile/dashboard` - Dashboard data
- `GET   /api/mobile/profile` - Get profile
- `POST  /api/mobile/location` - Update GPS
- `POST  /api/mobile/sos` - Emergency SOS

### ✅ Authentication
- `POST /api/auth/login` - Web login

### ✅ Users (Admin)
- `GET  /api/users` - List users
- `POST /api/users` - Create user

### ✅ Vessels (Admin)
- `GET    /api/kapal` - List vessels
- `POST   /api/kapal` - Create vessel
- `GET    /api/kapal/{id}` - Get vessel
- `PUT    /api/kapal/{id}` - Update vessel
- `DELETE /api/kapal/{id}` - Delete vessel

### ✅ Trips
- `GET  /api/trip` - List trips
- `POST /api/trip` - Create trip

---

## 🎯 FITUR SWAGGER UI

### 1. Interactive Testing
- ✅ Try it out button
- ✅ Execute request langsung
- ✅ Lihat response real-time

### 2. Authentication
- ✅ Authorize button
- ✅ Input JWT token
- ✅ Auto-include di semua request

### 3. Documentation
- ✅ Request body schema
- ✅ Response examples
- ✅ Parameter descriptions
- ✅ Validation rules

### 4. Grouping
- ✅ Mobile - Profile (dokumen user)
- ✅ Mobile - Vessel (dokumen kapal)
- ✅ Mobile (general)
- ✅ Authentication
- ✅ Users
- ✅ Vessels
- ✅ Trips

---

## 📝 CONTOH PENGGUNAAN

### 1. Login
1. Buka Swagger UI
2. Expand `Mobile` → `POST /api/mobile/login`
3. Click **Try it out**
4. Input:
```json
{
  "email": "nahkoda@example.com",
  "password": "password123"
}
```
5. Click **Execute**
6. Copy token dari response

### 2. Authorize
1. Click **Authorize** 🔒 (pojok kanan atas)
2. Input: `Bearer <paste_token_here>`
3. Click **Authorize**
4. Click **Close**

### 3. Upload Profile Document
1. Expand `Mobile - Profile` → `POST /api/mobile/profile/documents`
2. Click **Try it out**
3. Upload file
4. Fill form:
   - jenisDokumen: `KTP`
   - nomorDokumen: `3201234567890123`
   - tanggalBerlaku: `2030-12-31`
5. Click **Execute**

### 4. Upload Vessel Certificate
1. Expand `Mobile - Vessel` → `POST /api/mobile/vessel/{kapalId}/sertifikat-jalan`
2. Click **Try it out**
3. Input kapalId: `1`
4. Upload file
5. Fill form
6. Click **Execute**

---

## ✅ VALIDASI SWAGGER

### Request Body Validation
- ✅ Required fields marked
- ✅ Data types specified
- ✅ Enum values listed
- ✅ Min/max values shown
- ✅ Format examples provided

### Response Schema
- ✅ Success response structure
- ✅ Error response structure
- ✅ Field descriptions
- ✅ Example values

### Parameters
- ✅ Path parameters
- ✅ Query parameters
- ✅ Header parameters
- ✅ Required/optional marked

---

## 🔍 PERBEDAAN JELAS DI SWAGGER

### Mobile - Profile vs Mobile - Vessel

**Mobile - Profile** (Tag hijau):
- `/api/mobile/profile/documents`
- Dokumen personal user
- KTP, Buku Pelaut, BST, dll

**Mobile - Vessel** (Tag biru):
- `/api/mobile/vessel/{kapalId}/...`
- Dokumen kapal
- Sertifikat Jalan, Bahan Bakar

---

## 📊 SWAGGER FEATURES

### ✅ Yang Sudah Ada:
- [x] Semua endpoint mobile terdokumentasi
- [x] Request/response examples
- [x] Authentication support
- [x] File upload support
- [x] Validation rules
- [x] Error responses
- [x] Grouping by tags
- [x] Interactive testing

### ✅ Best Practices:
- [x] OpenAPI 3.0.3 standard
- [x] Consistent naming
- [x] Clear descriptions
- [x] Example values
- [x] Enum definitions
- [x] Required fields marked

---

## 🎯 KESIMPULAN

**Swagger Documentation sudah LENGKAP dan PROFESIONAL:**

✅ **Semua endpoint** terdokumentasi
✅ **Profile Documents** ada (KTP, Buku Pelaut, dll)
✅ **Vessel Documents** ada (Sertifikat, BBM)
✅ **Interactive** - bisa test langsung
✅ **Jelas** - tidak ada ambiguitas
✅ **Konsisten** - naming convention benar
✅ **Lengkap** - request/response examples

**Mobile developer bisa langsung pakai Swagger UI untuk test & development!** 🎉

---

## 📚 Resources

- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs.json
- **Swagger YAML**: `backend/swagger.yaml`

---

**Version**: 2.1.0
**Last Updated**: 2024
**Status**: ✅ PRODUCTION READY
