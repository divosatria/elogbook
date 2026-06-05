# 📚 DOKUMENTASI API E-LOGBOOK

## 🌐 SWAGGER UI - Interactive API Documentation

### **Akses Swagger UI:**
```
http://localhost:5000/api-docs
```

atau dari device lain:
```
http://192.168.1.21:5000/api-docs
```

---

## ✅ DOKUMENTASI SUDAH DI SWAGGER UI

**Semua endpoint mobile sudah terdokumentasi lengkap di Swagger UI:**

✅ **POST /api/mobile/login** - Login mobile
✅ **GET /api/mobile/dashboard** - Dashboard data
✅ **POST /api/mobile/vessel/{kapalId}/sertifikat-jalan** - Upload sertifikat
✅ **POST /api/mobile/vessel/{kapalId}/bahan-bakar** - Upload bahan bakar
✅ **GET /api/mobile/vessel/{kapalId}/documents** - Get documents
✅ **GET /api/mobile/vessel/{kapalId}/fuel-summary** - Fuel summary
✅ **POST /api/mobile/location** - Update location
✅ **POST /api/mobile/sos** - Emergency SOS

---

## 🚀 Cara Pakai Swagger UI

1. Buka http://localhost:5000/api-docs
2. Login di endpoint **POST /api/mobile/login**
3. Copy token dari response
4. Klik tombol **Authorize** 🔒
5. Paste token: `Bearer your_token_here`
6. Test endpoint lainnya dengan **Try it out**

---

## 📖 Dokumentasi Tambahan

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Panduan Swagger UI
- **[MOBILE_DEVELOPER_GUIDE.md](MOBILE_DEVELOPER_GUIDE.md)** - Flutter code
- **[API_VISUAL_FLOW.md](API_VISUAL_FLOW.md)** - Visual flow
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Index lengkap

---

**Version**: 2.1.0
**Status**: ✅ PRODUCTION READY
