# 🔧 Troubleshooting - Statistik & Grafik Tidak Muncul

## 🐛 Masalah yang Ditemukan

### 1. **Statistik menampilkan angka 0**

- **Penyebab**: Filter tanggal tidak menemukan data yang sesuai
- **Solusi**: Sudah ditambahkan debug log untuk tracking

### 2. **Grafik tidak menampilkan data**

- **Penyebab**: Data tangkapan memiliki tanggal di bulan/tahun berbeda
- **Solusi**: Debug log akan menunjukkan tanggal sebenarnya

## 🔍 Cara Debug

### Langkah 1: Jalankan Aplikasi

```bash
flutter run
```

### Langkah 2: Buka Beranda

Perhatikan log di console/terminal

### Langkah 3: Cek Log Output

**Log yang harus muncul:**

```
🔍 [CatchProvider] Fetching catches from API...
✅ [CatchService] Response: 200
📊 [CatchService] Found X catches
🐟 [Catch #1] Tuna - Kapal ABC (50.0kg)
✅ [CatchProvider] Loaded X catches
   [0] Tuna - 50.0kg - Date: 2025-01-15 00:00:00.000
📊 [CatchProvider] Total weight: 150.0 kg
📊 [CatchProvider] Total revenue: Rp 5000000

🔍 [Stats Debug] Total catches in provider: X
🔍 [Stats Debug] Current date: 2025-1-20
🔍 [Stats Debug] View mode: Monthly
🔍 [Catch 0] Date: 2025-1-15, Weight: 50.0kg
🔍 [Stats Debug] Filtered catches: X
📊 [Home Stats Monthly]:
   Catches: X
   Total Weight: 150.0 kg
   Total Revenue: Rp 5000000
```

## ✅ Solusi Berdasarkan Log

### Jika `Filtered catches: 0` tapi `Total catches: X`

**Masalah**: Tanggal data tidak sesuai dengan bulan/tahun sekarang

**Solusi 1 - Ubah ke View Tahunan:**

- Tap tombol "Tahunan" di grafik
- Ini akan menampilkan semua data tahun ini

**Solusi 2 - Tambah Data Baru:**

- Buat tangkapan baru dengan tanggal hari ini
- Data akan muncul di statistik bulanan

**Solusi 3 - Ubah Filter (Developer):**

```dart
// Di home_screen.dart, ubah filter menjadi:
final filteredCatches = provider.catches; // Tampilkan semua data
```

### Jika `Total catches: 0`

**Masalah**: Data tidak berhasil di-fetch dari API

**Cek:**

1. Koneksi internet
2. Token auth masih valid
3. API endpoint berfungsi

**Solusi:**

```bash
# Test API manual
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://192.168.1.18:5000/api/mobile/catches
```

## 📝 Penjelasan Filter

### Filter Bulanan (Monthly)

```dart
// Hanya menampilkan data bulan & tahun sekarang
catchDate.year == now.year && catchDate.month == now.month
```

**Contoh:**

- Sekarang: 20 Januari 2025
- Data ditampilkan: Semua tangkapan di Januari 2025
- Data tidak ditampilkan: Tangkapan di Desember 2024 atau Februari 2025

### Filter Tahunan (Yearly)

```dart
// Hanya menampilkan data tahun sekarang
catchDate.year == now.year
```

**Contoh:**

- Sekarang: 2025
- Data ditampilkan: Semua tangkapan di 2025
- Data tidak ditampilkan: Tangkapan di 2024

## 🎯 Quick Fix

Jika ingin menampilkan **SEMUA data** tanpa filter:

**File**: `lib/screens/home_screen.dart`

**Ubah fungsi `_buildStatisticsCards()`:**

```dart
Widget _buildStatisticsCards() {
  final provider = Provider.of<CatchProvider>(context);

  // TAMPILKAN SEMUA DATA (tanpa filter)
  final filteredCatches = provider.catches;

  // ... rest of code
}
```

**Ubah fungsi `_getMonthlyData()`:**

```dart
List<Map<String, dynamic>> _getMonthlyData(CatchProvider provider) {
  // TAMPILKAN SEMUA DATA di grafik
  final allWeight = provider.catches.fold<double>(0, (sum, c) => sum + c.weight);

  return [
    {'day': 'All', 'weight': allWeight}
  ];
}
```

## 🔄 Refresh Data

Untuk memastikan data terbaru:

1. **Pull to Refresh**: Tarik layar ke bawah di beranda
2. **Restart App**: Tutup dan buka aplikasi lagi
3. **Clear Cache**:
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

## 📞 Bantuan Lebih Lanjut

Jika masih bermasalah, kirim log lengkap dari console saat membuka beranda.
