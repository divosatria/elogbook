# Mobile App Role System - E-Logbook Maritime

## 📱 Mobile App Access Control

### Allowed Roles
Hanya 2 role yang dapat mengakses mobile app:

1. **👨‍✈️ Nahkoda (Captain)**
   - Full access ke semua fitur mobile
   - Dapat mengelola trip dan crew
   - Upload dokumen kapal dan pribadi
   - Manage fuel dan ice data
   - Send emergency alerts

2. **👷‍♂️ ABK (Crew Member)**
   - Limited access sesuai tugas
   - Dapat update lokasi
   - Upload dokumen pribadi
   - View assigned trips
   - Send emergency alerts

### Restricted Roles
Role yang **TIDAK DAPAT** mengakses mobile app:

- **👨‍💼 Admin**: Hanya akses web dashboard
- **🎣 Nelayan**: Hanya akses web (jika diperlukan)

## 🔐 Authentication Flow

### Mobile Login Process
1. User login dengan email + password
2. System cek role user
3. Jika role = `nahkoda` atau `abk` → Allow access
4. Jika role lain → Deny dengan error message

### Error Responses
```json
{
  "success": false,
  "message": "Akun tidak memiliki akses mobile app. Hanya Nahkoda dan ABK yang dapat menggunakan aplikasi mobile.",
  "errorCode": "MOBILE_ACCESS_DENIED",
  "userRole": "admin",
  "allowedRoles": ["nahkoda", "abk"]
}
```

## 🛡️ Permission Matrix

| Feature | Nahkoda | ABK | Admin | Nelayan |
|---------|---------|-----|-------|---------|
| Mobile Login | ✅ | ✅ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ❌ | ❌ |
| Manage Trips | ✅ | ❌ | ❌ | ❌ |
| Update Location | ✅ | ✅ | ❌ | ❌ |
| Send SOS | ✅ | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ❌ | ❌ |
| Manage Fuel Data | ✅ | ✅ | ❌ | ❌ |
| Manage Ice Data | ✅ | ✅ | ❌ | ❌ |
| View Vessel Data | ✅ | ✅ | ❌ | ❌ |

## 🔧 Implementation

### Middleware
- `mobileAuth`: Cek authentication + role mobile
- `nahkodaOnly`: Hanya nahkoda
- `abkOnly`: Hanya ABK

### Usage Example
```javascript
// Route hanya untuk mobile users (nahkoda + abk)
router.get('/dashboard', mobileAuth, dashboardController);

// Route hanya untuk nahkoda
router.post('/trip/create', mobileAuth, nahkodaOnly, tripController);

// Route untuk semua mobile users
router.post('/location', mobileAuth, locationController);
```

## 📋 User Creation Guidelines

### Admin Web Dashboard
Saat membuat user baru, admin harus:

1. **Pilih Role dengan Hati-hati**
   - `nahkoda`: Untuk kapten kapal
   - `abk`: Untuk crew kapal
   - `admin`: Untuk admin sistem (web only)
   - `nelayan`: Untuk nelayan umum (web only)

2. **Informasi Mobile Access**
   - UI menampilkan badge "Mobile Access" untuk nahkoda/abk
   - Warning untuk role admin/nelayan: "Tidak dapat akses mobile"

3. **Validasi Role**
   - System otomatis validasi role yang valid
   - Error message jelas jika role tidak sesuai

## 🚨 Security Considerations

1. **Role Validation**: Setiap endpoint mobile harus validasi role
2. **Token Security**: JWT token include role information
3. **Access Logging**: Log semua akses mobile untuk audit
4. **Error Messages**: Jangan expose internal system info

## 📱 Mobile App Integration

### Flutter Implementation
```dart
// Check user role after login
if (!['nahkoda', 'abk'].contains(user.role)) {
  showError('Akun Anda tidak memiliki akses mobile app');
  return;
}

// Show features based on role
if (user.role == 'nahkoda') {
  showCaptainFeatures();
} else if (user.role == 'abk') {
  showCrewFeatures();
}
```

### API Response Format
```json
{
  "success": true,
  "user": {
    "id": 1,
    "role": "nahkoda",
    "mobileAccess": true,
    "permissions": {
      "canManageTrip": true,
      "canUpdateLocation": true,
      "canSendSOS": true,
      "canUploadDocuments": true,
      "canViewVesselData": true
    }
  }
}
```

## 🔄 Migration Notes

Jika ada user existing dengan role yang salah:
1. Admin dapat update role via web dashboard
2. User harus logout/login ulang di mobile
3. System akan otomatis apply permission baru