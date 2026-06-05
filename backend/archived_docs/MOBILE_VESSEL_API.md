# Mobile Vessel API Documentation

## 📱 Endpoint untuk Informasi Kapal di Mobile App

### 1. Get My Vessel (Kapal yang Ditugaskan)

**Endpoint**: `GET /api/mobile/vessels/my-vessel`

**Deskripsi**: Mendapatkan semua kapal yang ditugaskan ke nahkoda yang sedang login

**Authorization**: Bearer Token (Nahkoda only)

**Request**:
```http
GET /api/mobile/vessels/my-vessel
Headers:
  Authorization: Bearer {token}
```

**Response Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vesselId": "VSL-001",
      "namaKapal": "KM Mina Jaya",
      "nomorRegistrasi": "123-ABC-2024",
      "nomorKapal": "KM-001",
      "pemilik": "PT Mina Jaya",
      "tipeKapal": "penangkap_ikan",
      "alatTangkap": "Purse Seine",
      "panjangKapal": 25.5,
      "lebarKapal": 6.2,
      "spesifikasi": {
        "kapasitas": 10,
        "material": "Kayu"
      },
      "statusOperasional": "active",
      "statusPelayaran": "docked",
      "foto": "base64_or_url",
      "nahkoda": {
        "id": 10,
        "nama": "Bayu Guniman",
        "username": "guniman",
        "noTelepon": "08123456789"
      },
      "gps": {
        "currentPosition": {
          "latitude": -6.123456,
          "longitude": 106.789012,
          "timestamp": "2026-01-15T10:00:00Z"
        },
        "isActive": true,
        "lastUpdate": "2026-01-15T10:00:00Z"
      },
      "lastPosition": {
        "latitude": -6.123456,
        "longitude": 106.789012
      },
      "dokumen": [
        {
          "jenis": "SIUP",
          "nomor": "SIUP-123",
          "berlakuHingga": "2027-12-31",
          "fileUrl": "/uploads/vessel-docs/siup-123.pdf"
        }
      ],
      "storageData": {
        "kapasitasEs": 500,
        "kapasitasIkan": 1000
      },
      "dataBahanBakar": {
        "kapasitas": 500,
        "jenis": "Solar"
      }
    }
  ]
}
```

**Response Empty (200)**:
```json
{
  "success": true,
  "message": "Belum ada kapal yang ditugaskan",
  "data": []
}
```

**Response Error (403)**:
```json
{
  "success": false,
  "message": "Hanya nahkoda yang bisa melihat kapal yang ditugaskan"
}
```

---

### 2. Get Vessel Detail

**Endpoint**: `GET /api/mobile/vessels/:id`

**Deskripsi**: Mendapatkan detail lengkap kapal berdasarkan ID

**Authorization**: Bearer Token (Nahkoda & ABK)

**Request**:
```http
GET /api/mobile/vessels/1
Headers:
  Authorization: Bearer {token}
```

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "vesselId": "VSL-001",
    "namaKapal": "KM Mina Jaya",
    "nomorRegistrasi": "123-ABC-2024",
    "nomorKapal": "KM-001",
    "pemilik": "PT Mina Jaya",
    "tipeKapal": "penangkap_ikan",
    "alatTangkap": "Purse Seine",
    "panjangKapal": 25.5,
    "lebarKapal": 6.2,
    "spesifikasi": {
      "kapasitas": 10,
      "material": "Kayu",
      "tahunPembuatan": 2020
    },
    "statusOperasional": "active",
    "statusPelayaran": "docked",
    "foto": "base64_or_url",
    "nahkoda": {
      "id": 10,
      "nama": "Bayu Guniman",
      "username": "guniman",
      "noTelepon": "08123456789",
      "email": "guniman@gmail.com"
    },
    "gps": {
      "currentPosition": {
        "latitude": -6.123456,
        "longitude": 106.789012,
        "speed": 12.5,
        "heading": 180,
        "timestamp": "2026-01-15T10:00:00Z"
      },
      "locations": [...],
      "isActive": true,
      "lastUpdate": "2026-01-15T10:00:00Z"
    },
    "lastPosition": {
      "latitude": -6.123456,
      "longitude": 106.789012
    },
    "dokumen": [
      {
        "jenis": "SIUP",
        "nomor": "SIUP-123",
        "berlakuHingga": "2027-12-31",
        "fileUrl": "/uploads/vessel-docs/siup-123.pdf"
      },
      {
        "jenis": "SIPI",
        "nomor": "SIPI-456",
        "berlakuHingga": "2027-06-30",
        "fileUrl": "/uploads/vessel-docs/sipi-456.pdf"
      }
    ],
    "mesin": {
      "merk": "Yanmar",
      "daya": "120 HP",
      "tahunPembuatan": 2019
    },
    "storageData": {
      "kapasitasEs": 500,
      "kapasitasIkan": 1000
    },
    "dataBahanBakar": {
      "kapasitas": 500,
      "jenis": "Solar",
      "konsumsiPerJam": 5
    },
    "sertifikatJalan": {
      "nomor": "SJ-789",
      "berlakuHingga": "2026-12-31"
    },
    "asuransi": {
      "provider": "Asuransi Kapal Indonesia",
      "nomor": "ASR-123",
      "berlakuHingga": "2027-03-31"
    }
  }
}
```

**Response Error (404)**:
```json
{
  "success": false,
  "message": "Kapal tidak ditemukan"
}
```

**Response Error (403)**:
```json
{
  "success": false,
  "message": "Anda tidak memiliki akses ke kapal ini"
}
```

---

## 🔄 Alur Penggunaan di Mobile App

### 1. Login
```dart
POST /api/mobile/login
Body: { email, password }
→ Dapat token & user.id
```

### 2. Get Kapal yang Ditugaskan
```dart
GET /api/mobile/vessels/my-vessel
Headers: { Authorization: Bearer {token} }
→ Dapat list kapal yang nahkodaId = user.id
```

### 3. Pilih Kapal & Lihat Detail
```dart
GET /api/mobile/vessels/{kapalId}
Headers: { Authorization: Bearer {token} }
→ Dapat detail lengkap kapal
```

### 4. Mulai Trip dengan Kapal
```dart
POST /api/trip
Body: {
  kapalId: {kapalId},
  tujuan: "Laut Jawa",
  jumlahEs: 500,
  jumlahBBM: 200,
  ...
}
```

---

## 🔐 Authorization

- **Nahkoda**: Bisa melihat semua kapal yang `nahkodaId` nya sesuai dengan user ID mereka
- **ABK**: Bisa melihat detail kapal (read-only) jika mereka tergabung dalam trip kapal tersebut
- **Admin**: Tidak bisa akses endpoint mobile (harus pakai web dashboard)

---

## 📊 Status Kapal

### Status Operasional
- `active`: Kapal aktif dan siap digunakan
- `maintenance`: Kapal sedang dalam perawatan
- `inactive`: Kapal tidak aktif

### Status Pelayaran
- `sailing`: Sedang berlayar
- `docked`: Berlabuh di pelabuhan
- `maintenance`: Dalam perawatan
- `idle`: Standby

---

## 💡 Tips Implementasi Flutter

```dart
// Service class
class VesselService {
  final String baseUrl = 'http://192.168.2.132:5000/api/mobile';
  
  Future<List<Vessel>> getMyVessels() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/vessels/my-vessel'),
      headers: {'Authorization': 'Bearer $token'}
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['data'] as List)
        .map((v) => Vessel.fromJson(v))
        .toList();
    }
    throw Exception('Failed to load vessels');
  }
  
  Future<Vessel> getVesselDetail(int id) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/vessels/$id'),
      headers: {'Authorization': 'Bearer $token'}
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return Vessel.fromJson(data['data']);
    }
    throw Exception('Failed to load vessel detail');
  }
}
```

---

## 🎯 Kesimpulan

Endpoint ini memastikan:
1. ✅ Nahkoda hanya bisa lihat kapal yang ditugaskan oleh admin
2. ✅ Data kapal di mobile **sinkron** dengan data di web dashboard
3. ✅ Nahkoda tidak bisa edit data kapal (read-only)
4. ✅ Security: Validasi authorization & ownership
5. ✅ Complete data: Semua info kapal tersedia untuk mobile app
