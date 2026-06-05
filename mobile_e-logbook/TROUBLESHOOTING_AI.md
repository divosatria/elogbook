# 🔧 Troubleshooting AI Detection

## ❌ Masalah Umum & Solusi

### 1. **"API Key invalid atau tidak memiliki akses"**
**Penyebab:**
- API Key Gemini salah atau expired
- API Key tidak memiliki akses ke Gemini API

**Solusi:**
1. Cek file `.env` pastikan `GEMINI_API_KEY` benar
2. Verifikasi API Key di [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Pastikan API Key memiliki akses ke Gemini API
4. Generate API Key baru jika perlu

---

### 2. **"Quota API habis atau terlalu banyak request"**
**Penyebab:**
- Free tier Gemini API memiliki limit request per menit/hari
- Terlalu banyak user menggunakan AI detection bersamaan

**Solusi:**
1. Tunggu beberapa menit sebelum retry
2. Upgrade ke paid tier jika perlu
3. Implementasi rate limiting di aplikasi

---

### 3. **"Model tidak ditemukan"**
**Penyebab:**
- Model name salah di `.env` (contoh: `gemini-2.5-flash` yang tidak ada)

**Solusi:**
1. Edit file `.env`
2. Gunakan model yang valid:
   - `gemini-1.5-flash` (recommended - cepat & efisien)
   - `gemini-1.5-pro` (lebih akurat tapi lambat)
3. Restart aplikasi

---

### 4. **"Koneksi timeout"**
**Penyebab:**
- Koneksi internet lambat
- Ukuran foto terlalu besar
- Server Gemini API lambat

**Solusi:**
1. Periksa koneksi internet
2. Foto sudah dioptimasi (max 1920x1920, quality 85%)
3. Coba lagi dengan koneksi lebih stabil

---

### 5. **"Tidak ada koneksi internet"**
**Penyebab:**
- Device tidak terhubung ke internet
- Firewall memblokir akses ke Google API

**Solusi:**
1. Aktifkan WiFi atau data seluler
2. Cek firewall/proxy settings
3. Test koneksi dengan browser

---

## ✅ Cara Verifikasi Setup

### 1. Cek File `.env`
```env
GEMINI_API_KEY=AIzaSy...  # Harus ada dan valid
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-1.5-flash  # Harus model yang valid
```

### 2. Cek Log Startup
Saat aplikasi start, harus muncul:
```
✅ Gemini API Key: AIzaSyDfHi...
✅ Gemini Model: gemini-1.5-flash
✅ Gemini Base URL: https://generativelanguage.googleapis.com/v1beta
```

### 3. Test Manual
Buka browser dan test API:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY
```

---

## 📊 Monitoring

### Log yang Harus Muncul Saat AI Detection:
```
🔍 ========== GEMINI AI DETECTION START ==========
📁 Image path: /path/to/image.jpg
📦 Image size: 1.2MB
🔐 Base64 size: 1600KB
📝 Prompt length: 5000 chars
⚙️ Generation config: temp=0.4, topK=32, topP=0.8
🌐 API URL: https://...
📤 Sending request to Gemini API...
📥 Response status: 200
✅ API Response OK
📝 AI Response length: 500 chars
✅ JSON parsed successfully
🐟 Detected fish: Ikan Kembung
⚖️ Raw weight: 0.5kg, Length: 15cm, Qty: 3
✅ Normalized unit weight: 0.15kg
✅ Total weight: 0.45kg
========== GEMINI AI DETECTION SUCCESS ==========
```

### Log Error yang Mungkin Muncul:
```
❌ Server Error 400  # Bad request
❌ Server Error 403  # API Key invalid
❌ Server Error 429  # Quota exceeded
❌ Server Error 404  # Model not found
```

---

## 🆘 Jika Masih Gagal

1. **Restart aplikasi** setelah edit `.env`
2. **Clear cache** aplikasi
3. **Reinstall** aplikasi
4. **Hubungi admin** dengan screenshot error log
5. **Gunakan mode manual** untuk input data tangkapan

---

## 📞 Support

Jika masalah berlanjut, kirim log error ke tim developer dengan format:
```
Device: [Android/iOS]
Error: [Copy paste error message]
Log: [Copy paste dari debug console]
Screenshot: [Attach screenshot]
```
