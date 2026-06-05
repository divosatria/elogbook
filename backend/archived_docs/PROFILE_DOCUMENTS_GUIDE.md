# 📄 DOKUMEN PROFILE - E-LOGBOOK MOBILE

## 📋 Jenis Dokumen yang Harus Diupload

### ✅ Dokumen Wajib (Required)
1. **KTP** - Kartu Tanda Penduduk
2. **Buku Pelaut** - Seaman Book (dokumen identitas pelaut)
3. **Sertifikat Nahkoda** - Sesuai jenis kapal yang dikemudikan
4. **BST** - Basic Safety Training (sertifikat keselamatan dasar)
5. **Surat Keterangan Sehat** - Medical Check Up (MCU)

### 📝 Dokumen Tambahan (Optional tapi Recommended)
6. **SKCK** - Surat Keterangan Catatan Kepolisian
7. **Pas Foto** - Foto formal ukuran 4x6
8. **NPWP** - Nomor Pokok Wajib Pajak (sering diminta perusahaan)

---

## 🎯 Endpoint Upload

```http
POST /api/mobile/profile/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

dokumen: [FILE]
jenisDokumen: "KTP"
nomorDokumen: "3201234567890123"
tanggalBerlaku: "2030-12-31"
keterangan: "KTP Asli"
```

---

## 📱 Flutter Implementation

### Enum untuk Jenis Dokumen
```dart
enum JenisDokumen {
  ktp('KTP'),
  bukuPelaut('Buku Pelaut'),
  sertifikatNahkoda('Sertifikat Nahkoda'),
  bst('BST'),
  suratKeteranganSehat('Surat Keterangan Sehat'),
  skck('SKCK'),
  pasFoto('Pas Foto'),
  npwp('NPWP');

  final String value;
  const JenisDokumen(this.value);
}
```

### Upload Function
```dart
Future<void> uploadProfileDocument({
  required File file,
  required JenisDokumen jenisDokumen,
  required String nomorDokumen,
  DateTime? tanggalBerlaku,
  String? keterangan,
}) async {
  FormData formData = FormData.fromMap({
    'dokumen': await MultipartFile.fromFile(
      file.path,
      filename: file.path.split('/').last,
    ),
    'jenisDokumen': jenisDokumen.value,
    'nomorDokumen': nomorDokumen,
    if (tanggalBerlaku != null) 
      'tanggalBerlaku': tanggalBerlaku.toIso8601String(),
    if (keterangan != null) 
      'keterangan': keterangan,
  });

  final response = await dio.post(
    '${ApiConfig.mobileUrl}/profile/documents',
    data: formData,
  );
  
  if (!response.data['success']) {
    throw Exception(response.data['message']);
  }
}
```

---

## 📊 Contoh Data

### 1. KTP
```dart
await uploadProfileDocument(
  file: ktpFile,
  jenisDokumen: JenisDokumen.ktp,
  nomorDokumen: '3201234567890123',
  tanggalBerlaku: DateTime(2030, 12, 31),
  keterangan: 'KTP Asli',
);
```

### 2. Buku Pelaut
```dart
await uploadProfileDocument(
  file: bukuPelautFile,
  jenisDokumen: JenisDokumen.bukuPelaut,
  nomorDokumen: 'BP-001-2024',
  tanggalBerlaku: DateTime(2029, 12, 31),
  keterangan: 'Buku Pelaut aktif',
);
```

### 3. Sertifikat Nahkoda
```dart
await uploadProfileDocument(
  file: sertifikatFile,
  jenisDokumen: JenisDokumen.sertifikatNahkoda,
  nomorDokumen: 'SN-GT500-2024',
  tanggalBerlaku: DateTime(2029, 6, 30),
  keterangan: 'Sertifikat Nahkoda GT 500',
);
```

### 4. BST (Basic Safety Training)
```dart
await uploadProfileDocument(
  file: bstFile,
  jenisDokumen: JenisDokumen.bst,
  nomorDokumen: 'BST-2024-001',
  tanggalBerlaku: DateTime(2029, 12, 31),
  keterangan: 'BST Certificate',
);
```

### 5. Surat Keterangan Sehat
```dart
await uploadProfileDocument(
  file: mcuFile,
  jenisDokumen: JenisDokumen.suratKeteranganSehat,
  nomorDokumen: 'MCU-2024-001',
  tanggalBerlaku: DateTime(2025, 12, 31),
  keterangan: 'Medical Check Up',
);
```

### 6. SKCK
```dart
await uploadProfileDocument(
  file: skckFile,
  jenisDokumen: JenisDokumen.skck,
  nomorDokumen: 'SKCK-2024-001',
  tanggalBerlaku: DateTime(2025, 12, 31),
  keterangan: 'SKCK dari Polres',
);
```

### 7. Pas Foto
```dart
await uploadProfileDocument(
  file: fotoFile,
  jenisDokumen: JenisDokumen.pasFoto,
  nomorDokumen: 'FOTO-2024',
  keterangan: 'Pas Foto 4x6 latar merah',
);
```

### 8. NPWP
```dart
await uploadProfileDocument(
  file: npwpFile,
  jenisDokumen: JenisDokumen.npwp,
  nomorDokumen: '12.345.678.9-012.000',
  keterangan: 'NPWP Pribadi',
);
```

---

## ✅ Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| dokumen | File | Yes | Max 10MB, JPG/PNG/PDF only |
| jenisDokumen | String | Yes | Must be one of 8 types above |
| nomorDokumen | String | Yes | 3-50 characters |
| tanggalBerlaku | Date | No | Valid ISO8601 date |
| keterangan | String | No | Max 200 characters |

---

## 🎨 UI/UX Recommendations

### Upload Screen Layout
```
┌─────────────────────────────────────┐
│  📄 Upload Dokumen Profile          │
├─────────────────────────────────────┤
│                                     │
│  Jenis Dokumen: [Dropdown]          │
│  ┌─────────────────────────────┐   │
│  │ KTP                         │   │
│  │ Buku Pelaut                 │   │
│  │ Sertifikat Nahkoda          │   │
│  │ BST                         │   │
│  │ Surat Keterangan Sehat      │   │
│  │ SKCK                        │   │
│  │ Pas Foto                    │   │
│  │ NPWP                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Nomor Dokumen: [_______________]   │
│                                     │
│  Tanggal Berlaku: [📅 Pilih]       │
│                                     │
│  Keterangan: [_______________]      │
│                                     │
│  File: [📎 Pilih File]              │
│                                     │
│  [📤 Upload Dokumen]                │
│                                     │
└─────────────────────────────────────┘
```

### Document List Screen
```
┌─────────────────────────────────────┐
│  📋 Dokumen Saya                    │
├─────────────────────────────────────┤
│                                     │
│  ✅ KTP                             │
│     No: 3201234567890123            │
│     Berlaku: 31 Des 2030            │
│     [👁️ Lihat] [🗑️ Hapus]          │
│                                     │
│  ✅ Buku Pelaut                     │
│     No: BP-001-2024                 │
│     Berlaku: 31 Des 2029            │
│     [👁️ Lihat] [🗑️ Hapus]          │
│                                     │
│  ⚠️ Sertifikat Nahkoda              │
│     Belum diupload                  │
│     [➕ Upload]                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔔 Reminder System

### Expiry Notification
```dart
// Check dokumen yang akan expired dalam 30 hari
void checkExpiringDocuments(List<Document> documents) {
  final now = DateTime.now();
  final thirtyDaysLater = now.add(Duration(days: 30));
  
  for (var doc in documents) {
    if (doc.tanggalBerlaku != null) {
      if (doc.tanggalBerlaku!.isBefore(thirtyDaysLater)) {
        // Show notification
        showNotification(
          title: '⚠️ Dokumen akan expired',
          body: '${doc.jenisDokumen} akan expired pada ${doc.tanggalBerlaku}',
        );
      }
    }
  }
}
```

---

## 📞 Support

Jika ada pertanyaan tentang dokumen yang harus diupload:
- Check dengan admin perusahaan
- Lihat requirement di `USER_FLOW_COMPLETE.md`
- Contact backend team

---

**Version**: 2.1.0
**Last Updated**: 2024
**Status**: ✅ READY FOR IMPLEMENTATION
