# 🎨 VISUAL API FLOW - E-LOGBOOK MOBILE

## 📱 ALUR APLIKASI MOBILE

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. SPLASH SCREEN
   ↓
2. CEK TOKEN
   ├─ Ada Token? → Dashboard
   └─ Tidak Ada? → Login Screen

3. LOGIN SCREEN
   ↓
   User input email & password
   ↓
   POST /api/mobile/login
   ↓
   ├─ Success → Simpan Token → Dashboard
   └─ Error → Tampilkan Error

4. DASHBOARD
   ↓
   GET /api/mobile/dashboard
   ↓
   Tampilkan:
   - Total Trip
   - Active Trip
   - Recent Activities
   
5. MENU UTAMA
   ├─ Upload Sertifikat
   ├─ Upload Bahan Bakar
   ├─ Lihat Dokumen
   ├─ GPS Tracking
   └─ Emergency SOS
```

---

## 🔐 AUTHENTICATION FLOW

```
┌──────────────┐
│ Login Screen │
└──────┬───────┘
       │
       ↓ User tap "Login"
┌──────────────────────────────────────┐
│ Validate Input                       │
│ - Email tidak kosong                 │
│ - Password minimal 6 karakter        │
└──────┬───────────────────────────────┘
       │
       ↓ Input Valid
┌──────────────────────────────────────┐
│ POST /api/mobile/login               │
│ {                                    │
│   "email": "nahkoda@example.com",    │
│   "password": "password123"          │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Backend Process:                     │
│ 1. Cari user di database             │
│ 2. Cek password (bcrypt)             │
│ 3. Cek role (nahkoda/abk)            │
│ 4. Generate JWT token                │
└──────┬───────────────────────────────┘
       │
       ↓ Success
┌──────────────────────────────────────┐
│ Response:                            │
│ {                                    │
│   "success": true,                   │
│   "token": "eyJhbGc...",             │
│   "user": {                          │
│     "id": 1,                         │
│     "role": "nahkoda",               │
│     "nama": "Kapten Ahmad"           │
│   }                                  │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Mobile App:                          │
│ 1. Simpan token ke SharedPreferences │
│ 2. Simpan user data                  │
│ 3. Navigate ke Dashboard             │
└──────────────────────────────────────┘
```

---

## 📤 FILE UPLOAD FLOW

```
┌─────────────────────────────────────────────────────────┐
│          UPLOAD SERTIFIKAT JALAN FLOW                   │
└─────────────────────────────────────────────────────────┘

1. User tap "Upload Sertifikat"
   ↓
2. Pilih File (Camera/Gallery)
   ↓
3. Form Input:
   - Nama Sertifikat
   - Nomor Sertifikat
   - Tanggal Berlaku
   ↓
4. Validate Input
   ├─ File ada?
   ├─ Nomor sertifikat valid?
   └─ Tanggal di masa depan?
   ↓
5. Prepare FormData
   ┌────────────────────────────────┐
   │ FormData:                      │
   │ - sertifikat: [FILE]           │
   │ - nama: "Sertifikat 2024"      │
   │ - nomorSertifikat: "SJ-001"    │
   │ - tanggalBerlaku: "2025-12-31" │
   └────────────────────────────────┘
   ↓
6. POST /api/mobile/vessel/1/sertifikat-jalan
   Headers: { Authorization: "Bearer TOKEN" }
   ↓
7. Backend Process:
   ┌────────────────────────────────┐
   │ 1. Verify JWT token            │
   │ 2. Validate input              │
   │ 3. Validate file (type, size)  │
   │ 4. Start transaction           │
   │ 5. Lock kapal row              │
   │ 6. Save file to disk           │
   │    → uploads/sertifikat/1/     │
   │ 7. Update database (JSON)      │
   │ 8. Commit transaction          │
   └────────────────────────────────┘
   ↓
8. Response Success
   ┌────────────────────────────────┐
   │ {                              │
   │   "success": true,             │
   │   "message": "Upload berhasil",│
   │   "data": {                    │
   │     "fileUrl": "/uploads/..."  │
   │   }                            │
   │ }                              │
   └────────────────────────────────┘
   ↓
9. Mobile App:
   - Tampilkan success message
   - Refresh list dokumen
   - Clear form
```

---

## 📍 GPS TRACKING FLOW

```
┌─────────────────────────────────────────────────────────┐
│              BACKGROUND GPS TRACKING                    │
└─────────────────────────────────────────────────────────┘

START TRIP
   ↓
┌──────────────────────────────────────┐
│ Initialize Location Service          │
│ - Request permission                 │
│ - Start GPS listener                 │
└──────┬───────────────────────────────┘
       │
       ↓ Every 5 minutes
┌──────────────────────────────────────┐
│ Get Current Position                 │
│ - Latitude: -6.2000                  │
│ - Longitude: 106.8166                │
│ - Accuracy: 10m                      │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ POST /api/mobile/location            │
│ {                                    │
│   "kapalId": 1,                      │
│   "lat": -6.2000,                    │
│   "lng": 106.8166                    │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Backend:                             │
│ 1. Update trip.currentLocation       │
│ 2. Emit Socket.IO event              │
│    → "location_update"               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Dashboard (Real-time):               │
│ - Update marker on map               │
│ - Show vessel movement               │
│ - Update last seen time              │
└──────────────────────────────────────┘
       │
       ↓ Continue loop
   (Repeat every 5 minutes)
```

---

## 🆘 EMERGENCY SOS FLOW

```
┌─────────────────────────────────────────────────────────┐
│                  EMERGENCY SOS FLOW                     │
└─────────────────────────────────────────────────────────┘

User tap "SOS BUTTON"
   ↓
┌──────────────────────────────────────┐
│ Show Confirmation Dialog             │
│ "Kirim sinyal darurat?"              │
│ [CANCEL]  [KIRIM SOS]                │
└──────┬───────────────────────────────┘
       │
       ↓ User confirm
┌──────────────────────────────────────┐
│ Get Current Location                 │
│ - GPS coordinates                    │
│ - Timestamp                          │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ POST /api/mobile/sos                 │
│ {                                    │
│   "kapalId": 1,                      │
│   "location": {                      │
│     "lat": -6.2000,                  │
│     "lng": 106.8166                  │
│   },                                 │
│   "note": "Engine failure"           │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Backend Process:                     │
│ 1. Create emergency record           │
│ 2. Set status: "active"              │
│ 3. Emit Socket.IO: "sos_alert"       │
│ 4. Send notification to admin        │
└──────┬───────────────────────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ↓                                 ↓
┌──────────────────┐         ┌──────────────────┐
│ Mobile App       │         │ Dashboard        │
│ - Show success   │         │ - Alert popup    │
│ - SOS active     │         │ - Show on map    │
│ - Disable button │         │ - Call button    │
└──────────────────┘         └──────────────────┘
```

---

## 📊 DATA MODELS

### User Model
```dart
class User {
  final int id;
  final String username;
  final String email;
  final String role; // "nahkoda" atau "abk"
  final String nama;
  final String? telepon;
  
  User({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    required this.nama,
    this.telepon,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      role: json['role'],
      nama: json['profile']['nama'],
      telepon: json['profile']['telepon'],
    );
  }
}
```

### Sertifikat Model
```dart
class Sertifikat {
  final String id;
  final String nama;
  final String nomorSertifikat;
  final DateTime tanggalBerlaku;
  final String fileUrl;
  final DateTime uploadedAt;
  
  Sertifikat({
    required this.id,
    required this.nama,
    required this.nomorSertifikat,
    required this.tanggalBerlaku,
    required this.fileUrl,
    required this.uploadedAt,
  });
  
  factory Sertifikat.fromJson(Map<String, dynamic> json) {
    return Sertifikat(
      id: json['id'],
      nama: json['nama'],
      nomorSertifikat: json['nomorSertifikat'],
      tanggalBerlaku: DateTime.parse(json['tanggalBerlaku']),
      fileUrl: json['fileUrl'],
      uploadedAt: DateTime.parse(json['uploadedAt']),
    );
  }
  
  // Helper: Cek apakah sertifikat masih berlaku
  bool get isValid => tanggalBerlaku.isAfter(DateTime.now());
  
  // Helper: Berapa hari lagi expired
  int get daysUntilExpiry => tanggalBerlaku.difference(DateTime.now()).inDays;
}
```

### Bahan Bakar Model
```dart
class BahanBakar {
  final String id;
  final String jenisBahanBakar;
  final double jumlahLiter;
  final double hargaPerLiter;
  final double totalHarga;
  final DateTime tanggalPengisian;
  final String? lokasiPengisian;
  final String? buktiFileUrl;
  
  BahanBakar({
    required this.id,
    required this.jenisBahanBakar,
    required this.jumlahLiter,
    required this.hargaPerLiter,
    required this.totalHarga,
    required this.tanggalPengisian,
    this.lokasiPengisian,
    this.buktiFileUrl,
  });
  
  factory BahanBakar.fromJson(Map<String, dynamic> json) {
    return BahanBakar(
      id: json['id'],
      jenisBahanBakar: json['jenisBahanBakar'],
      jumlahLiter: json['jumlahLiter'].toDouble(),
      hargaPerLiter: json['hargaPerLiter'].toDouble(),
      totalHarga: json['totalHarga'].toDouble(),
      tanggalPengisian: DateTime.parse(json['tanggalPengisian']),
      lokasiPengisian: json['lokasiPengisian'],
      buktiFileUrl: json['buktiFileUrl'],
    );
  }
}
```

---

## 🎯 QUICK REFERENCE

### Base URLs
```
Production:  https://api.e-logbook.com/api
Development: http://192.168.1.21:5000/api
Mobile:      {baseUrl}/mobile
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Response Format
```json
{
  "success": true/false,
  "message": "Success/Error message",
  "data": { ... },
  "errors": [ ... ] // Only on validation errors
}
```

### HTTP Status Codes
```
200 - OK
201 - Created
400 - Bad Request (validation error)
401 - Unauthorized (token invalid/expired)
403 - Forbidden (role not allowed)
404 - Not Found
429 - Too Many Requests
500 - Server Error
```

---

## 📱 SCREEN MOCKUP

```
┌─────────────────────────────────────┐
│  ☰  E-Logbook Mobile    🔔  👤      │
├─────────────────────────────────────┤
│                                     │
│  Selamat Datang, Kapten Ahmad! 👋  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📊 Dashboard                │   │
│  │  ─────────────────────────   │   │
│  │  Total Trip:        12       │   │
│  │  Active Trip:        3       │   │
│  │  Pending Tasks:      5       │   │
│  └─────────────────────────────┘   │
│                                     │
│  📋 Menu Utama                      │
│  ┌──────────┐  ┌──────────┐        │
│  │ 📄 Upload│  │ ⛽ Bahan │        │
│  │ Sertifikat│  │  Bakar  │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │ 📍 GPS   │  │ 🆘 SOS   │        │
│  │ Tracking │  │ Emergency│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  📌 Recent Activities               │
│  • Upload sertifikat - 2 jam lalu  │
│  • Update lokasi - 5 menit lalu    │
│  • Pengisian BBM - 1 hari lalu     │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ CHECKLIST IMPLEMENTASI

### Phase 1: Authentication
- [ ] Login screen
- [ ] Token management
- [ ] Auto-logout on token expired
- [ ] Remember me feature

### Phase 2: Dashboard
- [ ] Get dashboard data
- [ ] Display statistics
- [ ] Recent activities list
- [ ] Pull to refresh

### Phase 3: File Upload
- [ ] Upload sertifikat jalan
- [ ] Upload bukti bahan bakar
- [ ] Image picker (camera/gallery)
- [ ] Upload progress indicator
- [ ] View uploaded documents

### Phase 4: GPS Tracking
- [ ] Request location permission
- [ ] Background location service
- [ ] Send location every 5 minutes
- [ ] Show current location on map

### Phase 5: Emergency
- [ ] SOS button
- [ ] Confirmation dialog
- [ ] Send emergency alert
- [ ] Show SOS status

### Phase 6: Real-time
- [ ] Socket.IO integration
- [ ] Listen for updates
- [ ] Push notifications
- [ ] Real-time location updates

---

**📞 Need Help?**
- Check: `MOBILE_DEVELOPER_GUIDE.md` untuk detail lengkap
- Swagger: http://192.168.1.21:5000/api-docs
- Contact: Backend team

**Version**: 2.1.0
**Last Updated**: 2024
