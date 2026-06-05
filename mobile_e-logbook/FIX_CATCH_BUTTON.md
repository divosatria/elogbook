# Fix: Tombol Tangkapan Tidak Muncul

## Masalah
Tombol tangkapan (catch button) tidak muncul di layar tracking untuk role ABK/Crew.

## Penyebab
Kondisi untuk menampilkan tombol menggunakan pengecekan spesifik:
```dart
if (widget.userRole.toLowerCase() == 'abk' || widget.userRole.toLowerCase() == 'crew')
```

Masalahnya:
- Role dari backend bisa bervariasi: "ABK", "Crew", "Awak Kapal", dll
- Kondisi terlalu spesifik hanya untuk 'abk' atau 'crew'
- Tidak fleksibel untuk variasi nama role

## Solusi
Ubah logika menjadi: **Tampilkan tombol untuk SEMUA role KECUALI Nahkoda**

```dart
if (widget.userRole.toLowerCase() != 'nahkoda')
```

### Keuntungan:
✅ Lebih fleksibel - tidak peduli nama role ABK/Crew
✅ Lebih sederhana - hanya 1 kondisi
✅ Lebih maintainable - tidak perlu update jika ada role baru
✅ Sesuai business logic: Nahkoda tidak input tangkapan, yang lain bisa

## File yang Diubah
- `lib/screens/tracking/active_tracking_screen.dart`
  - Baris ~1009: Kondisi tampilkan tombol
  - Baris ~1000: Debug log

## Testing
1. Login sebagai Nahkoda → Tombol tangkapan TIDAK muncul ✅
2. Login sebagai ABK/Crew → Tombol tangkapan MUNCUL ✅
3. Login sebagai role lain (bukan Nahkoda) → Tombol tangkapan MUNCUL ✅

## Log Debug
Sebelum fix:
```
🎭 [ActiveTracking] widget.userRole: "Nahkoda"
🎭 [ActiveTracking] Show catch button: false
```

Setelah fix:
```
🎭 [ActiveTracking] widget.userRole: "Nahkoda"
🎭 [ActiveTracking] widget.userRole.toLowerCase(): "nahkoda"
🎭 [ActiveTracking] Show catch button: false  // Correct untuk Nahkoda

🎭 [ActiveTracking] widget.userRole: "ABK"
🎭 [ActiveTracking] widget.userRole.toLowerCase(): "abk"
🎭 [ActiveTracking] Show catch button: true   // Correct untuk ABK
```

## Catatan
- Perubahan ini tidak mempengaruhi fitur lain
- Backward compatible dengan data existing
- Tidak perlu migration database
