# 🚢 Mobile Vessel Management - BBM & Es

## 📋 Alur Manajemen BBM dan Es di Mobile App

### 🔄 **WORKFLOW OVERVIEW**

```
1. User Login → Pilih Kapal → Detail Kapal
2. Manajemen BBM → Input Pengisian → Lihat History
3. Manajemen Es → Input Pembelian → Lihat History  
4. Lihat Ringkasan → Statistik BBM & Es
```

---

## 🎯 **STEP-BY-STEP PROCESS**

### **Step 1: Akses Manajemen**
```
Detail Kapal → Tab Manajemen
├── 📄 Dokumen Kapal
├── ⛽ Bahan Bakar
├── 🧊 Data Es
└── 🧊 Storage Data
```

### **Step 2: Input Data BBM**
```
⛽ Bahan Bakar → Tambah Pengisian
├── Pilih jenis BBM (Solar, Bensin, Premium, Pertamax)
├── Input jumlah liter + harga per liter
├── Upload foto bukti (opsional)
└── Simpan data
```

### **Step 3: Input Data Es**
```
🧊 Data Es → Tambah Pembelian
├── Pilih jenis es (Es Balok, Es Curah, Es Tube)
├── Input jumlah kg + harga per kg
├── Upload foto bukti (opsional)
└── Simpan data
```

### **Step 4: Lihat Ringkasan**
```
📊 Ringkasan → Statistik
├── Total pengisian BBM + biaya
├── Total pembelian es + biaya
├── Rata-rata harga
└── History lengkap
```

---

## 🔗 **API ENDPOINTS**

### **1. Upload Data BBM**
```http
POST /api/mobile/vessel/{kapalId}/bahan-bakar
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "jenisBahanBakar": "Solar",
  "jumlahLiter": 500,
  "hargaPerLiter": 6500,
  "totalHarga": 3250000,
  "tanggalPengisian": "2024-01-15T08:00:00Z",
  "lokasiPengisian": "SPBU Pelabuhan Muara Baru",
  "keterangan": "Pengisian rutin sebelum melaut",
  "bukti": "[FILE]"
}
```

### **2. Upload Data Es**
```http
POST /api/mobile/vessel/{kapalId}/ice-data
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "jenisEs": "Es Balok",
  "jumlahKg": 1000,
  "hargaPerKg": 2500,
  "totalHarga": 2500000,
  "tanggalPembelian": "2024-01-15T08:00:00Z",
  "lokasiPembelian": "Pasar Ikan Muara Baru",
  "keterangan": "Es untuk persiapan melaut",
  "bukti": "[FILE]"
}
```

### **3. Lihat History BBM**
```http
GET /api/mobile/vessel/{kapalId}/fuel-summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kapal": {
      "id": 1,
      "namaKapal": "KM Bahari Jaya"
    },
    "summary": {
      "totalPengisian": 5,
      "totalLiter": 2500,
      "totalBiaya": 16250000,
      "rataRataHarga": 6500
    },
    "details": [...]
  }
}
```

### **4. Lihat History Es**
```http
GET /api/mobile/vessel/{kapalId}/ice-summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kapal": {
      "id": 1,
      "namaKapal": "KM Bahari Jaya"
    },
    "summary": {
      "totalPembelian": 3,
      "totalKg": 3000,
      "totalBiaya": 7500000,
      "rataRataHarga": 2500
    },
    "byType": {
      "Es Balok": {
        "count": 2,
        "totalKg": 2000,
        "totalBiaya": 5000000
      },
      "Es Curah": {
        "count": 1,
        "totalKg": 1000,
        "totalBiaya": 2500000
      }
    }
  }
}
```

---

## 🎨 **UI/UX EXAMPLES**

### **Tab Manajemen**
```
┌─────────────────────────────┐
│ 🚢 KM Bahari Jaya          │
├─────────────────────────────┤
│ [Info] [Manajemen] [GPS]   │
├─────────────────────────────┤
│ 📄 Dokumen Kapal           │
│ • Sertifikat: 3 file       │
│ • [Upload] [Lihat]         │
├─────────────────────────────┤
│ ⛽ Bahan Bakar             │
│ • Total: 2500L (Rp16.2M)   │
│ • [Input] [History]        │
├─────────────────────────────┤
│ 🧊 Data Es                 │
│ • Total: 3000Kg (Rp7.5M)   │
│ • [Input] [History]        │
├─────────────────────────────┤
│ 🧊 Storage Data            │
│ • Kapasitas: 2000Kg        │
│ • [Update] [Lihat]         │
└─────────────────────────────┘
```

### **Input Data BBM**
```
┌─────────────────────────────┐
│ ⛽ Input Bahan Bakar        │
├─────────────────────────────┤
│ Jenis BBM:                 │
│ [Solar ▼]                  │
│                            │
│ Jumlah (Liter):            │
│ [500]                      │
│                            │
│ Harga per Liter:           │
│ [Rp 6.500]                 │
│                            │
│ Total Harga:               │
│ [Rp 3.250.000]             │
│                            │
│ Lokasi Pengisian:          │
│ [SPBU Pelabuhan]           │
│                            │
│ Bukti (Opsional):          │
│ [📷 Ambil Foto]            │
│                            │
│ [Simpan] [Batal]           │
└─────────────────────────────┘
```

### **Input Data Es**
```
┌─────────────────────────────┐
│ 🧊 Input Data Es           │
├─────────────────────────────┤
│ Jenis Es:                  │
│ [Es Balok ▼]               │
│                            │
│ Jumlah (Kg):               │
│ [1000]                     │
│                            │
│ Harga per Kg:              │
│ [Rp 2.500]                 │
│                            │
│ Total Harga:               │
│ [Rp 2.500.000]             │
│                            │
│ Lokasi Pembelian:          │
│ [Pasar Ikan Muara Baru]    │
│                            │
│ Bukti (Opsional):          │
│ [📷 Ambil Foto]            │
│                            │
│ [Simpan] [Batal]           │
└─────────────────────────────┘
```

### **Ringkasan BBM & Es**
```
┌─────────────────────────────┐
│ 📊 Ringkasan BBM & Es      │
├─────────────────────────────┤
│ ⛽ BAHAN BAKAR             │
│ • Total Pengisian: 5x      │
│ • Total Volume: 2.500L     │
│ • Total Biaya: Rp16.25M    │
│ • Rata-rata: Rp6.500/L     │
├─────────────────────────────┤
│ 🧊 DATA ES                 │
│ • Total Pembelian: 3x      │
│ • Total Berat: 3.000Kg     │
│ • Total Biaya: Rp7.5M      │
│ • Rata-rata: Rp2.500/Kg    │
├─────────────────────────────┤
│ 📈 TREND                   │
│ • BBM: ↗️ +15% bulan ini    │
│ • Es: ↘️ -5% bulan ini      │
│                            │
│ [Detail BBM] [Detail Es]   │
└─────────────────────────────┘
```

---

## ✅ **VALIDATION RULES**

### **BBM Validation**
- **Jenis BBM**: Wajib (Solar, Bensin, Premium, Pertamax)
- **Jumlah Liter**: 0.1 - 100,000 liter
- **Harga per Liter**: > 0
- **Total Harga**: > 0
- **Tanggal**: Tidak boleh masa depan, max 1 tahun lalu
- **Lokasi**: Max 200 karakter
- **Keterangan**: Max 500 karakter
- **Bukti**: JPG/PNG, max 10MB (opsional)

### **Es Validation**
- **Jenis Es**: Wajib (Es Balok, Es Curah, Es Tube)
- **Jumlah Kg**: 0.1 - 50,000 kg
- **Harga per Kg**: > 0
- **Total Harga**: > 0
- **Tanggal**: Tidak boleh masa depan, max 1 tahun lalu
- **Lokasi**: Max 200 karakter
- **Keterangan**: Max 500 karakter
- **Bukti**: JPG/PNG, max 10MB (opsional)

---

## 🔧 **IMPLEMENTATION NOTES**

### **File Upload Setup**
```javascript
// Multer config for BBM receipts
const bbmStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, `../../uploads/fuel-data/${req.params.kapalId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multer config for ice receipts
const iceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, `../../uploads/ice-data/${req.params.kapalId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
```

### **Database Schema**
```sql
-- Vessel table with JSON fields
ALTER TABLE kapal ADD COLUMN dataBahanBakar JSON;
ALTER TABLE kapal ADD COLUMN dataEs JSON;

-- Example data structure
{
  "dataBahanBakar": [
    {
      "id": "1642234567890",
      "jenisBahanBakar": "Solar",
      "jumlahLiter": 500,
      "hargaPerLiter": 6500,
      "totalHarga": 3250000,
      "tanggalPengisian": "2024-01-15T08:00:00Z",
      "lokasiPengisian": "SPBU Pelabuhan",
      "buktiFileUrl": "/uploads/fuel-data/1/receipt.jpg",
      "uploadedBy": 5,
      "uploadedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "dataEs": [
    {
      "id": "1642234567891",
      "jenisEs": "Es Balok",
      "jumlahKg": 1000,
      "hargaPerKg": 2500,
      "totalHarga": 2500000,
      "tanggalPembelian": "2024-01-15T08:00:00Z",
      "lokasiPembelian": "Pasar Ikan",
      "buktiFileUrl": "/uploads/ice-data/1/receipt.jpg",
      "uploadedBy": 5,
      "uploadedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## 📱 **FLUTTER INTEGRATION**

### **Model Classes**
```dart
class FuelData {
  final String id;
  final String jenisBahanBakar;
  final double jumlahLiter;
  final double hargaPerLiter;
  final double totalHarga;
  final DateTime tanggalPengisian;
  final String? lokasiPengisian;
  final String? buktiFileUrl;
}

class IceData {
  final String id;
  final String jenisEs;
  final double jumlahKg;
  final double hargaPerKg;
  final double totalHarga;
  final DateTime tanggalPembelian;
  final String? lokasiPembelian;
  final String? buktiFileUrl;
}

class VesselSummary {
  final FuelSummary fuelSummary;
  final IceSummary iceSummary;
}
```

### **API Service**
```dart
class VesselManagementService {
  Future<void> uploadFuelData(int kapalId, FuelData data, File? receipt) async {
    final formData = FormData.fromMap({
      'jenisBahanBakar': data.jenisBahanBakar,
      'jumlahLiter': data.jumlahLiter,
      'hargaPerLiter': data.hargaPerLiter,
      'totalHarga': data.totalHarga,
      'tanggalPengisian': data.tanggalPengisian.toIso8601String(),
      if (data.lokasiPengisian != null) 'lokasiPengisian': data.lokasiPengisian,
      if (receipt != null) 'bukti': await MultipartFile.fromFile(receipt.path),
    });
    
    await dio.post('/mobile/vessel/$kapalId/bahan-bakar', data: formData);
  }
  
  Future<void> uploadIceData(int kapalId, IceData data, File? receipt) async {
    final formData = FormData.fromMap({
      'jenisEs': data.jenisEs,
      'jumlahKg': data.jumlahKg,
      'hargaPerKg': data.hargaPerKg,
      'totalHarga': data.totalHarga,
      'tanggalPembelian': data.tanggalPembelian.toIso8601String(),
      if (data.lokasiPembelian != null) 'lokasiPembelian': data.lokasiPembelian,
      if (receipt != null) 'bukti': await MultipartFile.fromFile(receipt.path),
    });
    
    await dio.post('/mobile/vessel/$kapalId/ice-data', data: formData);
  }
}
```

---

## 🎯 **SUMMARY**

**✅ Fitur Manajemen BBM & Es:**
1. **Input Data BBM** - Upload pengisian bahan bakar dengan bukti
2. **Input Data Es** - Upload pembelian es dengan bukti
3. **History & Summary** - Lihat riwayat dan statistik lengkap
4. **File Upload** - Support foto bukti pembelian
5. **Validation** - Validasi input yang ketat
6. **Access Control** - Nahkoda dan ABK bisa input data

**🔗 Endpoint yang tersedia:**
- `POST /api/mobile/vessel/{id}/bahan-bakar` - Upload BBM
- `POST /api/mobile/vessel/{id}/ice-data` - Upload Es
- `GET /api/mobile/vessel/{id}/fuel-summary` - Ringkasan BBM
- `GET /api/mobile/vessel/{id}/ice-summary` - Ringkasan Es

**📚 Dokumentasi lengkap:**
- Swagger UI: `http://localhost:5000/api-docs`
- File ini: `MOBILE_BBM_ES_MANAGEMENT.md`