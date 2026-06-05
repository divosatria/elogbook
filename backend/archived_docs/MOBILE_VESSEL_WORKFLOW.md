# 🚢 Mobile Vessel Information Workflow

## 📋 Alur Lengkap Informasi Kapal di Mobile App

### 🔄 **WORKFLOW OVERVIEW**

```
1. Admin (Website) → Input data kapal + Assign nahkoda & ABK
2. User (Mobile) → Login dengan email/password  
3. User (Mobile) → Call API untuk lihat kapal yang di-assign
4. User (Mobile) → Akses informasi lengkap kapal
5. User (Mobile) → Mulai trip dengan kapal yang sudah di-assign
```

---

## 🎯 **STEP-BY-STEP PROCESS**

### **Step 1: Admin Setup (Website)**
```
Admin Dashboard → Data Kapal → Tambah Kapal Baru
├── Input informasi kapal (nama, registrasi, spesifikasi)
├── Assign Nahkoda (pilih user dengan role 'nahkoda')
├── Assign ABK (pilih multiple users dengan role 'abk')
└── Save → Kapal tersimpan dengan assignment
```

### **Step 2: Mobile User Login**
```
Mobile App → Login Screen
├── Input: email + password
├── Validasi: hanya role 'nahkoda' dan 'abk' yang bisa login
└── Success: dapat JWT token + user info
```

### **Step 3: Cek Status Assignment**
```
GET /api/mobile/vessels/assignment-status
├── Response: hasAssignment = true/false
├── assignmentType: 'captain' atau 'crew'
└── assignedVessels: list kapal yang di-assign
```

### **Step 4: Lihat Kapal yang Di-assign**
```
GET /api/mobile/vessels/my-vessel
├── Nahkoda: lihat kapal dimana dia sebagai captain
├── ABK: lihat kapal dimana dia sebagai crew
└── Response: array kapal dengan info lengkap
```

### **Step 5: Detail Kapal**
```
GET /api/mobile/vessels/{id}
├── Nahkoda: akses kapal + lihat crew members
├── ABK: akses kapal (read-only)
└── Response: detail lengkap kapal + dokumen
```

---

## 🔗 **API ENDPOINTS**

### **1. Cek Status Assignment**
```http
GET /api/mobile/vessels/assignment-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 5,
    "role": "nahkoda",
    "assignmentType": "captain",
    "hasAssignment": true,
    "assignedVessels": [
      {
        "id": 1,
        "namaKapal": "KM Bahari Jaya",
        "nomorRegistrasi": "GT-001",
        "statusOperasional": "active",
        "assignmentStatus": "assigned"
      }
    ]
  }
}
```

### **2. Lihat Kapal yang Di-assign**
```http
GET /api/mobile/vessels/my-vessel
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "namaKapal": "KM Bahari Jaya",
      "nomorRegistrasi": "GT-001",
      "pemilik": "PT Maritim Nusantara",
      "tipeKapal": "penangkap_ikan",
      "alatTangkap": "Purse Seine",
      "assignmentStatus": "captain",
      "nahkoda": {
        "id": 5,
        "nama": "Kapten Ahmad",
        "noTelepon": "081234567890"
      },
      "statusOperasional": "active",
      "gps": {
        "currentPosition": {
          "latitude": -6.1234,
          "longitude": 106.5678
        }
      }
    }
  ]
}
```

### **3. Detail Kapal**
```http
GET /api/mobile/vessels/1
Authorization: Bearer {token}
```

**Response (Nahkoda):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "namaKapal": "KM Bahari Jaya",
    "userAssignmentType": "captain",
    "crewMembers": [
      {
        "id": 6,
        "nama": "ABK Budi",
        "username": "abk1",
        "noTelepon": "081234567891"
      }
    ],
    "dokumen": [...],
    "storageData": {...},
    "dataBahanBakar": {...}
  }
}
```

**Response (ABK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "namaKapal": "KM Bahari Jaya",
    "userAssignmentType": "crew",
    "crewMembers": [],
    "dokumen": [...],
    "storageData": {...}
  }
}
```

---

## 🚫 **ERROR SCENARIOS**

### **User Belum Di-assign**
```json
{
  "success": true,
  "message": "Belum ada kapal yang ditugaskan",
  "data": []
}
```

### **Akses Ditolak**
```json
{
  "success": false,
  "message": "Anda tidak memiliki akses ke kapal ini"
}
```

### **Role Tidak Valid**
```json
{
  "success": false,
  "message": "Hanya nahkoda dan ABK yang bisa melihat kapal yang ditugaskan"
}
```

---

## 🎨 **UI/UX RECOMMENDATIONS**

### **Dashboard Mobile**
```
┌─────────────────────────────┐
│ 🏠 Dashboard                │
├─────────────────────────────┤
│ 👋 Selamat datang, Ahmad    │
│ 📊 Status: Captain          │
├─────────────────────────────┤
│ 🚢 Kapal Saya (1)          │
│ ┌─────────────────────────┐ │
│ │ KM Bahari Jaya         │ │
│ │ GT-001 • Active        │ │
│ │ [Lihat Detail] [Trip]  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### **Detail Kapal (Nahkoda)**
```
┌─────────────────────────────┐
│ 🚢 KM Bahari Jaya          │
├─────────────────────────────┤
│ 📋 Informasi Kapal         │
│ • Registrasi: GT-001       │
│ • Pemilik: PT Maritim      │
│ • Tipe: Penangkap Ikan     │
├─────────────────────────────┤
│ 👥 Crew (2 orang)          │
│ • ABK Budi (081234567891)  │
│ • ABK Sari (081234567892)  │
├─────────────────────────────┤
│ 📍 GPS: -6.1234, 106.5678  │
│ 📄 Dokumen: 5 file         │
│ ⛽ Bahan Bakar: 80%        │
└─────────────────────────────┘
```

### **Detail Kapal (ABK)**
```
┌─────────────────────────────┐
│ 🚢 KM Bahari Jaya          │
├─────────────────────────────┤
│ 📋 Informasi Kapal         │
│ • Registrasi: GT-001       │
│ • Nahkoda: Kapten Ahmad    │
│ • Tipe: Penangkap Ikan     │
├─────────────────────────────┤
│ 📍 GPS: -6.1234, 106.5678  │
│ 📄 Dokumen: 5 file         │
│ ⛽ Bahan Bakar: 80%        │
│                            │
│ ℹ️ Anda adalah ABK di kapal │
│    ini                     │
└─────────────────────────────┘
```

---

## ✅ **TESTING CHECKLIST**

### **Nahkoda Testing**
- [ ] Login dengan email nahkoda
- [ ] Call `/vessels/assignment-status` → dapat `assignmentType: "captain"`
- [ ] Call `/vessels/my-vessel` → dapat list kapal sebagai captain
- [ ] Call `/vessels/{id}` → dapat detail + crew members
- [ ] Coba akses kapal lain → dapat error 403

### **ABK Testing**
- [ ] Login dengan email ABK
- [ ] Call `/vessels/assignment-status` → dapat `assignmentType: "crew"`
- [ ] Call `/vessels/my-vessel` → dapat list kapal sebagai crew
- [ ] Call `/vessels/{id}` → dapat detail tanpa crew members
- [ ] Coba akses kapal lain → dapat error 403

### **Edge Cases**
- [ ] User belum di-assign → dapat array kosong
- [ ] Database offline → dapat error 503
- [ ] Token invalid → dapat error 401
- [ ] Role admin/operator → dapat error 403

---

## 🔧 **IMPLEMENTATION NOTES**

### **Database Relations**
```sql
-- Nahkoda assignment
kapal.nahkodaId = user.id (where user.role = 'nahkoda')

-- ABK assignment  
vessel_crew.userId = user.id (where user.role = 'abk')
vessel_crew.kapalId = kapal.id
```

### **Access Control Logic**
```javascript
// Nahkoda access
if (role === 'nahkoda' && vessel.nahkodaId === userId) {
  // Allow access + show crew
}

// ABK access
if (role === 'abk' && vesselCrew.includes(userId)) {
  // Allow access (read-only)
}
```

### **Response Optimization**
- Gunakan `include` untuk join data related
- Filter sensitive data berdasarkan role
- Cache vessel data untuk performa
- Compress response untuk mobile

---

## 📱 **FLUTTER INTEGRATION**

### **Model Classes**
```dart
class VesselInfo {
  final int id;
  final String namaKapal;
  final String nomorRegistrasi;
  final String assignmentStatus; // 'captain' or 'crew'
  final List<CrewMember>? crewMembers; // null for ABK
  // ... other fields
}

class AssignmentStatus {
  final bool hasAssignment;
  final String assignmentType;
  final List<VesselSummary> assignedVessels;
}
```

### **API Service**
```dart
class VesselService {
  Future<AssignmentStatus> checkAssignmentStatus() async {
    final response = await dio.get('/mobile/vessels/assignment-status');
    return AssignmentStatus.fromJson(response.data);
  }
  
  Future<List<VesselInfo>> getMyVessels() async {
    final response = await dio.get('/mobile/vessels/my-vessel');
    return (response.data['data'] as List)
        .map((json) => VesselInfo.fromJson(json))
        .toList();
  }
}
```

---

## 🎯 **SUMMARY**

**✅ Alur sudah benar:**
1. Admin input kapal + assign crew di website
2. Mobile user login → dapat akses kapal yang di-assign
3. Nahkoda lihat kapal sebagai captain + crew info
4. ABK lihat kapal sebagai crew (read-only)
5. Semua user dapat informasi lengkap kapal mereka

**🔗 Endpoint yang digunakan:**
- `GET /api/mobile/vessels/assignment-status` - Cek status
- `GET /api/mobile/vessels/my-vessel` - List kapal assigned  
- `GET /api/mobile/vessels/{id}` - Detail kapal

**📚 Dokumentasi lengkap tersedia di:**
- Swagger UI: `http://localhost:5000/api-docs`
- File ini: `MOBILE_VESSEL_WORKFLOW.md`