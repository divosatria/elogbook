# 📱 E-Logbook Mobile API Guide

## 🚀 Quick Start untuk Flutter Developer

### 📋 Prerequisites
- Backend server running di `http://192.168.1.x:5000` (ganti dengan IP WiFi kamu)
- User account dengan role `nahkoda` atau `abk` (dibuat oleh admin)
- Flutter app dengan HTTP client (dio/http package)

### 🔧 Base URL Configuration
```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'http://192.168.1.100:5000/api'; // Ganti dengan IP WiFi kamu
  static const String mobileBaseUrl = '$baseUrl/mobile';
}
```

## 🔐 Authentication Flow

### 1. Login Process
```dart
// lib/services/auth_service.dart
class AuthService {
  Future<LoginResponse> login(String email, String password) async {
    final response = await dio.post(
      '${ApiConfig.mobileBaseUrl}/login',
      data: {
        'email': email,
        'password': password,
      },
    );
    
    if (response.data['success']) {
      // Simpan token untuk request selanjutnya
      final token = response.data['token'];
      await _saveToken(token);
      return LoginResponse.fromJson(response.data);
    }
    throw Exception(response.data['message']);
  }
}
```

### 2. Token Management
```dart
// lib/services/token_service.dart
class TokenService {
  static const String _tokenKey = 'jwt_token';
  
  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }
  
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }
  
  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
```

### 3. HTTP Interceptor
```dart
// lib/services/dio_service.dart
class DioService {
  late Dio _dio;
  
  DioService() {
    _dio = Dio();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenService().getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            // Token expired, redirect to login
            _handleTokenExpired();
          }
          handler.next(error);
        },
      ),
    );
  }
}
```

## 📱 Core Mobile Endpoints

### 🔑 1. Login (POST /mobile/login)
```dart
// Request
{
  "email": "nahkoda@example.com",
  "password": "password123"
}

// Response
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
      "telepon": "+62812345678",
      "alamat": "Jakarta"
    }
  }
}
```

### 📊 2. Dashboard (GET /mobile/dashboard)
```dart
// Nahkoda Response
{
  "success": true,
  "data": {
    "role": "nahkoda",
    "myTrips": 12,
    "activeTrips": 3,
    "pendingTrips": 2,
    "recentTrips": [
      {
        "id": "trip_2024_001",
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

### 📍 3. Update Location (POST /mobile/location)
```dart
// Request
{
  "kapalId": 1,
  "lat": -6.2000,
  "lng": 106.8166
}

// Response
{
  "success": true,
  "message": "Lokasi berhasil diupdate"
}
```

### 🆘 4. Emergency SOS (POST /mobile/sos)
```dart
// Request
{
  "kapalId": 1,
  "location": {
    "lat": -6.2000,
    "lng": 106.8166
  },
  "note": "Engine failure, need immediate assistance"
}

// Response
{
  "success": true,
  "message": "SOS berhasil dikirim",
  "data": {
    "id": "sos_2024_001",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## 🎯 Role-Based Features

### 👨‍✈️ Nahkoda (Captain) Features
```dart
class NahkodaService {
  // Get trip tasks
  Future<List<TripTask>> getTripTasks() async {
    final response = await dio.get('${ApiConfig.mobileBaseUrl}/trip-tasks');
    return (response.data['data'] as List)
        .map((task) => TripTask.fromJson(task))
        .toList();
  }
  
  // Complete trip task
  Future<void> completeTask(int taskId) async {
    await dio.patch('${ApiConfig.mobileBaseUrl}/trip-tasks/$taskId/complete');
  }
}
```

### 👷‍♂️ ABK (Crew) Features
```dart
class ABKService {
  // View assigned trips
  Future<DashboardData> getDashboard() async {
    final response = await dio.get('${ApiConfig.mobileBaseUrl}/dashboard');
    return DashboardData.fromJson(response.data['data']);
  }
  
  // Update vessel location
  Future<void> updateLocation(int kapalId, double lat, double lng) async {
    await dio.post('${ApiConfig.mobileBaseUrl}/location', data: {
      'kapalId': kapalId,
      'lat': lat,
      'lng': lng,
    });
  }
}
```

## 🔄 Real-time Updates dengan WebSocket

### Socket.IO Integration
```dart
// lib/services/socket_service.dart
class SocketService {
  late IO.Socket socket;
  
  void connect() {
    socket = IO.io('http://192.168.1.100:5000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });
    
    socket.connect();
    
    // Listen for real-time updates
    socket.on('location_update', (data) {
      // Handle location updates
      _handleLocationUpdate(data);
    });
    
    socket.on('sos_alert', (data) {
      // Handle emergency alerts
      _handleSOSAlert(data);
    });
  }
}
```

## 🛡️ Error Handling

### Standard Error Response
```dart
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  factory ApiException.fromResponse(Response response) {
    final data = response.data;
    return ApiException(
      data['message'] ?? 'Unknown error',
      response.statusCode,
    );
  }
}
```

### Common Error Codes
- `400` - Invalid input data
- `401` - Authentication required / Token expired
- `403` - Role not allowed for mobile app
- `404` - Resource not found
- `429` - Too many requests (rate limited)
- `500` - Server error

## 📱 Flutter Models

### User Model
```dart
class MobileUser {
  final int id;
  final String username;
  final String email;
  final String role;
  final UserProfile profile;
  final DateTime? lastLoginAt;
  
  MobileUser({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    required this.profile,
    this.lastLoginAt,
  });
  
  factory MobileUser.fromJson(Map<String, dynamic> json) {
    return MobileUser(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      role: json['role'],
      profile: UserProfile.fromJson(json['profile']),
      lastLoginAt: json['lastLoginAt'] != null 
          ? DateTime.parse(json['lastLoginAt']) 
          : null,
    );
  }
}
```

### Dashboard Model
```dart
class DashboardData {
  final String role;
  final int myTrips;
  final int activeTrips;
  final int? pendingTrips; // Only for nahkoda
  final List<TripSummary> recentTrips;
  
  DashboardData({
    required this.role,
    required this.myTrips,
    required this.activeTrips,
    this.pendingTrips,
    required this.recentTrips,
  });
  
  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      role: json['role'],
      myTrips: json['myTrips'],
      activeTrips: json['activeTrips'],
      pendingTrips: json['pendingTrips'],
      recentTrips: (json['recentTrips'] as List)
          .map((trip) => TripSummary.fromJson(trip))
          .toList(),
    );
  }
}
```

## 🧪 Testing

### Unit Test Example
```dart
// test/services/auth_service_test.dart
void main() {
  group('AuthService', () {
    late AuthService authService;
    late MockDio mockDio;
    
    setUp(() {
      mockDio = MockDio();
      authService = AuthService(dio: mockDio);
    });
    
    test('should login successfully with valid credentials', () async {
      // Arrange
      when(mockDio.post(any, data: anyNamed('data')))
          .thenAnswer((_) async => Response(
                data: {
                  'success': true,
                  'token': 'test_token',
                  'user': {'id': 1, 'role': 'nahkoda'}
                },
                statusCode: 200,
                requestOptions: RequestOptions(path: ''),
              ));
      
      // Act
      final result = await authService.login('test@example.com', 'password');
      
      // Assert
      expect(result.success, true);
      expect(result.token, 'test_token');
    });
  });
}
```

## 🔧 Development Tips

### 1. WiFi IP Configuration
```bash
# Cek IP WiFi di Windows
ipconfig | findstr "IPv4"

# Cek IP WiFi di Linux/Mac
ifconfig | grep "inet "
```

### 2. CORS untuk Development
Backend sudah dikonfigurasi untuk development mode yang mengizinkan semua origin. Pastikan `NODE_ENV=development` di file `.env`.

### 3. Rate Limiting
- Mobile auth: 10 requests per 15 minutes
- General mobile: 100 requests per 15 minutes
- Emergency SOS: No limit (priority)

### 4. Token Expiry
JWT token berlaku selama 7 hari. Implementasikan auto-refresh atau redirect ke login saat token expired.

## 📚 Additional Resources

- **Swagger UI**: `http://192.168.1.100:5000/api-docs`
- **API JSON**: `http://192.168.1.100:5000/api-docs.json`
- **Health Check**: `http://192.168.1.100:5000/health`

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Pastikan backend server running
   - Cek IP address dan port
   - Pastikan firewall tidak blocking

2. **401 Unauthorized**
   - Token expired atau invalid
   - User role tidak diizinkan untuk mobile
   - Cek header Authorization

3. **403 Forbidden**
   - User role bukan nahkoda/abk
   - Akun tidak aktif
   - Hubungi admin untuk aktivasi

4. **Rate Limited (429)**
   - Terlalu banyak request
   - Tunggu beberapa menit
   - Implementasikan retry dengan backoff

### Debug Mode
```dart
// Enable debug logging
void main() {
  if (kDebugMode) {
    (dio.transformer as DefaultTransformer).jsonDecodeCallback = parseJson;
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));
  }
  runApp(MyApp());
}
```

---

**📞 Support**: Jika ada masalah, hubungi tim development atau buat issue di repository.