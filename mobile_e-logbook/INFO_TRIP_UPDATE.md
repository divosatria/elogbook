# Info Trip - Update Feature

## 📋 Perubahan

**Info Trip** sekarang menampilkan **SEMUA trip** (aktif & selesai) dengan tab navigation, bukan hanya trip aktif saja.

## ✨ Fitur Baru

### 1. **Tab Navigation**
- **Tab "Aktif"**: Menampilkan trip yang sedang berjalan
  - Status: menunggu_dokumen, menunggu_izin, siap_berangkat, berlayar
- **Tab "Selesai"**: Menampilkan trip yang sudah selesai
  - Status: selesai

### 2. **Counter Badge**
- Setiap tab menampilkan jumlah trip
- Contoh: "Aktif (2)" atau "Selesai (5)"

### 3. **Visual Differentiation**
- **Trip Aktif**: Header gradient biru
- **Trip Selesai**: Header gradient abu-abu
- Icon berbeda (boat vs check circle)

### 4. **Informasi Lengkap**
Setiap card menampilkan:
- Nama kapal & nomor registrasi
- Status trip (color coded)
- Tanggal berangkat & estimasi pulang
- Durasi trip (hari)
- Area tangkap
- Jumlah crew
- Target ikan & estimasi berat
- Nahkoda (untuk crew)

### 5. **Action Button**
- Tombol "Lanjut ke Persiapan Trip" **HANYA** muncul di trip aktif
- Trip selesai tidak ada action button

## 📁 Files Modified

### Nahkoda
- `lib/screens/nahkoda/my_trips_screen.dart`
  - Tambah TabController
  - Split trips ke active & completed
  - Tambah tab bar di AppBar
  - Update UI untuk differentiate active vs completed

### Crew
- `lib/screens/crew/screens/crew_my_trips_screen.dart`
  - Sama seperti Nahkoda
  - Filter berdasarkan awakKapal (crew list)

## 🎨 UI Changes

### Before
```
Info Trip
├── List semua trip aktif (1 trip)
└── Tombol "Lanjut ke Persiapan Trip"
```

### After
```
Info Trip
├── Tab: Aktif (2) | Selesai (5)
├── Tab Content:
│   ├── Aktif: Trip dengan status aktif
│   │   └── Tombol "Lanjut ke Persiapan Trip"
│   └── Selesai: Trip dengan status selesai
│       └── Tidak ada action button
```

## 🔄 Data Flow

1. **Load All Trips**
   ```dart
   TripService.getAllTrips()
   ```

2. **Filter by User**
   - Nahkoda: `nahkodaId == currentUserId`
   - Crew: `awakKapal.contains(currentUserId)`

3. **Split by Status**
   ```dart
   Active: status != 'selesai' && status != 'ditolak'
   Completed: status == 'selesai'
   ```

4. **Sort by Date**
   ```dart
   trips.sort((a, b) => b.tanggalBerangkat.compareTo(a.tanggalBerangkat))
   ```

## 🎯 Status Color Coding

| Status | Color | Badge |
|--------|-------|-------|
| menunggu_dokumen | 🟠 Orange | Menunggu Dokumen |
| menunggu_izin | 🟡 Amber | Menunggu Izin |
| siap_berangkat | 🔵 Blue | Siap Berangkat |
| berlayar | 🟢 Green | Berlayar |
| selesai | 🟢 Teal | Selesai |
| ditolak | 🔴 Red | Ditolak |

## 📱 Usage

1. Buka **"Info Trip"** dari menu
2. Lihat tab **"Aktif"** untuk trip yang sedang berjalan
3. Lihat tab **"Selesai"** untuk riwayat trip
4. Pull down untuk refresh data
5. Klik tombol "Lanjut ke Persiapan Trip" (hanya di trip aktif)

## ⚡ Performance

- **Efficient Rendering**: ListView.builder
- **Smart Filtering**: Filter di client side
- **Sorted Data**: Pre-sorted untuk performa optimal
- **Pull to Refresh**: Manual refresh untuk update

## 🎯 Benefits

✅ **Satu halaman** untuk semua trip (aktif & selesai)
✅ **Mudah switch** antara aktif dan selesai
✅ **Visual clear** dengan color coding
✅ **Informasi lengkap** di setiap card
✅ **Action button** hanya di trip aktif
✅ **Responsive** untuk mobile & tablet

## 📝 Notes

- Trip dengan status "ditolak" tidak ditampilkan
- Hanya trip yang relevan dengan user yang ditampilkan
- Date format: Indonesian locale (dd MMM yyyy)
- Empty state berbeda untuk aktif vs selesai
