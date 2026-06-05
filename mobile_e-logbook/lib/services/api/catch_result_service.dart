import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class CatchResultService {
  static String get baseUrl => ApiConfig.baseUrl;

  /// Kirim laporan hasil tangkapan ABK ke backend
  /// [actionType] selalu "catch_report"
  static Future<Map<String, dynamic>> sendCatchReport({
    required int tripId,
    required int kapalId,
    required double lat,
    required double lng,
    required String fishType,
    required double quantityKg,
    String? notes,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final requestData = {
        'tripId': tripId,
        'kapalId': kapalId,
        'location': {
          'lat': lat,
          'lng': lng,
        },
        'fishType': fishType,
        'quantityKg': quantityKg,
        'actionType': 'catch_report',
        'notes': notes ?? '',
        'timestamp': DateTime.now().toIso8601String(),
      };

      print('🐟 [CatchReport] Sending catch_report: $fishType, ${quantityKg}kg at ($lat, $lng)');

      final response = await http.post(
        Uri.parse('$baseUrl/api/mobile/catch-report'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [CatchReport] Tangkapan berhasil dicatat');
        return result;
      } else {
        print('⚠️ [CatchReport] Failed: ${response.statusCode} - ${response.body}');
        throw Exception('Gagal mencatat tangkapan: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [CatchReport] Error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }
}
