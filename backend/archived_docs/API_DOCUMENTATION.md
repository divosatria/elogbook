# 📚 API DOCUMENTATION

## 🌐 Akses Dokumentasi API

### **Swagger UI (Interactive Documentation)** ⭐ RECOMMENDED

Buka browser dan akses:

```
http://192.168.1.21:5000/api-docs
```

atau jika dari localhost:

```
http://localhost:5000/api-docs
```

### ✨ Keunggulan Swagger UI:

✅ **Interactive** - Bisa langsung test API dari browser
✅ **Complete** - Semua endpoint terdokumentasi lengkap
✅ **Try it out** - Test request & response langsung
✅ **Schema** - Lihat struktur data request/response
✅ **Authentication** - Test dengan JWT token
✅ **Examples** - Contoh request & response

---

## 🚀 Cara Menggunakan Swagger UI

### 1. Buka Swagger UI
```
http://localhost:5000/api-docs
```

### 2. Login untuk Dapat Token
- Klik endpoint **POST /api/mobile/login**
- Klik tombol **"Try it out"**
- Isi request body:
```json
{
  "email": "nahkoda@example.com",
  "password": "password123"
}
```
- Klik **"Execute"**
- Copy token dari response

### 3. Authorize dengan Token
- Klik tombol **"Authorize"** 🔒 di pojok kanan atas
- Paste token: `Bearer your_token_here`
- Klik **"Authorize"**
- Klik **"Close"**

### 4. Test Endpoint Lainnya
- Pilih endpoint yang ingin di-test
- Klik **"Try it out"**
- Isi parameter/body yang diperlukan
- Klik **"Execute"**
- Lihat response di bawah

---

## 📱 Endpoint Mobile (Untuk Flutter Developer)

### Authentication
- `POST /api/mobile/login` - Login mobile user

### Dashboard
- `GET /api/mobile/dashboard` - Get dashboard data
- `GET /api/mobile/profile` - Get user profile

### Vessel Management
- `POST /api/mobile/vessel/{kapalId}/sertifikat-jalan` - Upload certificate
- `POST /api/mobile/vessel/{kapalId}/bahan-bakar` - Upload fuel data
- `GET /api/mobile/vessel/{kapalId}/documents` - Get all documents
- `GET /api/mobile/vessel/{kapalId}/fuel-summary` - Get fuel summary

### Location & Emergency
- `POST /api/mobile/location` - Update GPS location
- `POST /api/mobile/sos` - Send emergency alert

**Semua endpoint sudah terdokumentasi lengkap di Swagger UI!**

---

## 📖 Dokumentasi Tambahan

### Untuk Mobile Developer:
- **[MOBILE_DEVELOPER_GUIDE.md](MOBILE_DEVELOPER_GUIDE.md)** - Panduan lengkap dengan Flutter code
- **[API_VISUAL_FLOW.md](API_VISUAL_FLOW.md)** - Diagram & visual flow

### Untuk Backend Developer:
- **[SECURITY_SUMMARY.md](SECURITY_SUMMARY.md)** - Security improvements
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Index semua dokumentasi

---

## 🧪 Testing API

### Dengan Swagger UI (Recommended)
1. Buka http://localhost:5000/api-docs
2. Login & authorize
3. Test endpoint langsung dari browser

### Dengan Postman
1. Import collection dari: http://localhost:5000/api-docs.json
2. Set environment variable `baseUrl`
3. Login untuk dapat token
4. Set token di Authorization header

### Dengan cURL
```bash
# Login
curl -X POST http://localhost:5000/api/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nahkoda@example.com","password":"password123"}'

# Get Dashboard (ganti TOKEN)
curl -X GET http://localhost:5000/api/mobile/dashboard \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔐 Authentication

### JWT Token
Semua endpoint (kecuali login) membutuhkan JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiry
- Token berlaku: 24 jam
- Jika expired: Login ulang untuk dapat token baru

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email tidak valid"
    }
  ]
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (token invalid/expired)
- `403` - Forbidden (role not allowed)
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Server Error

---

## 🎯 Quick Links

- **Swagger UI**: http://192.168.1.21:5000/api-docs
- **API JSON**: http://192.168.1.21:5000/api-docs.json
- **Health Check**: http://192.168.1.21:5000/health
- **Server Status**: http://localhost:5000/test

---

## 💡 Tips

1. **Gunakan Swagger UI** untuk test API secara interaktif
2. **Copy token** setelah login untuk authorize
3. **Lihat Examples** di setiap endpoint untuk format yang benar
4. **Check Schema** untuk melihat struktur data
5. **Try it out** untuk test langsung dari browser

---

## 🆘 Troubleshooting

### Swagger UI tidak bisa diakses
```bash
# Pastikan server running
npm run dev

# Cek di browser
http://localhost:5000/health
```

### Token tidak valid
- Login ulang untuk dapat token baru
- Pastikan format: `Bearer <token>`
- Cek token belum expired (24 jam)

### CORS Error
- Pastikan `NODE_ENV=development` di .env
- Restart server setelah ubah .env

---

**📞 Need Help?**
- Check Swagger UI untuk dokumentasi lengkap
- Baca MOBILE_DEVELOPER_GUIDE.md untuk Flutter code
- Contact backend team

**Version**: 2.1.0
**Last Updated**: 2024
