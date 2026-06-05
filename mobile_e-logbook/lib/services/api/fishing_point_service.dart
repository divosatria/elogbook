import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class FishingPointService {
  static String get baseUrl => ApiConfig.baseUrl;

  /// Kirim data titik penangkapan (Fishing Point) ke backend.
  ///
  /// [payload] berisi field: tripId, lat, lng, depthMeters, actionType, notes.
  /// Return Map dengan key `success` (bool) dan `message` (String).
  static Future<Map<String, dynamic>> submitFishingPoint(
    Map<String, dynamic> payload,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'message': 'Token autentikasi tidak ditemukan. Silakan login ulang.',
        };
      }

      print('📍 [FishingPoint] Sending fishing point: $payload');

      final response = await http
          .post(
            Uri.parse('$baseUrl/api/fishing-points'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
            body: json.encode(payload),
          )
          .timeout(const Duration(seconds: 15));

      print('📥 [FishingPoint] Response status: ${response.statusCode}');
      print('📥 [FishingPoint] Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [FishingPoint] Titik penangkapan berhasil dikirim');
        return {
          'success': true,
          'message': result['message'] ?? 'Titik penangkapan berhasil disimpan',
          'data': result['data'],
        };
      } else {
        final errorBody = _tryDecodeBody(response.body);
        final serverMsg = errorBody?['message'] ?? 'Gagal menyimpan titik penangkapan';
        print('⚠️ [FishingPoint] Failed: ${response.statusCode} - ${response.body}');
        return {
          'success': false,
          'message': '$serverMsg (${response.statusCode})',
        };
      }
    } on TimeoutException {
      print('⏱️ [FishingPoint] Request timeout');
      return {
        'success': false,
        'message': 'Koneksi timeout. Periksa jaringan Anda dan coba lagi.',
      };
    } on SocketException {
      print('🔌 [FishingPoint] No internet connection');
      return {
        'success': false,
        'message': 'Tidak ada koneksi internet. Periksa jaringan Anda.',
      };
    } catch (e) {
      print('❌ [FishingPoint] Error: $e');
      return {
        'success': false,
        'message': 'Terjadi kesalahan: ${e.toString()}',
      };
    }
  }

  /// Helper untuk decode response body secara aman
  static Map<String, dynamic>? _tryDecodeBody(String body) {
    try {
      return json.decode(body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
