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

  // ========== GEMINI AI ==========
  // Load API Key from environment
  static String get geminiApiKey => dotenv.env['GEMINI_API_KEY'] ?? '';

  // BASE URL untuk Gemini API
  static String get geminiBaseUrl => 
      dotenv.env['GEMINI_BASE_URL'] ?? 
      'https://generativelanguage.googleapi s.com/v1beta';

  // Model terbaru dan terbaik: Gemini 1.5 Flash
  static String get geminiModel => dotenv.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';

  // Timeout cukup untuk image processing gemini-1.5-flash
  static const Duration requestTimeout = Duration(seconds: 90);

  // ========== GOOGLE MAPS ==========
  static String get googleMapsApiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

  // ========== OPENWEATHER ==========
  static String get openWeatherApiKey => dotenv.env['OPENWEATHER_API_KEY'] ?? '';
}
