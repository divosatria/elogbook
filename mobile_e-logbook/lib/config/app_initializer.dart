import 'package:e_logbook/config/api_config.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:e_logbook/services/api/auth_service.dart';
import 'package:e_logbook/services/api/iot_service.dart';
import 'package:e_logbook/services/api/dashboard_service.dart';
import 'package:e_logbook/services/api/catch_service.dart';
import 'package:e_logbook/services/local/offline_sync_service.dart';
import 'package:e_logbook/services/realtime/realtime_update_service.dart';
import 'package:e_logbook/services/local/crash_reporter.dart';
import 'package:e_logbook/services/monitoring/schedule_monitoring_service.dart';
import 'package:e_logbook/services/nitification/local_notification_service.dart';
import 'package:e_logbook/utils/google_maps_config.dart';

class AppInitializer {
  static Future<bool> initialize() async {
    try {
      // Initialize crash reporter first
      await CrashReporter.initialize();
      
      // Load environment variables
      await dotenv.load(fileName: ".env");

      // Validate and log API keys
      debugPrint('\n🔐 ========== API KEYS VALIDATION ==========');
      
      // Gemini API
      if (ApiConfig.geminiApiKey.isEmpty) {
        debugPrint('⚠️ Gemini API Key: NOT CONFIGURED');
        debugPrint('⚠️ Generate key di: https://aistudio.google.com/app/apikey');
      } else {
        debugPrint('✅ Gemini API Key: ${ApiConfig.geminiApiKey.substring(0, 10)}...${ApiConfig.geminiApiKey.substring(ApiConfig.geminiApiKey.length - 4)}');
        debugPrint('✅ Gemini Model: ${ApiConfig.geminiModel}');
      }
      
      // Google Maps API
      if (ApiConfig.googleMapsApiKey.isEmpty) {
        debugPrint('⚠️ Google Maps API Key: NOT CONFIGURED');
        debugPrint('⚠️ Generate key di: https://console.cloud.google.com/google/maps-apis');
      } else {
        debugPrint('✅ Google Maps API Key: ${ApiConfig.googleMapsApiKey.substring(0, 10)}...${ApiConfig.googleMapsApiKey.substring(ApiConfig.googleMapsApiKey.length - 4)}');
        await GoogleMapsConfig.initialize();
      }
      
      // OpenWeather API
      if (ApiConfig.openWeatherApiKey.isEmpty) {
        debugPrint('⚠️ OpenWeather API Key: NOT CONFIGURED');
        debugPrint('⚠️ Generate key di: https://openweathermap.org/api');
      } else {
        debugPrint('✅ OpenWeather API Key: ${ApiConfig.openWeatherApiKey.substring(0, 10)}...${ApiConfig.openWeatherApiKey.substring(ApiConfig.openWeatherApiKey.length - 4)}');
      }
      
      debugPrint('========================================\n');
      
      // Initialize notification service
      await LocalNotificationService.initialize();
      
      await _cleanupCache();
      AuthService.init();
      IoTService.init();
      DashboardService.init();
      CatchService.init();
      await initializeDateFormatting('id_ID', null);
      _startBackgroundServices();
      
      CrashReporter.log('App initialized successfully');
      return true;
    } catch (e, stack) {
      debugPrint('❌ Initialization error: $e');
      CrashReporter.recordError(e, stack, );
      return false;
    }
  }

  static Future<void> _cleanupCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('popup_shown_this_session');
    
    final userData = prefs.getString('user_data');
    if (userData != null && userData.contains('api10-')) {
      await prefs.remove('user_data');
      await prefs.remove('user_profile');
      debugPrint('🧹 Cleared corrupted cache');
    }
  }

  static void _startBackgroundServices() {
    OfflineSyncService.startConnectivityMonitoring();
    RealtimeUpdateService.startPolling();
    ScheduleMonitoringService.initialize();
  }
}
