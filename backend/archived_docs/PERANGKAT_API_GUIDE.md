# 📱 API Perangkat - E-Logbook Maritime

## 🚀 Overview

API Perangkat memungkinkan pengelolaan data perangkat kapal dengan fitur lengkap termasuk upload foto, filter, dan statistik.

## 🔧 Base URL
```
http://192.168.2.132:5000/api/perangkat
```

## 🔐 Authentication
Semua endpoint memerlukan JWT token:
```
Authorization: Bearer your_jwt_token_here
```

## 📋 Endpoints

### 1. GET /api/perangkat - List All Perangkat

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah per halaman (default: 10)
- `jenis` (optional): Filter jenis perangkat
- `kondisi` (optional): Filter kondisi
- `status` (optional): Filter status operasional
- `kapalId` (optional): Filter berdasarkan kapal
- `search` (optional): Pencarian nama/merk/model

**Example Request:**
```bash
GET /api/perangkat?page=1&limit=5&jenis=gps&kondisi=baik
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "namaPerangkat": "GPS Garmin GPSMAP 8612xsv",
      "jenisPerangkat": "gps",
      "merk": "Garmin",
      "model": "GPSMAP 8612xsv",
      "nomorSeri": "GM8612-2024-001",
      "tahunPembuatan": 2024,
      "kondisi": "baik",
      "statusOperasional": "aktif",
      "tanggalPembelian": "2024-01-15T00:00:00.000Z",
      "hargaPembelian": "25000000.00",
      "hargaFormatted": "Rp25.000.000,00",
      "spesifikasi": {
        "layar": "12 inch",
        "resolusi": "1280x800",
        "waterproof": "IPX7",
        "fitur": ["GPS", "GLONASS", "Galileo", "Sonar", "Radar"]
      },
      "foto": null,
      "fotoUrl": null,
      "keterangan": "GPS dengan sonar terintegrasi untuk navigasi dan deteksi ikan",
      "kapalId": 2,
      "createdBy": 1,
      "kapal": {
        "id": 2,
        "namaKapal": "KM Samudra Indah",
        "nomorRegistrasi": "REG-002"
      },
      "creator": {
        "id": 1,
        "nama": "Admin",
        "username": "admin"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 10,
    "itemsPerPage": 5
  }
}
```

### 2. GET /api/perangkat/:id - Get Perangkat by ID

**Example Request:**
```bash
GET /api/perangkat/1
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "namaPerangkat": "GPS Garmin GPSMAP 8612xsv",
    "jenisPerangkat": "gps",
    "merk": "Garmin",
    "model": "GPSMAP 8612xsv",
    "nomorSeri": "GM8612-2024-001",
    "tahunPembuatan": 2024,
    "kondisi": "baik",
    "statusOperasional": "aktif",
    "tanggalPembelian": "2024-01-15T00:00:00.000Z",
    "hargaPembelian": "25000000.00",
    "hargaFormatted": "Rp25.000.000,00",
    "spesifikasi": {
      "layar": "12 inch",
      "resolusi": "1280x800",
      "waterproof": "IPX7",
      "fitur": ["GPS", "GLONASS", "Galileo", "Sonar", "Radar"]
    },
    "foto": null,
    "fotoUrl": null,
    "keterangan": "GPS dengan sonar terintegrasi untuk navigasi dan deteksi ikan",
    "kapalId": 2,
    "kapal": {
      "id": 2,
      "namaKapal": "KM Samudra Indah",
      "nomorRegistrasi": "REG-002",
      "tipeKapal": "penangkap_ikan"
    }
  }
}
```

### 3. POST /api/perangkat - Create New Perangkat

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `namaPerangkat` (required): Nama perangkat
- `jenisPerangkat` (required): Jenis perangkat
- `merk` (optional): Merk perangkat
- `model` (optional): Model perangkat
- `nomorSeri` (optional): Serial number
- `tahunPembuatan` (optional): Tahun pembuatan
- `kondisi` (optional): Kondisi perangkat
- `statusOperasional` (optional): Status operasional
- `tanggalPembelian` (optional): Tanggal pembelian
- `hargaPembelian` (optional): Harga pembelian
- `spesifikasi` (optional): JSON spesifikasi
- `keterangan` (optional): Keterangan
- `kapalId` (optional): ID kapal
- `foto` (optional): File foto (JPG/PNG/WEBP, max 5MB)

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('namaPerangkat', 'GPS Baru');
formData.append('jenisPerangkat', 'gps');
formData.append('merk', 'Garmin');
formData.append('model', 'GPSMAP 1022xsv');
formData.append('kondisi', 'baik');
formData.append('statusOperasional', 'aktif');
formData.append('hargaPembelian', '15000000');
formData.append('spesifikasi', JSON.stringify({
  "layar": "10 inch",
  "waterproof": "IPX7"
}));
formData.append('foto', fileInput.files[0]); // File object

fetch('/api/perangkat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

**Example Response:**
```json
{
  "success": true,
  "message": "Perangkat berhasil ditambahkan",
  "data": {
    "id": 11,
    "namaPerangkat": "GPS Baru",
    "jenisPerangkat": "gps",
    "merk": "Garmin",
    "model": "GPSMAP 1022xsv",
    "kondisi": "baik",
    "statusOperasional": "aktif",
    "hargaPembelian": "15000000.00",
    "foto": "perangkat-1768873920123-456789.jpg",
    "fotoUrl": "/uploads/perangkat-photos/perangkat-1768873920123-456789.jpg"
  }
}
```

### 4. PUT /api/perangkat/:id - Update Perangkat

**Content-Type:** `multipart/form-data`

**Example Request:**
```javascript
const formData = new FormData();
formData.append('kondisi', 'rusak_ringan');
formData.append('keterangan', 'Perlu maintenance rutin');
formData.append('foto', newPhotoFile); // Optional new photo

fetch('/api/perangkat/1', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### 5. DELETE /api/perangkat/:id - Delete Perangkat

**Example Request:**
```bash
DELETE /api/perangkat/1
```

**Example Response:**
```json
{
  "success": true,
  "message": "Perangkat berhasil dihapus"
}
```

### 6. GET /api/perangkat/statistics - Get Statistics

**Example Request:**
```bash
GET /api/perangkat/statistics
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalPerangkat": 10,
    "perangkatTanpaKapal": 2,
    "perangkatTerpasang": 8,
    "byJenis": [
      { "jenis": "gps", "count": 1 },
      { "jenis": "radio", "count": 1 },
      { "jenis": "sonar", "count": 1 },
      { "jenis": "radar", "count": 1 },
      { "jenis": "kompas", "count": 1 },
      { "jenis": "mesin", "count": 1 },
      { "jenis": "alat_tangkap", "count": 1 },
      { "jenis": "keselamatan", "count": 2 },
      { "jenis": "lainnya", "count": 1 }
    ],
    "byKondisi": [
      { "kondisi": "baik", "count": 9 },
      { "kondisi": "rusak_ringan", "count": 1 }
    ],
    "byStatus": [
      { "status": "aktif", "count": 9 },
      { "status": "maintenance", "count": 1 }
    ]
  }
}
```

## 📊 Jenis Perangkat

- `gps` - GPS/Navigation
- `radio` - Radio Communication
- `sonar` - Fish Finder/Sonar
- `radar` - Radar System
- `kompas` - Compass
- `mesin` - Engine/Motor
- `alat_tangkap` - Fishing Equipment
- `keselamatan` - Safety Equipment
- `lainnya` - Others

## 🔧 Kondisi Perangkat

- `baik` - Good condition
- `rusak_ringan` - Minor damage
- `rusak_berat` - Major damage
- `tidak_berfungsi` - Not functioning

## ⚙️ Status Operasional

- `aktif` - Active/In use
- `maintenance` - Under maintenance
- `rusak` - Broken
- `tidak_digunakan` - Not in use

## 🖼️ Upload Foto

**Supported formats:** JPG, PNG, WEBP
**Max file size:** 5MB
**Storage path:** `/uploads/perangkat-photos/`

## 🔍 Filter & Search Examples

**Filter by jenis:**
```bash
GET /api/perangkat?jenis=gps
```

**Filter by kondisi:**
```bash
GET /api/perangkat?kondisi=baik
```

**Filter by kapal:**
```bash
GET /api/perangkat?kapalId=2
```

**Search by nama/merk:**
```bash
GET /api/perangkat?search=garmin
```

**Combined filters:**
```bash
GET /api/perangkat?jenis=keselamatan&kondisi=baik&page=1&limit=5
```

## 🚨 Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Nama perangkat dan jenis perangkat wajib diisi"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Perangkat tidak ditemukan"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Gagal memuat data perangkat: Database connection failed"
}
```

## 🧪 Testing dengan Postman

1. **Set Authorization:**
   - Type: Bearer Token
   - Token: Your JWT token

2. **Test GET endpoints:**
   ```
   GET {{baseUrl}}/api/perangkat
   GET {{baseUrl}}/api/perangkat/1
   GET {{baseUrl}}/api/perangkat/statistics
   ```

3. **Test POST with file upload:**
   - Method: POST
   - URL: {{baseUrl}}/api/perangkat
   - Body: form-data
   - Add fields and file

4. **Test filters:**
   ```
   GET {{baseUrl}}/api/perangkat?jenis=gps&kondisi=baik
   ```

## 📱 Frontend Integration Example

```javascript
// Service class for perangkat API
class PerangkatService {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/api/perangkat?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async create(formData) {
    const response = await fetch(`${this.baseUrl}/api/perangkat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });
    return response.json();
  }

  async getStatistics() {
    const response = await fetch(`${this.baseUrl}/api/perangkat/statistics`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// Usage
const perangkatService = new PerangkatService('http://192.168.2.132:5000', userToken);

// Get all GPS devices
const gpsDevices = await perangkatService.getAll({ jenis: 'gps' });

// Get statistics
const stats = await perangkatService.getStatistics();
```

---

**🎉 Sistem perangkat sudah siap digunakan dengan 10 sample data lengkap!**