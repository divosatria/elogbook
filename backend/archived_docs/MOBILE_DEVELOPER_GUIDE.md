# 📱 PANDUAN LENGKAP API UNTUK MOBILE DEVELOPER

## 🎯 QUICK START (5 Menit)

### Step 1: Setup Base URL
```dart
class ApiConfig {
  static const String baseUrl = 'http://192.168.1.21:5000/api';
  static const String mobileUrl = '$baseUrl/mobile';
}
```

### Step 2: Login
```dart
// POST /api/mobile/login
final response = await dio.post(
  '${ApiConfig.mobileUrl}/login',
  data: {
    'email': 'nahkoda@example.com',
    'password': 'password123'
  }
);

// Simpan token
String token = response.data['token'];
```

### Step 3: Gunakan Token
```dart
// Semua request selanjutnya
dio.options.headers['Authorization'] = 'Bearer $token';
```

**SELESAI!** Sekarang bisa pakai semua endpoint! 🚀

---

## 📋 DAFTAR LENGKAP ENDPOINT

### 🔐 AUTHENTICATION

#### 1. Login
```http
POST /api/mobile/login
Content-Type: application/json

{
  "email": "nahkoda@example.com",
  "password": "password123"
}
```

**Response Success:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "nahkoda1",
    "email": "nahkoda@example.com",
    "role": "nahkoda",
    "profile": {
      "nama": "Kapten Ahmad",
      "telepon": "+62812345678"
    }
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Username atau password salah"
}
```

**Flutter Code:**
```dart
Future<LoginResponse> login(String email, String password) async {
  try {
    final response = await dio.post(
      '${ApiConfig.mobileUrl}/login',
      data: {'email': email, 'password': password},
    );
    
    if (response.data['success']) {
      return LoginResponse.fromJson(response.data);
    }
    throw Exception(response.data['message']);
  } catch (e) {
    throw Exception('Login gagal: $e');
  }
}
```

---

### 📊 DASHBOARD

#### 2. Get Dashboard Data
```http
GET /api/mobile/dashboard
Authorization: Bearer <token>
```

**Response (Nahkoda):**
```json
{
  "success": true,
  "data": {
    "role": "nahkoda",
    "myTrips": 12,
    "activeTrips": 3,
    "pendingTrips": 2,
    "recentTrips": [
      {
        "id": "trip_001",
        "status": "sedang_melaut",
        "kapal": {
          "id": 1,
          "namaKapal": "KM Bahari Jaya"
        },
        "tanggalBerangkat": "2024-01-15T06:00:00Z"
      }
    ]
  }
}
```

**Response (ABK):**
```json
{
  "success": true,
  "data": {
    "role": "abk",
    "myTrips": 8,
    "activeTrips": 1,
    "recentTrips": [...]
  }
}
```

**Flutter Code:**
```dart
Future<DashboardData> getDashboard() async {
  final response = await dio.get('${ApiConfig.mobileUrl}/dashboard');
  return DashboardData.fromJson(response.data['data']);
}
```

---

### 🚢 VESSEL (KAPAL)

#### 3. Upload Sertifikat Jalan
```http
POST /api/mobile/vessel/:kapalId/sertifikat-jalan
Authorization: Bearer <token>
Content-Type: multipart/form-data

sertifikat: [FILE]
nama: "Sertifikat Jalan 2024"
nomorSertifikat: "SJ-001-2024"
tanggalBerlaku: "2025-12-31"
```

**Response:**
```json
{
  "success": true,
  "message": "Sertifikat jalan berhasil diupload",
  "data": {
    "id": "1234567890",
    "nama": "Sertifikat Jalan 2024",
    "nomorSertifikat": "SJ-001-2024",
    "tanggalBerlaku": "2025-12-31T00:00:00.000Z",
    "fileUrl": "/uploads/sertifikat/1/1234567890-abc123.pdf",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Flutter Code:**
```dart
Future<void> uploadSertifikat({
  required int kapalId,
  required File file,
  required String nama,
  required String nomorSertifikat,
  required DateTime tanggalBerlaku,
}) async {
  FormData formData = FormData.fromMap({
    'sertifikat': await MultipartFile.fromFile(
      file.path,
      filename: file.path.split('/').last,
    ),
    'nama': nama,
    'nomorSertifikat': nomorSertifikat,
    'tanggalBerlaku': tanggalBerlaku.toIso8601String(),
  });

  final response = await dio.post(
    '${ApiConfig.mobileUrl}/vessel/$kapalId/sertifikat-jalan',
    data: formData,
  );
  
  if (!response.data['success']) {
    throw Exception(response.data['message']);
  }
}
```

#### 4. Upload Data Bahan Bakar
```http
POST /api/mobile/vessel/:kapalId/bahan-bakar
Authorization: Bearer <token>
Content-Type: multipart/form-data

bukti: [FILE] (optional)
jenisBahanBakar: "Solar"
jumlahLiter: 500
hargaPerLiter: 6500
totalHarga: 3250000
tanggalPengisian: "2024-01-15T08:00:00Z"
lokasiPengisian: "SPBU Pelabuhan Muara Baru"
keterangan: "Pengisian rutin sebelum melaut"
```

**Response:**
```json
{
  "success": true,
  "message": "Data bahan bakar berhasil diupload",
  "data": {
    "id": "1234567891",
    "jenisBahanBakar": "Solar",
    "jumlahLiter": 500,
    "hargaPerLiter": 6500,
    "totalHarga": 3250000,
    "tanggalPengisian": "2024-01-15T08:00:00.000Z",
    "lokasiPengisian": "SPBU Pelabuhan Muara Baru",
    "buktiFileUrl": "/uploads/bahan-bakar/1/1234567891-xyz789.jpg",
    "uploadedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Flutter Code:**
```dart
Future<void> uploadBahanBakar({
  required int kapalId,
  File? buktiFoto,
  required String jenisBahanBakar,
  required double jumlahLiter,
  required double hargaPerLiter,
  required double totalHarga,
  required DateTime tanggalPengisian,
  String? lokasiPengisian,
  String? keterangan,
}) async {
  Map<String, dynamic> data = {
    'jenisBahanBakar': jenisBahanBakar,
    'jumlahLiter': jumlahLiter,
    'hargaPerLiter': hargaPerLiter,
    'totalHarga': totalHarga,
    'tanggalPengisian': tanggalPengisian.toIso8601String(),
    'lokasiPengisian': lokasiPengisian,
    'keterangan': keterangan,
  };

  if (buktiFoto != null) {
    data['bukti'] = await MultipartFile.fromFile(
      buktiFoto.path,
      filename: buktiFoto.path.split('/').last,
    );
  }

  FormData formData = FormData.fromMap(data);

  final response = await dio.post(
    '${ApiConfig.mobileUrl}/vessel/$kapalId/bahan-bakar',
    data: formData,
  );
  
  if (!response.data['success']) {
    throw Exception(response.data['message']);
  }
}
```

#### 5. Get Vessel Documents
```http
GET /api/mobile/vessel/:kapalId/documents
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kapal": {
      "id": 1,
      "namaKapal": "KM Bahari Jaya",
      "nomorRegistrasi": "REG-001-2024"
    },
    "sertifikatJalan": [
      {
        "id": "1234567890",
        "nama": "Sertifikat Jalan 2024",
        "nomorSertifikat": "SJ-001-2024",
        "tanggalBerlaku": "2025-12-31T00:00:00.000Z",
        "fileUrl": "/uploads/sertifikat/1/1234567890-abc123.pdf",
        "uploadedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "dataBahanBakar": [
      {
        "id": "1234567891",
        "jenisBahanBakar": "Solar",
        "jumlahLiter": 500,
        "totalHarga": 3250000,
        "tanggalPengisian": "2024-01-15T08:00:00.000Z"
      }
    ]
  }
}
```

#### 6. Get Fuel Summary
```http
GET /api/mobile/vessel/:kapalId/fuel-summary?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kapal": {
      "id": 1,
      "namaKapal": "KM Bahari Jaya"
    },
    "summary": {
      "totalPengisian": 5,
      "totalLiter": 2500,
      "totalBiaya": 16250000,
      "rataRataHarga": 6500,
      "pengisianTerakhir": {
        "tanggalPengisian": "2024-01-15T08:00:00.000Z",
        "jumlahLiter": 500,
        "totalHarga": 3250000
      }
    },
    "details": [...]
  }
}
```

---

### 📍 LOCATION & GPS

#### 7. Update Location
```http
POST /api/mobile/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "kapalId": 1,
  "lat": -6.2000,
  "lng": 106.8166
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lokasi berhasil diupdate"
}
```

**Flutter Code (Background Location):**
```dart
import 'package:geolocator/geolocator.dart';

class LocationService {
  Timer? _locationTimer;
  
  void startLocationTracking(int kapalId) {
    _locationTimer = Timer.periodic(Duration(minutes: 5), (timer) async {
      Position position = await Geolocator.getCurrentPosition();
      
      await dio.post(
        '${ApiConfig.mobileUrl}/location',
        data: {
          'kapalId': kapalId,
          'lat': position.latitude,
          'lng': position.longitude,
        },
      );
    });
  }
  
  void stopLocationTracking() {
    _locationTimer?.cancel();
  }
}
```

---

### 🆘 EMERGENCY

#### 8. Send SOS
```http
POST /api/mobile/sos
Authorization: Bearer <token>
Content-Type: application/json

{
  "kapalId": 1,
  "location": {
    "lat": -6.2000,
    "lng": 106.8166
  },
  "note": "Engine failure, need immediate assistance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SOS berhasil dikirim",
  "data": {
    "id": "sos_001",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Flutter Code:**
```dart
Future<void> sendSOS({
  required int kapalId,
  required double lat,
  required double lng,
  String? note,
}) async {
  final response = await dio.post(
    '${ApiConfig.mobileUrl}/sos',
    data: {
      'kapalId': kapalId,
      'location': {'lat': lat, 'lng': lng},
      'note': note,
    },
  );
  
  if (!response.data['success']) {
    throw Exception(response.data['message']);
  }
}
```

---

## 🔄 REAL-TIME DENGAN SOCKET.IO

### Setup Socket.IO
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;
  
  void connect() {
    socket = IO.io('http://192.168.1.21:5000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });
    
    socket.connect();
    
    socket.on('connect', (_) {
      print('Connected to Socket.IO');
    });
    
    socket.on('location_update', (data) {
      print('Location update: $data');
    });
    
    socket.on('sos_alert', (data) {
      print('SOS Alert: $data');
      _showSOSNotification(data);
    });
  }
  
  void disconnect() {
    socket.disconnect();
  }
}
```

---

## 🛡️ ERROR HANDLING

### Standard Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Email tidak valid"
    }
  ]
}
```

### Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Cek input data |
| 401 | Unauthorized | Login ulang |
| 403 | Forbidden | Role tidak diizinkan |
| 404 | Not Found | Resource tidak ada |
| 429 | Too Many Requests | Tunggu beberapa menit |
| 500 | Server Error | Coba lagi nanti |

### Flutter Error Handler
```dart
class ApiService {
  Future<T> handleRequest<T>(Future<Response> Function() request) async {
    try {
      final response = await request();
      return response.data as T;
    } on DioError catch (e) {
      if (e.response != null) {
        switch (e.response!.statusCode) {
          case 401:
            // Token expired, redirect to login
            Get.offAllNamed('/login');
            throw Exception('Sesi berakhir, silakan login kembali');
          case 403:
            throw Exception('Akses ditolak');
          case 429:
            throw Exception('Terlalu banyak request, coba lagi nanti');
          default:
            throw Exception(e.response!.data['message'] ?? 'Terjadi kesalahan');
        }
      }
      throw Exception('Koneksi gagal');
    }
  }
}
```

---

## 📦 COMPLETE FLUTTER EXAMPLE

### 1. API Service
```dart
// lib/services/api_service.dart
class ApiService {
  final Dio dio;
  
  ApiService() : dio = Dio() {
    dio.options.baseUrl = ApiConfig.mobileUrl;
    dio.interceptors.add(AuthInterceptor());
  }
  
  // Login
  Future<LoginResponse> login(String email, String password) async {
    final response = await dio.post('/login', data: {
      'email': email,
      'password': password,
    });
    return LoginResponse.fromJson(response.data);
  }
  
  // Dashboard
  Future<DashboardData> getDashboard() async {
    final response = await dio.get('/dashboard');
    return DashboardData.fromJson(response.data['data']);
  }
  
  // Upload Sertifikat
  Future<void> uploadSertifikat(int kapalId, File file, Map<String, dynamic> data) async {
    FormData formData = FormData.fromMap({
      'sertifikat': await MultipartFile.fromFile(file.path),
      ...data,
    });
    await dio.post('/vessel/$kapalId/sertifikat-jalan', data: formData);
  }
}
```

### 2. Auth Interceptor
```dart
// lib/interceptors/auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await TokenService().getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioError err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Redirect to login
      Get.offAllNamed('/login');
    }
    handler.next(err);
  }
}
```

### 3. Models
```dart
// lib/models/login_response.dart
class LoginResponse {
  final bool success;
  final String token;
  final User user;
  
  LoginResponse({
    required this.success,
    required this.token,
    required this.user,
  });
  
  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      success: json['success'],
      token: json['token'],
      user: User.fromJson(json['user']),
    );
  }
}
```

---

## 🧪 TESTING

### Test dengan Postman
1. Import collection dari `/api-docs.json`
2. Set environment variable `baseUrl` = `http://192.168.1.21:5000/api`
3. Login untuk dapat token
4. Set token di Authorization header

### Test dengan cURL
```bash
# Login
curl -X POST http://192.168.1.21:5000/api/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nahkoda@example.com","password":"password123"}'

# Get Dashboard (ganti TOKEN)
curl -X GET http://192.168.1.21:5000/api/mobile/dashboard \
  -H "Authorization: Bearer TOKEN"
```

---

## 📚 RESOURCES

- **Swagger UI**: http://192.168.1.21:5000/api-docs
- **Health Check**: http://192.168.1.21:5000/health
- **Backend Repo**: [Link to repo]

---

## 🆘 TROUBLESHOOTING

### 1. Connection Refused
```bash
# Cek backend running
curl http://192.168.1.21:5000/health

# Cek IP address
ipconfig (Windows) atau ifconfig (Mac/Linux)
```

### 2. 401 Unauthorized
- Token expired → Login ulang
- Token tidak valid → Cek format Bearer token
- User tidak aktif → Hubungi admin

### 3. File Upload Gagal
- Cek ukuran file < 10MB
- Cek format file (JPG, PNG, PDF)
- Cek koneksi internet

---

**📞 Support**: Hubungi tim backend jika ada masalah!
**Version**: 2.1.0
**Last Updated**: 2024
