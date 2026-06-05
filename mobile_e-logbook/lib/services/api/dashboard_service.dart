import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/local/secure_storage_service.dart';
import '../../config/api_config.dart';

class DashboardService {
  static String get baseUrl => ApiConfig.apiUrl;

  static late Dio _dio;

  static void init() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );
  }

  /// GET - Dashboard data
  static Future<Map<String, dynamic>> getDashboard() async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      debugPrint('🔍 [Dashboard] Fetching dashboard data...');
      final response = await _dio.get(
        '/mobile/dashboard',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      debugPrint('✅ [Dashboard] Response: ${response.statusCode}');
      debugPrint('📦 [Dashboard] Data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        debugPrint('📊 [Dashboard] Role: ${data['role']}');
        debugPrint('📊 [Dashboard] My Trips: ${data['myTrips']}');
        debugPrint('📊 [Dashboard] Active Trips: ${data['activeTrips']}');

        return {
          'success': true,
          'data': response.data['data'],
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil data dashboard',
      };
    } on DioException catch (e) {
      return _handleError(e);
    } catch (e) {
      debugPrint('❌ Dashboard error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return await SecureStorageService.getToken();
  }

  static Map<String, dynamic> _handleError(DioException e) {
    if (e.response?.statusCode == 401) {
      return {
        'success': false,
        'message': 'Sesi berakhir, silakan login kembali'
      };
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return {'success': false, 'message': 'Koneksi timeout'};
    } else if (e.type == DioExceptionType.connectionError) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server'};
    }

    return {
      'success': false,
      'message': e.response?.data['message'] ?? 'Terjadi kesalahan',
    };
  }
}
