# 🔒 Fish Price CRUD Security Fixes

## Masalah yang Diperbaiki

### 1. CSRF Protection (Critical)
**Sebelum:**
- Tidak ada proteksi CSRF pada POST/PUT/DELETE
- Rentan terhadap serangan cross-site request forgery

**Sesudah:**
```javascript
// CSRF middleware ditambahkan
router.post('/', csrfProtection, authorize(['admin']), fishPriceController.create);
router.put('/:id', csrfProtection, authorize(['admin']), fishPriceController.update);
router.delete('/:id', csrfProtection, authorize(['admin']), fishPriceController.delete);
```

### 2. Input Validation (High)
**Sebelum:**
```javascript
if (!fishType || !pricePerKg) {
  return res.status(400).json({
    success: false,
    message: 'Fish type and price per kg are required'
  });
}
```

**Sesudah:**
```javascript
// Enhanced validation
if (!fishType || typeof fishType !== 'string' || fishType.trim().length === 0) {
  return res.status(400).json({
    success: false,
    message: 'Fish type is required and must be a valid string'
  });
}

const price = parseFloat(pricePerKg);
if (!pricePerKg || isNaN(price) || price <= 0) {
  return res.status(400).json({
    success: false,
    message: 'Price per kg must be a positive number'
  });
}
```

### 3. Role-Based Authorization
**Sebelum:**
- Semua user authenticated bisa CRUD harga ikan

**Sesudah:**
```javascript
// Hanya admin yang bisa create/update/delete
router.post('/', csrfProtection, authorize(['admin']), fishPriceController.create);
router.put('/:id', csrfProtection, authorize(['admin']), fishPriceController.update);
router.delete('/:id', csrfProtection, authorize(['admin']), fishPriceController.delete);

// Semua user authenticated bisa read
router.get('/', fishPriceController.getAll);
```

### 4. Data Normalization
**Sebelum:**
- fishType bisa duplikat dengan case berbeda ("Tuna" vs "tuna")

**Sesudah:**
```javascript
// Model dengan normalisasi
fishType: {
  type: DataTypes.STRING,
  allowNull: false,
  validate: {
    notEmpty: true,
    len: [1, 100]
  },
  set(value) {
    this.setDataValue('fishType', value ? value.trim().toLowerCase() : value);
  }
}

// Controller dengan normalisasi
fishType: fishType.trim().toLowerCase()
```

### 5. Business Logic Validation
**Sebelum:**
- Tidak ada validasi range untuk tax percentage
- Tidak ada validasi harga negatif

**Sesudah:**
```javascript
// Tax percentage validation
if (taxPercentage !== undefined) {
  tax = parseFloat(taxPercentage);
  if (isNaN(tax) || tax < 0 || tax > 100) {
    return res.status(400).json({
      success: false,
      message: 'Tax percentage must be between 0 and 100'
    });
  }
}

// Price validation
if (isNaN(price) || price <= 0) {
  return res.status(400).json({
    success: false,
    message: 'Price per kg must be a positive number'
  });
}
```

### 6. Update Logic Fix
**Sebelum:**
```javascript
// Response mengembalikan data lama
await fishPrice.update(updateData);
res.json({ success: true, data: fishPrice });
```

**Sesudah:**
```javascript
// Response mengembalikan data terbaru
await fishPrice.update(updateData);
await fishPrice.reload();
res.json({ success: true, data: fishPrice });
```

## Cara Menggunakan CSRF Protection

### 1. Dapatkan CSRF Token
```javascript
// GET /api/csrf-token
const response = await fetch('/api/csrf-token', {
  credentials: 'include'
});
const { csrfToken } = await response.json();
```

### 2. Gunakan Token dalam Request
```javascript
// POST/PUT/DELETE dengan CSRF token
await fetch('/api/fish-prices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

## Testing Security

### 1. Test CSRF Protection
```bash
# Tanpa CSRF token (harus gagal)
curl -X POST http://localhost:5000/api/fish-prices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fishType":"test","pricePerKg":1000}'

# Dengan CSRF token (harus berhasil)
curl -X POST http://localhost:5000/api/fish-prices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"fishType":"test","pricePerKg":1000}'
```

### 2. Test Input Validation
```bash
# Invalid price (harus gagal)
curl -X POST http://localhost:5000/api/fish-prices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"fishType":"test","pricePerKg":-100}'

# Invalid tax (harus gagal)  
curl -X POST http://localhost:5000/api/fish-prices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"fishType":"test","pricePerKg":1000,"taxPercentage":150}'
```

### 3. Test Authorization
```bash
# User non-admin (harus gagal untuk POST/PUT/DELETE)
# User admin (harus berhasil untuk semua operasi)
```

## Status Keamanan Sekarang

- ✅ **Authentication**: JWT token required
- ✅ **CSRF Protection**: Implemented for state-changing operations  
- ✅ **Input Validation**: Enhanced with type checking and range validation
- ✅ **Authorization**: Role-based access control (admin only for CUD)
- ✅ **SQL Injection**: Prevented with Sequelize ORM and validation
- ✅ **Data Integrity**: Normalization and business logic validation
- ✅ **Error Handling**: Proper error responses without sensitive info

## Deployment Notes

1. Pastikan `NODE_ENV=production` untuk CSRF protection
2. Set `ALLOWED_ORIGINS` dengan domain production yang benar
3. Gunakan HTTPS untuk production
4. Monitor logs untuk attempt serangan
5. Regular security audit dengan `npm audit`