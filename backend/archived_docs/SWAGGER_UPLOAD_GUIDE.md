# 📝 Cara Test Upload Dokumen di Swagger UI

## 🎯 Langkah-langkah Upload Dokumen

### 1️⃣ **Login Dulu**

#### Login Mobile User (Nahkoda/ABK):
```
POST /api/mobile/login

Body:
{
  "email": "nahkoda@example.com",
  "password": "password123"
}
```

**Copy token dari response!**

#### Authorize di Swagger:
1. Klik tombol **🔒 Authorize** di kanan atas
2. Paste token: `Bearer <your_token_here>`
3. Klik **Authorize**
4. Klik **Close**

---

### 2️⃣ **Upload KTP (Tanpa Nomor & Tanggal)**

```
POST /api/mobile/profile/documents
```

**Cara Isi Form:**

1. **dokumen**: 
   - ❌ JANGAN isi dengan text "string"
   - ✅ Klik tombol **"Choose File"**
   - ✅ Pilih file KTP (JPG/PNG/PDF)

2. **jenisDokumen**: 
   ```
   KTP
   ```

3. **nomorDokumen**: 
   - ❌ KOSONGKAN (hapus field ini)
   - Atau biarkan kosong

4. **tanggalBerlaku**: 
   - ❌ KOSONGKAN (hapus field ini)
   - Atau biarkan kosong

5. **keterangan** (opsional):
   ```
   KTP terbaru
   ```

**Klik Execute!**

---

### 3️⃣ **Upload Buku Pelaut (Dengan Nomor & Tanggal)**

```
POST /api/mobile/profile/documents
```

**Cara Isi Form:**

1. **dokumen**: 
   - ✅ Klik **"Choose File"**
   - ✅ Pilih file Buku Pelaut (PDF/JPG/PNG)

2. **jenisDokumen**: 
   ```
   Buku Pelaut
   ```

3. **nomorDokumen**: 
   ```
   BP-123456
   ```

4. **tanggalBerlaku**: 
   ```
   2030-12-31
   ```

5. **keterangan** (opsional):
   ```
   Buku pelaut aktif
   ```

**Klik Execute!**

---

### 4️⃣ **Upload Sertifikat Nahkoda**

```
POST /api/mobile/profile/documents
```

1. **dokumen**: Choose file
2. **jenisDokumen**: `Sertifikat Nahkoda`
3. **nomorDokumen**: `SN-789012`
4. **tanggalBerlaku**: `2028-06-30`
5. **keterangan**: `Sertifikat aktif`

---

### 5️⃣ **Lihat Dokumen yang Sudah Diupload**

```
GET /api/mobile/profile/documents
```

Klik **Execute** (tidak perlu isi apa-apa)

**Response akan menunjukkan:**
- ✅ Semua dokumen yang sudah diupload
- ✅ Status: `pending` / `approved` / `rejected`
- ✅ File URL untuk download

---

## 🔧 **Troubleshooting**

### ❌ Error: "File dokumen wajib diupload"

**Penyebab:** Anda mengisi field `dokumen` dengan text "string"

**Solusi:**
1. Hapus text "string" dari field dokumen
2. Klik tombol **"Choose File"** 
3. Pilih file dari komputer Anda

---

### ❌ Error: "Nomor dokumen wajib diisi untuk dokumen selain KTP"

**Penyebab:** Upload dokumen selain KTP tanpa nomor dokumen

**Solusi:**
- Untuk **KTP**: Kosongkan `nomorDokumen` dan `tanggalBerlaku`
- Untuk **dokumen lain**: Isi `nomorDokumen` dan `tanggalBerlaku`

---

### ❌ Error: "Format tanggal tidak valid"

**Penyebab:** Format tanggal salah

**Solusi:** Gunakan format `YYYY-MM-DD`
- ✅ Benar: `2030-12-31`
- ❌ Salah: `31/12/2030`
- ❌ Salah: `31-12-2030`

---

## 📊 **Tabel Jenis Dokumen**

| Jenis Dokumen | Nomor Dokumen | Tanggal Berlaku | Contoh Nomor |
|---------------|---------------|-----------------|--------------|
| **KTP** | ❌ Tidak perlu | ❌ Tidak perlu | - |
| Buku Pelaut | ✅ Wajib | ✅ Wajib | BP-123456 |
| Sertifikat Nahkoda | ✅ Wajib | ✅ Wajib | SN-789012 |
| BST | ✅ Wajib | ✅ Wajib | BST-345678 |
| Surat Keterangan Sehat | ✅ Wajib | ✅ Wajib | SKS-901234 |
| SKCK | ✅ Wajib | ✅ Wajib | SKCK-567890 |
| Pas Foto | ❌ Tidak perlu | ❌ Tidak perlu | - |
| NPWP | ✅ Wajib | ❌ Tidak perlu | 12.345.678.9-012.000 |

---

## 🎯 **Contoh Request yang Benar**

### Upload KTP (cURL):
```bash
curl -X POST "http://localhost:5000/api/mobile/profile/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "dokumen=@/path/to/ktp.jpg" \
  -F "jenisDokumen=KTP" \
  -F "keterangan=KTP terbaru"
```

### Upload Buku Pelaut (cURL):
```bash
curl -X POST "http://localhost:5000/api/mobile/profile/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "dokumen=@/path/to/buku-pelaut.pdf" \
  -F "jenisDokumen=Buku Pelaut" \
  -F "nomorDokumen=BP-123456" \
  -F "tanggalBerlaku=2030-12-31" \
  -F "keterangan=Buku pelaut aktif"
```

---

## ✅ **Response Sukses**

```json
{
  "success": true,
  "message": "Dokumen berhasil diupload dan menunggu verifikasi admin",
  "data": {
    "id": "1768440000000",
    "jenisDokumen": "KTP",
    "nomorDokumen": null,
    "tanggalBerlaku": null,
    "keterangan": "KTP terbaru",
    "fileName": "ktp-1768440000000.jpg",
    "fileUrl": "/uploads/profile-documents/5/ktp-1768440000000.jpg",
    "status": "pending",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "verifiedAt": null,
    "verifiedBy": null,
    "rejectionReason": null
  }
}
```

---

## 🔐 **Admin: Approve/Reject Dokumen**

### 1. Login sebagai Admin:
```
POST /api/auth/login

{
  "username": "admin",
  "password": "admin123"
}
```

### 2. Lihat Pending Documents:
```
GET /api/mobile/profile/admin/pending-documents
```

### 3. Approve Dokumen:
```
PATCH /api/mobile/profile/admin/users/{userId}/documents/{documentId}/approve
```

### 4. Reject Dokumen:
```
PATCH /api/mobile/profile/admin/users/{userId}/documents/{documentId}/reject

Body:
{
  "reason": "Foto tidak jelas, mohon upload ulang"
}
```

---

## 📸 **Screenshot Panduan**

### Cara Upload File di Swagger:

1. **Jangan isi manual dengan text:**
   ```
   ❌ dokumen: "string"  <-- SALAH!
   ```

2. **Klik tombol "Choose File":**
   ```
   ✅ dokumen: [Choose File] <-- BENAR!
   ```

3. **Pilih file dari komputer Anda**

4. **Isi field lainnya sesuai jenis dokumen**

5. **Klik Execute**

---

**Happy Testing! 🚀**
