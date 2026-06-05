# 🔧 Solusi: Gagal Create Project di Google AI Studio

## ❌ Error: "Failed to create project"

Jika Anda mendapat error ini, ada beberapa penyebab:
1. Google Cloud quota limit tercapai
2. Akun Google belum verified
3. Region restrictions
4. Temporary Google service issue

---

## ✅ Solusi Alternatif

### **Metode 1: Gunakan Existing Project**

1. Buka: https://makersuite.google.com/app/apikey
2. Pilih **"Create API key in existing project"**
3. Pilih project dari dropdown
4. Copy API Key

---

### **Metode 2: Create via Google Cloud Console**

#### Step 1: Create Project
```
https://console.cloud.google.com/projectcreate
```
- Project name: `e-logbook-ai`
- Project ID: (auto-generated atau custom)
- Klik "Create"

#### Step 2: Enable Gemini API
```
https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
```
- Pilih project yang baru
- Klik "Enable"
- Tunggu 1-2 menit

#### Step 3: Create API Key
```
https://console.cloud.google.com/apis/credentials
```
- Klik "Create Credentials"
- Pilih "API Key"
- Copy API Key (format: `AIzaSy...`)

#### Step 4: (Optional) Restrict API Key
Untuk keamanan, restrict API Key:
- Klik "Edit API Key"
- **API restrictions:**
  - Pilih "Restrict key"
  - Centang "Generative Language API"
- **Application restrictions:**
  - Pilih "Android apps"
  - Tambahkan package name: `com.example.e_logbook`
  - Tambahkan SHA-1 fingerprint
- Klik "Save"

---

### **Metode 3: Gunakan Akun Google Lain**

Jika akun Google Anda bermasalah:
1. Logout dari Google AI Studio
2. Login dengan akun Google lain
3. Coba create project lagi

---

### **Metode 4: Tunggu & Retry**

Kadang ini adalah temporary issue dari Google:
1. Tunggu 15-30 menit
2. Clear browser cache
3. Coba lagi

---

## 🔐 Update API Key di Aplikasi

Setelah dapat API Key baru:

1. **Edit file `.env`:**
```env
GEMINI_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-1.5-flash
```

2. **Restart aplikasi:**
```bash
# Stop aplikasi
# Clear cache (optional)
flutter clean
flutter pub get
# Run ulang
flutter run
```

---

## 🧪 Test API Key

Test API Key dengan curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=YOUR_API_KEY"
```

**Response OK:**
```json
{
  "name": "models/gemini-1.5-flash",
  "version": "001",
  "displayName": "Gemini 1.5 Flash"
}
```

**Response Error:**
```json
{
  "error": {
    "code": 400,
    "message": "API key not valid..."
  }
}
```

---

## 📞 Jika Masih Gagal

### Cek Status Google Services:
```
https://status.cloud.google.com/
```

### Contact Google Support:
```
https://support.google.com/googleapi/
```

### Alternatif: Gunakan API Key Tim
Jika untuk development, minta API Key dari:
- Team lead
- DevOps
- Admin project

---

## ⚠️ Catatan Penting

1. **Jangan share API Key** di public repository
2. **Rotate API Key** secara berkala
3. **Monitor usage** di Google Cloud Console
4. **Set quota limits** untuk mencegah abuse
5. **Enable billing alerts** jika pakai paid tier

---

## 🎯 Checklist

- [ ] Coba metode 1: Existing project
- [ ] Coba metode 2: Google Cloud Console
- [ ] Coba metode 3: Akun Google lain
- [ ] API Key berhasil di-generate
- [ ] API Key sudah di-test dengan curl
- [ ] File `.env` sudah diupdate
- [ ] Aplikasi sudah di-restart
- [ ] AI detection berhasil

---

**Last Updated:** 2024
