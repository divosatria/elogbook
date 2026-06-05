# 🔑 Cara Generate API Key Gemini Baru

## ⚠️ PENTING: API Key Lama Sudah Di-Suspend!

API Key yang lama (`AIzaSyDfHiIzJ2ERhutHtnQR8tS6_Zq0x0_NLTY`) telah di-suspend oleh Google.

Error yang muncul:
```
"Permission denied: Consumer 'api_key:...' has been suspended."
"reason": "CONSUMER_SUSPENDED"
```

## 📝 Langkah-Langkah Generate API Key Baru:

### 1. Buka Google AI Studio
Kunjungi: **https://makersuite.google.com/app/apikey**

### 2. Login dengan Google Account
- Gunakan akun Google yang aktif
- Pastikan akun tidak di-suspend

### 3. Create API Key
- Klik tombol **"Create API Key"**
- Pilih **"Create API key in new project"** atau pilih project yang sudah ada
- Tunggu beberapa detik

### 4. Copy API Key
- API Key akan muncul (format: `AIzaSy...`)
- Klik **"Copy"** untuk menyalin
- **JANGAN SHARE** API Key ke publik!

### 5. Paste ke File `.env`
Edit file `.env` di root project:
```env
GEMINI_API_KEY=AIzaSy_YOUR_NEW_API_KEY_HERE
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-1.5-flash
```

### 6. Restart Aplikasi
- **Stop** aplikasi sepenuhnya
- **Clear cache** (optional tapi recommended)
- **Run** aplikasi lagi

---

## 🔒 Keamanan API Key

### ✅ DO:
- Simpan API Key di file `.env` (sudah di `.gitignore`)
- Gunakan environment variables
- Rotate API Key secara berkala
- Monitor usage di Google Cloud Console

### ❌ DON'T:
- Commit API Key ke Git/GitHub
- Share API Key di chat/email
- Hardcode API Key di source code
- Gunakan API Key di client-side tanpa proteksi

---

## 📊 Monitoring Usage

### Cek Quota & Usage:
1. Buka: https://console.cloud.google.com/
2. Pilih project yang digunakan
3. Menu: **APIs & Services** → **Dashboard**
4. Lihat **Gemini API** usage

### Free Tier Limits:
- **15 requests per minute (RPM)**
- **1 million tokens per day**
- **1,500 requests per day**

Jika melebihi limit, akan muncul error `429 (Quota Exceeded)`.

---

## 🆘 Troubleshooting

### API Key Tidak Bekerja?

**1. Cek Status API Key:**
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
    "code": 403,
    "message": "API key not valid..."
  }
}
```

**2. Enable Gemini API:**
- Buka: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
- Klik **"Enable"**
- Tunggu beberapa menit

**3. Cek Billing (Jika Pakai Paid Tier):**
- Buka: https://console.cloud.google.com/billing
- Pastikan billing account aktif
- Cek apakah ada payment method

---

## 💡 Tips

### Untuk Development:
- Gunakan **gemini-1.5-flash** (cepat & murah)
- Set timeout 60 detik
- Implement retry logic

### Untuk Production:
- Gunakan **gemini-1.5-pro** (lebih akurat)
- Implement rate limiting
- Monitor usage & costs
- Setup alerts untuk quota

### Untuk Testing:
- Gunakan API Key terpisah untuk dev/prod
- Jangan test dengan production API Key
- Implement mock responses untuk unit tests

---

## 📞 Support

Jika masih ada masalah:

1. **Cek Google AI Studio Status:**
   https://status.cloud.google.com/

2. **Baca Documentation:**
   https://ai.google.dev/docs

3. **Community Forum:**
   https://discuss.ai.google.dev/

4. **Contact Support:**
   https://support.google.com/

---

## ✅ Checklist Setelah Generate API Key Baru:

- [ ] API Key baru sudah di-copy
- [ ] File `.env` sudah diupdate
- [ ] Model sudah benar (`gemini-1.5-flash`)
- [ ] Aplikasi sudah di-restart
- [ ] Test AI detection berhasil
- [ ] API Key lama sudah dihapus/disabled

---

**Last Updated:** 2024
**Version:** 1.0
