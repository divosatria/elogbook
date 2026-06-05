import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class NetActionService {
  static String get baseUrl => ApiConfig.apiUrl;

  /// Kirim titik jaring (turunkan / angkat) ke backend
  /// [actionType]: "net_deployed" atau "net_retrieved"
  /// [hasilTangkap]: WAJIB untuk "net_retrieved" — list berisi {jenisIkan, beratKg}
  static Future<Map<String, dynamic>> sendNetAction({
    required int tripId,
    required double lat,
    required double lng,
    required String actionType,
    double? depthMeters,
    String? notes,
    List<Map<String, dynamic>>? hasilTangkap,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      // Body sesuai kontrak backend: tripId, lat, lng di top-level
      final requestData = <String, dynamic>{
        'tripId': tripId,
        'lat': lat,
        'lng': lng,
        'actionType': actionType,
      };

      // Field opsional
      if (depthMeters != null && depthMeters > 0) {
        requestData['depthMeters'] = depthMeters;
      }
      if (notes != null && notes.isNotEmpty) {
        requestData['notes'] = notes;
      }

      // WAJIB untuk net_retrieved
      if (actionType == 'net_retrieved' && hasilTangkap != null) {
        requestData['hasilTangkap'] = hasilTangkap;
      }

      print('🕸️ [NetAction] Sending $actionType: tripId=$tripId, lat=$lat, lng=$lng');
      print('🕸️ [NetAction] Body: ${json.encode(requestData)}');

      final response = await http.post(
        Uri.parse('$baseUrl/fishing-points'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [NetAction] $actionType berhasil dikirim');
        return result;
      } else {
        print('⚠️ [NetAction] Failed: ${response.statusCode} - ${response.body}');
        throw Exception('Gagal mengirim net action: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [NetAction] Error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }
}
