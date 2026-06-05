import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class IoTService {
  static String get baseUrl => ApiConfig.apiUrl;

  static late Dio _dio;

  static void init() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
      ),
    );

    _dio.interceptors.add(
      LogInterceptor(requestBody: true, responseBody: true),
    );
  }

  /// POST - Kirim data tangkapan ke IoT
  static Future<Map<String, dynamic>> sendToIoT({
    required Map<String, dynamic> catchData,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      debugPrint('\n📡 [IoT] Sending data to IoT endpoint...');
      debugPrint('📦 [IoT] Data: $catchData');

      final response = await _dio.post(
        '/mobile/iot/input',
        data: {
          'fish_name': catchData['fish_name'],
          'fish_type': catchData['fish_type'],
          'weight': catchData['weight'],
          'quantity': catchData['quantity'],
          'condition': catchData['condition'],
          'kapalId': catchData['kapalId'],
          'tripId': catchData['tripId'],
          'fishing_zone': catchData['fishing_zone'],
          'location_name': catchData['location_name'],
          'timestamp': DateTime.now().toIso8601String(),
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('✅ [IoT] Data sent successfully');
        return {
          'success': true,
          'message': 'Data berhasil dikirim ke IoT',
          'data': response.data,
        };
      }

      debugPrint('❌ [IoT] Failed: ${response.data}');
      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengirim data ke IoT',
      };
    } on DioException catch (e) {
      return _handleError(e);
    } catch (e) {
      debugPrint('❌ [IoT] Error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Map<String, dynamic> _handleError(DioException e) {
    debugPrint('❌ IoTService error: ${e.message}');

    if (e.response?.statusCode == 401) {
      return {
        'success': false,
        'message': 'Sesi berakhir, silakan login kembali'
      };
    } else if (e.response?.statusCode == 400) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Data tidak valid'
      };
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return {'success': false, 'message': 'Koneksi timeout'};
    } else if (e.type == DioExceptionType.connectionError) {
      return {
        'success': false,
        'message': 'Tidak dapat terhubung ke server IoT'
      };
    }

    return {
      'success': false,
      'message': e.response?.data['message'] ?? 'Gagal mengirim ke IoT',
    };
  }
}
