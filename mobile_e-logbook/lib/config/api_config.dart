import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  // Base URL untuk backend (tanpa /api)
  static String get baseUrl {
    final envUrl = dotenv.env['API_BASE_URL'] ?? 'http://192.168.56.1:5000/api';
    // Hapus trailing /api jika ada, agar konsisten
    return envUrl.replaceAll(RegExp(r'/api/?$'), '');
  }

  // Full API URL (dengan /api)
  static String get apiUrl => '$baseUrl/api';

  // ========== GOOGLE MAPS ==========
  static String get googleMapsApiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

  // ========== OPENWEATHER ==========
  static String get openWeatherApiKey => dotenv.env['OPENWEATHER_API_KEY'] ?? '';
}
