# 🚢 Alur Lengkap Notifikasi Nahkoda

## 📋 Overview
Dokumentasi lengkap alur notifikasi dan proses trip untuk role Nahkoda dari awal hingga akhir.

---

## 🎯 ALUR LENGKAP NAHKODA

### **FASE 1: Penerimaan Tugas Baru**

#### 1.1 Admin Assign Trip
- Admin membuat trip baru di sistem
- Nahkoda ditugaskan sebagai kapten kapal
- Status trip: `menunggu_dokumen`

#### 1.2 Notifikasi Tugas Baru 📱
**Trigger**: Admin assign trip
**Kondisi**:
- ✅ Tidak ada trip aktif sebelumnya
- ✅ User ID nahkoda sesuai dengan trip
- ✅ Notifikasi belum dibaca

**Notifikasi**:
```
📋 Tugas Baru
Anda ditugaskan sebagai nahkoda untuk trip "[Nama Trip]"
Berangkat: [Tanggal]
```

**Action**: Nahkoda buka app → Lihat di "Jadwal Tugas Saya"

---

### **FASE 2: Persiapan Trip**

#### 2.1 Upload Dokumen Perizinan (Nahkoda)
**Screen**: `PreTripForm`
**Dokumen yang diupload**:
1. ✅ Izin Melaut (dari admin via email)
2. ✅ Dokumen Kapal
3. ✅ Asuransi

**Button**: "LOCK DATA"
- Setelah semua dokumen dipilih
- Klik LOCK → Data terkunci
- Tidak bisa diubah lagi

#### 2.2 Upload Data BBM & Es (Crew)
**Screen**: `PreTripForm` (Crew Section)
**Catatan**: Crew yang mengisi data operasional
- Crew upload data BBM (liter)
- Crew upload data Es (kg)
- Status: Data tersimpan
- Crew klik "SIMPAN DATA"

**Proses Paralel**:
- Nahkoda: Upload dokumen perizinan
- Crew: Upload BBM & Es
- Keduanya bisa dilakukan bersamaan

#### 2.3 Kirim Perizinan ke Admin (Nahkoda)
**Screen**: `PreTrackingScreenSimple`
- Nahkoda review semua data (dokumen + BBM/Es dari crew)
- Klik button "KIRIM"
- Status trip berubah: `menunggu_izin`

**Navigasi**: Auto redirect ke `WaitingApprovalScreen`

---

### **FASE 3: Menunggu Persetujuan Admin**

#### 3.1 Waiting Approval Screen
**Screen**: `WaitingApprovalScreen`
- Tampilan: Loading animation
- Pesan: "Menunggu persetujuan admin..."
- Sistem polling setiap 3 detik cek status trip

#### 3.2 Admin Approve Trip
**Backend**: Admin review & approve di dashboard
- Status trip berubah: `disetujui`

#### 3.3 Auto Redirect
**Trigger**: Status berubah jadi `disetujui`
- Polling detect perubahan status
- Auto navigate ke `WaitingScheduleScreen`

---

### **FASE 4: Menunggu Waktu Keberangkatan**

#### 4.1 Waiting Schedule Screen
**Screen**: `WaitingScheduleScreen`
- Tampil countdown timer
- Tampil info kapal, nahkoda, crew
- Badge: "Role: Nahkoda • Nama: [Nama]"

#### 4.2 Notifikasi 1 Hari Sebelum 📱
**Trigger**: 24 jam sebelum departure
**Notifikasi**:
```
⏰ Persiapan Trip
Trip akan dimulai dalam 1 hari!
Kapal [Nama Kapal] akan berangkat besok.
```

**Dialog Popup**:
- Judul: "⏰ Persiapan Trip"
- Pesan: "Trip akan dimulai dalam 1 hari!"
- Button: "Nanti Saja" | "Lihat Countdown"

#### 4.3 Akses Tracking Lebih Awal
**Fitur Khusus Nahkoda**:
- ✅ Bisa akses tracking 1 hari (24 jam) sebelum departure
- ✅ Bisa cek kondisi cuaca
- ✅ Bisa lihat peta zona

---

### **FASE 5: Waktu Keberangkatan Tiba**

#### 5.1 Notifikasi Start 📱
**Trigger**: Countdown = 0 (waktu departure tiba)
**Notifikasi**:
```
🚢 Waktu Keberangkatan!
Trip "[Nama Trip]" dimulai sekarang!
Mulai tracking dan pastikan semua crew sudah siap.
```

#### 5.2 Cek Cuaca Otomatis
**Sistem**:
- Auto cek kondisi cuaca saat ini
- Jika cuaca ekstrem → Tampil warning dialog
- Jika cuaca aman → Lanjut ke tracking

**Dialog Cuaca Ekstrem**:
```
⚠️ Cuaca Tidak Aman
• Kondisi: [Kondisi]
• Kecepatan Angin: [Speed] km/h
• Tinggi Ombak: [Height] m

Demi keselamatan, disarankan untuk menunda trip.
```
- Button: "Tunda Trip" | "Tetap Lanjutkan"

#### 5.3 Auto Navigate ke Tracking
**Screen**: `ActiveTrackingScreen`
- Status trip berubah: `berlayar`
- Tracking GPS aktif
- Monitoring zona dimulai

---

### **FASE 6: Tracking Aktif**

#### 6.1 Active Tracking Screen
**Fitur**:
- 🗺️ Real-time GPS tracking
- 🌊 Monitoring zona perairan
- 🌤️ Info cuaca real-time (update tiap 5 menit)
- ⛽ Monitoring BBM (konsumsi 5L/jam)
- 🧊 Info kapasitas es
- 📊 Statistik trip (durasi, jarak)

**Badge Header**:
```
Role: Nahkoda • Nama: [Nama Nahkoda]
```

#### 6.2 Notifikasi Pelanggaran Zona 🚨
**Trigger**: Kapal keluar dari zona aman
**Alarm**: Bunyi alarm otomatis
**Dialog**:
```
🚨 PELANGGARAN ZONA!
Kapal berada di zona: [Nama Zona]
Status: [Status Zona]
Jarak dari pelabuhan: [Distance] km
```

#### 6.3 Notifikasi BBM Rendah ⚠️
**Trigger**: BBM < 20%
**Notifikasi**:
```
⚠️ BBM Rendah
BBM Tinggal [Jumlah] L ([Persentase]%)
```

#### 6.4 Button Emergency 🆘
**Fitur**: Kirim sinyal darurat ke admin
- Lokasi GPS real-time
- Pesan: "DARURAT - Kapal membutuhkan bantuan segera!"

---

### **FASE 7: Akhiri Trip**

#### 7.1 Stop Tracking
**Button**: "Akhiri Trip"
**Dialog Konfirmasi**:
```
Akhiri Trip?
• Durasi trip: [Durasi]
• Estimasi awal: [Estimasi] hari
⚠️ Trip berakhir lebih cepat dari estimasi (jika applicable)

Apakah Anda yakin ingin mengakhiri tracking?
```
- Button: "Batal" | "Akhiri Trip"

#### 7.2 Trip Summary
**Data yang disimpan**:
- ✅ Waktu keberangkatan & kedatangan
- ✅ Durasi trip aktual
- ✅ BBM awal & tersisa
- ✅ BBM terpakai
- ✅ Posisi akhir
- ✅ Status pelanggaran zona
- ✅ Catatan trip

#### 7.3 Status Trip
- Status berubah: `selesai`
- Data trip tersimpan di database
- Riwayat trip bisa dilihat di "Riwayat Trip"

---

## 📊 TIMELINE NOTIFIKASI NAHKODA

```
T-0 (Admin Assign)
    ↓
📱 Notif: Tugas Baru (Nahkoda & Crew)
    ↓
[Proses Paralel]
    ↓
Nahkoda: Upload Dokumen (Izin, Dokumen Kapal, Asuransi)
Crew: Upload BBM & Es
    ↓
Nahkoda: Klik "KIRIM"
    ↓
Status: menunggu_izin
    ↓
⏳ Waiting Approval (polling)
    ↓
Admin Approve
    ↓
Status: disetujui
    ↓
Auto → Waiting Schedule
    ↓
T-24 jam
    ↓
📱 Notif: 1 Hari Sebelum (Nahkoda)
    ↓
Countdown Timer
    ↓
T-0 (Departure Time)
    ↓
📱 Notif: Waktu Keberangkatan (Nahkoda)
    ↓
Cek Cuaca
    ↓
Status: berlayar
    ↓
📱 Notif: Trip Berlayar (Crew)
    ↓
🗺️ Tracking Aktif (Nahkoda & Crew)
    ↓
[Monitoring Real-time]
    ↓
Akhiri Trip
    ↓
Status: selesai
```

---

## 🔔 RINGKASAN NOTIFIKASI NAHKODA

| No | Notifikasi | Timing | Kondisi |
|----|-----------|--------|---------|
| 1 | 📋 Tugas Baru | Saat assign | Tidak ada trip aktif |
| 2 | ⏰ 1 Hari Sebelum | T-24 jam | Status disetujui |
| 3 | 🚢 Waktu Keberangkatan | T-0 | Countdown selesai |
| 4 | 🚨 Pelanggaran Zona | Real-time | Keluar zona aman |
| 5 | ⚠️ BBM Rendah | Real-time | BBM < 20% |

---

## 🎯 PERBEDAAN NAHKODA vs CREW

| Fitur | Nahkoda | Crew |
|-------|---------|------|
| Notif Tugas Baru | ✅ Ya | ✅ Ya |
| Notif 1 Hari Sebelum | ✅ Ya | ❌ Tidak |
| Notif Departure | ✅ Ya | ❌ Tidak |
| Notif Berlayar | ❌ Tidak | ✅ Ya |
| Akses Tracking | 1 hari sebelum | Saat berlayar |
| Upload BBM & Es | ❌ Tidak | ✅ Ya |
| Upload Dokumen Perizinan | ✅ Ya (Izin, Dokumen, Asuransi) | ❌ Tidak |
| Button "KIRIM" | ✅ Ya | ❌ Tidak |
| Button "LOCK DATA" | ✅ Ya | ❌ Tidak |
| Button "SIMPAN DATA" | ❌ Tidak | ✅ Ya |
| Waiting Approval | ✅ Ya | ✅ Ya (polling) |
| Emergency Button | ✅ Ya | ✅ Ya |
| Catch Button | ❌ Tidak | ✅ Ya |

---

## 🔐 VALIDASI & KEAMANAN

### User ID Validation
```dart
// Semua notifikasi difilter by user ID
final myNotifications = notifications.where((n) {
  final recipientId = n['userId'] ?? n['recipientId'];
  return recipientId == currentUserId;
}).toList();
```

### Trip Aktif Check
```dart
// Blokir notifikasi jika ada trip aktif
final hasActive = allTrips.any((trip) {
  final isMyTrip = (nahkodaId == currentUserId);
  return isMyTrip && (status == 'aktif' || status == 'berlayar' || status == 'disetujui');
});

if (!hasActive) {
  // Tampilkan notifikasi
}
```

### Role-Based Access
```dart
// Nahkoda bisa akses 1 hari sebelum
if (role == 'nahkoda') {
  final bufferTime = departureDate.subtract(Duration(hours: 24));
  if (now.isAfter(bufferTime)) {
    // Allow access
  }
}
```

---

## 📱 SCREEN FLOW NAHKODA

```
1. MySchedulesScreen (Jadwal Tugas)
        ↓
2. MyTripsScreen (Detail Trip)
        ↓
3. PreTripForm (Upload BBM, Es, Dokumen)
        ↓
4. PreTrackingScreenSimple (Review & Kirim)
        ↓
5. WaitingApprovalScreen (Menunggu Admin)
        ↓
6. WaitingScheduleScreen (Countdown)
        ↓
7. ActiveTrackingScreen (Tracking Aktif)
        ↓
8. Trip Summary (Selesai)
```

---

## ✅ CHECKLIST NAHKODA

### Persiapan
- [ ] Terima notifikasi tugas baru
- [ ] Buka jadwal tugas
- [ ] Upload Izin Melaut
- [ ] Upload Dokumen Kapal
- [ ] Upload Asuransi
- [ ] Klik "LOCK DATA"
- [ ] Tunggu crew upload BBM & Es
- [ ] Review semua data
- [ ] Klik "KIRIM"

### Menunggu
- [ ] Tunggu approval admin
- [ ] Terima notifikasi 1 hari sebelum
- [ ] Cek countdown timer
- [ ] Cek kondisi cuaca

### Tracking
- [ ] Mulai tracking saat waktu tiba
- [ ] Monitor GPS real-time
- [ ] Monitor zona perairan
- [ ] Monitor BBM & Es
- [ ] Catat tangkapan (jika ada)
- [ ] Akhiri trip saat selesai

---

## 🎯 KESIMPULAN

Nahkoda memiliki kontrol penuh atas trip:
1. ✅ Upload dokumen perizinan (Izin, Dokumen Kapal, Asuransi)
2. ✅ Crew upload data operasional (BBM & Es)
3. ✅ Kirim perizinan ke admin
4. ✅ Akses tracking lebih awal (1 hari sebelum)
5. ✅ Menerima semua notifikasi penting
6. ✅ Monitoring real-time selama trip
7. ✅ Kontrol penuh untuk akhiri trip

**Pembagian Tugas**:
- **Nahkoda**: Dokumen perizinan & kirim ke admin
- **Crew**: Data operasional (BBM & Es)
- **Keduanya**: Bisa dilakukan paralel untuk efisiensi

**Crew mengikuti nahkoda dan hanya bisa akses tracking saat status "berlayar"**
