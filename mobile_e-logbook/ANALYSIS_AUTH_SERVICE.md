# AuthService Analysis & Recommendations

## Priority 1 (Critical)

### 1. Remove Duplicate Headers
```dart
// ❌ Current
final response = await _dio.post(
  '/mobile/login',
  options: Options(headers: { ... }), // Redundant
);

// ✅ Fix
final response = await _dio.post(
  '/mobile/login',
  data: {'email': email, 'password': password},
);
```

### 2. Reuse Dio Instance
```dart
// ❌ Current
final vesselDio = Dio(BaseOptions(...));

// ✅ Fix
final vesselResponse = await _dio.get(
  '/mobile/vessels/my-vessel',
  options: Options(headers: {'Authorization': 'Bearer $token'}),
);
```

### 3. Environment Configuration
```dart
// Create config/environment.dart
class Environment {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://elogbookipb.web.id:5000/api',
  );
}
```

## Priority 2 (Performance)

### 4. Split Login Method
```dart
static Future<Map<String, dynamic>> login(...) async {
  final response = await _performLogin(email, password);
  if (!response['success']) return response;
  
  final user = await _processUserData(response.data);
  await _fetchVesselData(user, token);
  await _initializeUserNotifications(user);
  
  return {'success': true, 'user': user, 'token': token};
}

static Future<Response> _performLogin(String email, String password) async { ... }
static Future<UserModel> _processUserData(Map data) async { ... }
static Future<void> _fetchVesselData(UserModel user, String token) async { ... }
static Future<void> _initializeUserNotifications(UserModel user) async { ... }
```

### 5. Replace Print with Logger
```dart
import 'package:logger/logger.dart';

class AuthService {
  static final _logger = Logger();
  
  // Replace print with:
  _logger.d('Login attempt for user: $email'); // Debug
  _logger.i('Login successful'); // Info
  _logger.w('Could not fetch vessel'); // Warning
  _logger.e('Login failed', error); // Error
}
```

## Priority 3 (Code Quality)

### 6. Selective Logout
```dart
static Future<void> logout() async {
  final prefs = await SharedPreferences.getInstance();
  
  // Only remove auth-related data
  await prefs.remove('auth_token');
  await prefs.remove('user_data');
  await prefs.remove('vessel_data');
  
  // Keep app settings, cache, etc.
}
```

### 7. Token Validation
```dart
static Future<void> saveToken(String token) async {
  if (token.isEmpty || token.length < 20) {
    throw ArgumentError('Invalid token format');
  }
  
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', token);
}
```

### 8. Better Error Handling
```dart
static Future<void> _fetchVesselData(String token) async {
  try {
    final response = await _dio.get('/mobile/vessels/my-vessel');
    // Process vessel data
  } catch (e) {
    _logger.w('Could not fetch vessel data', e);
    // Return warning to user or retry
    throw VesselFetchException('Failed to load vessel data');
  }
}
```

## Summary

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P1 | Duplicate headers | Low | 5 min |
| P1 | New Dio instance | Medium | 10 min |
| P1 | Hardcoded URL | Medium | 15 min |
| P2 | Complex login method | High | 30 min |
| P2 | Debug prints | Low | 20 min |
| P3 | Logout clears all | Medium | 10 min |
| P3 | Token validation | Low | 10 min |

**Total Estimated Time**: ~2 hours
**Impact**: Improved maintainability, performance, and security
