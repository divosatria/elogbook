import 'dart:async';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';
import '../local/secure_storage_service.dart';

class RealTimeService {
  static String get baseUrl => ApiConfig.baseUrl;
  static final Dio _dio = Dio();
  static Timer? _heartbeatTimer;
  
  // Emergency signal - INSTANT
  static Future<void> sendEmergencySignal({
    required String vesselName,
    required String vesselNumber,
    required double latitude,
    required double longitude,
    required String message,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await SecureStorageService.getToken();
      
      await _dio.post(
        '$baseUrl/emergency/signal',
        data: {
          'vessel_name': vesselName,
          'vessel_number': vesselNumber,
          'latitude': latitude,
          'longitude': longitude,
          'message': message,
          'timestamp': DateTime.now().toIso8601String(),
          'priority': 'CRITICAL',
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          sendTimeout: Duration(seconds: 3), // Max 3 detik
          receiveTimeout: Duration(seconds: 3),
        ),
      );
    } catch (e) {
      throw Exception('Gagal mengirim sinyal darurat: $e');
    }
  }
  
  // Location tracking - Real-time
  static Future<void> sendLocationUpdate({
    required String vesselName,
    required double latitude,
    required double longitude,
    required String status,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await SecureStorageService.getToken();
      
      await _dio.post(
        '$baseUrl/tracking/location',
        data: {
          'vessel_name': vesselName,
          'latitude': latitude,
          'longitude': longitude,
          'status': status,
          'timestamp': DateTime.now().toIso8601String(),
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          sendTimeout: Duration(seconds: 2),
          receiveTimeout: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      print('Location update failed: $e');
    }
  }
  
  // Listen for admin alerts - Real-time
  static void startListeningForAlerts(Function(Map<String, dynamic>) onAlert) {
    _heartbeatTimer = Timer.periodic(Duration(seconds: 5), (timer) async {
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = await SecureStorageService.getToken();
        
        final response = await _dio.get(
          '$baseUrl/alerts/check',
          options: Options(
            headers: {'Authorization': 'Bearer $token'},
            sendTimeout: Duration(seconds: 2),
            receiveTimeout: Duration(seconds: 2),
          ),
        );
        
        if (response.data['has_alerts'] == true) {
          final alerts = response.data['alerts'] as List;
          for (var alert in alerts) {
            onAlert(alert);
          }
        }
      } catch (e) {
        print('Alert check failed: $e');
      }
    });
  }
  
  static void stopListening() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }
}