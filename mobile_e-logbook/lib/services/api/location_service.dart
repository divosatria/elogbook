import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import '../../config/api_config.dart';

class LocationService {
  static String get baseUrl => ApiConfig.baseUrl;

  /// Send location update to backend
  static Future<Map<String, dynamic>> sendLocationUpdate({
    required int tripId,
    required Position position,
    double? speed,
    double? heading,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final requestData = {
        'tripId': tripId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'speed': speed ?? position.speed,
        'heading': heading ?? position.heading,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'timestamp': DateTime.now().toIso8601String(),
      };

      print('📍 [Location] Sending update: Lat ${position.latitude}, Lng ${position.longitude}');

      final response = await http.post(
        Uri.parse('$baseUrl/api/mobile/location'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [Location] Update sent successfully');
        return result;
      } else {
        print('⚠️ [Location] Failed: ${response.statusCode}');
        throw Exception('Failed to send location: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [Location] Error: $e');
      // Don't throw - just log error to avoid breaking tracking
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Send batch location updates (for offline sync)
  static Future<Map<String, dynamic>> sendBatchLocationUpdates({
    required int tripId,
    required List<Map<String, dynamic>> locations,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final requestData = {
        'tripId': tripId,
        'locations': locations,
      };

      print('📍 [Location] Sending batch: ${locations.length} locations');

      final response = await http.post(
        Uri.parse('$baseUrl/api/mobile/location/batch'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [Location] Batch sent successfully');
        return result;
      } else {
        throw Exception('Failed to send batch: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [Location] Batch error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }
}
