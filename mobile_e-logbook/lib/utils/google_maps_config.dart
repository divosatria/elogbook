import '../config/api_config.dart';

/// Helper untuk konfigurasi Google Maps
class GoogleMapsConfig {
  static bool _isInitialized = false;

  /// Initialize Google Maps dengan API key dari .env
  static Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      final apiKey = ApiConfig.googleMapsApiKey;
      
      if (apiKey.isEmpty) {
        print('⚠️ [GoogleMaps] API key tidak ditemukan di .env');
        print('⚠️ [GoogleMaps] Generate key di: https://console.cloud.google.com/google/maps-apis');
        return;
      }

      print('✅ [GoogleMaps] API key loaded from .env');
      print('🗺️ [GoogleMaps] Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}');
      
      _isInitialized = true;
    } catch (e) {
      print('❌ [GoogleMaps] Error initializing: $e');
    }
  }

  /// Get API key
  static String get apiKey => ApiConfig.googleMapsApiKey;

  /// Check if API key is configured
  static bool get isConfigured => ApiConfig.googleMapsApiKey.isNotEmpty;
}
