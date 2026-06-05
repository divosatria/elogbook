# Fitur: Input Data Sensor IoT

## ✨ Fitur Baru

Menambahkan **input data sensor IoT** di form tangkapan untuk data dari alat sensor.

## 📋 Field IoT yang Ditambahkan

1. **Suhu (°C)** - Temperature sensor
2. **pH** - pH sensor  
3. **Salinitas (ppt)** - Salinity sensor
4. **Oksigen (mg/L)** - Oxygen sensor

## 🎯 Cara Kerja

### 1. User Input Data
- Buka form tangkapan
- Scroll ke section **"Data Sensor IoT (Opsional)"**
- Isi data dari alat sensor (jika ada)

### 2. Submit Data
- Jika ada data IoT → Kirim ke endpoint IoT
- Data tangkapan tetap masuk backend
- IoT bersifat **optional** (tidak wajib)

## 📝 Perubahan File

File: `lib/screens/crew/screens/create_catch_screen.dart`

### Controllers Baru:
```dart
final _iotTemperatureController = TextEditingController();
final _iotPhController = TextEditingController();
final _iotSalinityController = TextEditingController();
final _iotOxygenController = TextEditingController();
```

### UI Section Baru:
```dart
Widget _buildIoTSensorSection() {
  // 4 input fields untuk data sensor
  // - Suhu, pH, Salinitas, Oksigen
}
```

### Submit Logic:
```dart
// Jika ada data IoT, kirim ke endpoint
if (ada_data_iot) {
  IoTService.sendToIoT(iotData);
}
// Tetap lanjut submit tangkapan
```

## 🔧 Endpoint IoT

**POST** `/api/mobile/iot/input`

Request Body:
```json
{
  "fish_name": "Ikan Kembung",
  "kapalId": 8,
  "tripId": 62,
  "temperature": 28.5,
  "ph": 7.2,
  "salinity": 35.0,
  "oxygen": 6.5,
  "timestamp": "2026-02-18T11:50:59.633440"
}
```

## ✅ Keuntungan

- ✅ Data sensor terintegrasi dengan tangkapan
- ✅ Optional - tidak wajib diisi
- ✅ Tidak blocking submit jika IoT gagal
- ✅ UI user-friendly dengan icon yang jelas

## 📊 Testing

1. **Tanpa data IoT** → Submit sukses ✅
2. **Dengan data IoT lengkap** → Submit + IoT sukses ✅
3. **Data IoT partial** → Submit sukses, IoT kirim yang ada ✅
4. **IoT endpoint error** → Submit tetap sukses ✅
