# 🐟 Fish Price Integration dengan Hasil Tangkap

## Overview

Sistem pengaturan harga ikan terintegrasi dengan hasil tangkap untuk menghitung pajak otomatis berdasarkan jenis ikan yang ditangkap.

## Fitur Utama

### 1. **Pengaturan Harga Ikan (Fish Price Settings)**
- Admin dapat mengatur harga per kg untuk setiap jenis ikan
- Setiap jenis ikan memiliki persentase pajak yang dapat dikustomisasi
- Data dinormalisasi (lowercase) untuk mencegah duplikasi

### 2. **Kalkulasi Pajak Otomatis**
- Saat input hasil tangkap, sistem otomatis menghitung:
  - Total nilai (berat × harga per kg)
  - Jumlah pajak (total nilai × persentase pajak)
  - Nilai bersih (total nilai - pajak)

### 3. **Fleksibilitas Harga**
- Jika harga tidak diset di pengaturan, user bisa input manual
- Pajak tetap dihitung berdasarkan pengaturan jenis ikan
- Default pajak 10% jika tidak ada pengaturan khusus

## Database Schema

### Tabel `fish_prices`
```sql
CREATE TABLE fish_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fishType VARCHAR(100) NOT NULL UNIQUE,
  pricePerKg DECIMAL(10,2) NOT NULL,
  taxPercentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabel `hasil_tangkap` (Updated)
```sql
ALTER TABLE hasil_tangkap ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE hasil_tangkap ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE hasil_tangkap ADD COLUMN net_value DECIMAL(12,2) DEFAULT NULL;
```

## API Endpoints

### Fish Price Management
```
GET    /api/fish-prices              # Get all fish prices (authenticated)
POST   /api/fish-prices              # Create fish price (admin only + CSRF)
PUT    /api/fish-prices/:id          # Update fish price (admin only + CSRF)
DELETE /api/fish-prices/:id          # Delete fish price (admin only + CSRF)
```

### Hasil Tangkap Integration
```
GET    /api/hasil-tangkap/fish-prices           # Get active fish prices for dropdown
GET    /api/hasil-tangkap/fish-price/:fishType # Get price info for specific fish
POST   /api/hasil-tangkap/calculate-tax        # Calculate tax before saving
POST   /api/hasil-tangkap                      # Create catch (auto tax calculation)
PUT    /api/hasil-tangkap/:id                  # Update catch (auto recalculate tax)
```

## Workflow

### 1. Setup Fish Prices (Admin)
```javascript
// Create fish price setting
POST /api/fish-prices
{
  "fishType": "tuna",
  "pricePerKg": 25000,
  "taxPercentage": 12.5,
  "isActive": true
}
```

### 2. Input Hasil Tangkap
```javascript
// Create catch report - tax calculated automatically
POST /api/hasil-tangkap
{
  "kapalId": 1,
  "jenisIkan": "tuna",
  "beratKg": 50,
  "hargaPerKg": 25000,  // Optional, will use configured price if not provided
  "lokasi": {"lat": -6.1, "lng": 106.8},
  "tanggalTangkap": "2024-01-15",
  "metodeTangkap": "Pancing"
}

// Response includes tax calculation
{
  "success": true,
  "data": {
    "id": 123,
    "jenisIkan": "tuna",
    "beratKg": 50,
    "hargaPerKg": 25000,
    "totalHarga": 1250000,
    "taxPercentage": 12.5,
    "taxAmount": 156250,
    "netValue": 1093750
  },
  "taxInfo": {
    "priceConfigured": true,
    "message": "Fish price found"
  }
}
```

### 3. Preview Tax Calculation
```javascript
// Calculate tax before saving
POST /api/hasil-tangkap/calculate-tax
{
  "fishType": "tuna",
  "weightKg": 50,
  "pricePerKg": 25000
}

// Response
{
  "success": true,
  "data": {
    "fishType": "tuna",
    "weightKg": 50,
    "pricePerKg": 25000,
    "totalValue": 1250000,
    "taxPercentage": 12.5,
    "taxAmount": 156250,
    "netValue": 1093750,
    "priceConfigured": true
  }
}
```

## Frontend Integration

### 1. Fish Price Dropdown
```javascript
// Get active fish prices for dropdown
const response = await fetch('/api/hasil-tangkap/fish-prices');
const { data: fishPrices } = await response.json();

// Use in select options
fishPrices.forEach(fish => {
  console.log(`${fish.fishType}: Rp ${fish.pricePerKg}/kg (Pajak: ${fish.taxPercentage}%)`);
});
```

### 2. Real-time Tax Calculation
```javascript
// Calculate tax when user changes fish type or weight
async function calculateTax(fishType, weightKg, customPrice = null) {
  const response = await fetch('/api/hasil-tangkap/calculate-tax', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fishType,
      weightKg,
      pricePerKg: customPrice
    })
  });
  
  const result = await response.json();
  
  // Update UI with calculated values
  document.getElementById('totalValue').textContent = result.data.totalValue;
  document.getElementById('taxAmount').textContent = result.data.taxAmount;
  document.getElementById('netValue').textContent = result.data.netValue;
}
```

### 3. Auto-complete Fish Type
```javascript
// Get fish price info when user types fish name
async function getFishPriceInfo(fishType) {
  const response = await fetch(`/api/hasil-tangkap/fish-price/${encodeURIComponent(fishType)}`);
  const { data } = await response.json();
  
  if (data.found) {
    // Auto-fill price and show tax percentage
    document.getElementById('pricePerKg').value = data.pricePerKg;
    document.getElementById('taxInfo').textContent = `Pajak: ${data.taxPercentage}%`;
  }
}
```

## Migration

Jalankan migrasi untuk menambahkan kolom pajak:

```bash
cd backend
node migrateTaxColumns.js
```

## Testing

### 1. Test Fish Price CRUD
```bash
# Create fish price
curl -X POST http://localhost:5000/api/fish-prices \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fishType":"tuna","pricePerKg":25000,"taxPercentage":12.5}'

# Get fish prices
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/hasil-tangkap/fish-prices
```

### 2. Test Tax Calculation
```bash
# Calculate tax
curl -X POST http://localhost:5000/api/hasil-tangkap/calculate-tax \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fishType":"tuna","weightKg":50,"pricePerKg":25000}'
```

### 3. Test Catch Report with Auto Tax
```bash
# Create catch report
curl -X POST http://localhost:5000/api/hasil-tangkap \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kapalId": 1,
    "jenisIkan": "tuna",
    "beratKg": 50,
    "lokasi": {"lat": -6.1, "lng": 106.8}
  }'
```

## Benefits

1. **Konsistensi Pajak**: Pajak dihitung otomatis berdasarkan aturan yang ditetapkan
2. **Fleksibilitas**: Admin bisa mengatur pajak per jenis ikan
3. **Transparansi**: User melihat breakdown pajak secara detail
4. **Akurasi**: Mengurangi kesalahan perhitungan manual
5. **Audit Trail**: Semua perhitungan pajak tersimpan di database

## Security Features

- ✅ CSRF Protection untuk fish price management
- ✅ Role-based access (admin only untuk pengaturan)
- ✅ Input validation dan sanitization
- ✅ SQL injection prevention
- ✅ Data normalization