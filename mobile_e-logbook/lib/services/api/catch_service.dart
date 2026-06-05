import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/catch_model.dart';
import '../../config/api_config.dart';

class CatchService {
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

  /// POST - Submit catch data dengan foto
  static Future<Map<String, dynamic>> submitCatch({
    required Map<String, dynamic> catchData,
    required File photoFile,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      // Prepare multipart form data
      final formData = FormData.fromMap({
        'fish_name': catchData['fish_name'],
        'fish_type': catchData['fish_type'],
        'weight': catchData['weight'].toString(),
        'quantity': catchData['quantity'].toString(),
        'condition': catchData['condition'],
        'crew_count': catchData['crew_count'].toString(),
        'departure_date': catchData['departure_date'],
        'departure_time': catchData['departure_time'],
        'arrival_date': catchData['arrival_date'],
        'arrival_time': catchData['arrival_time'],
        'trip_duration_hours': catchData['trip_duration_hours'].toString(),
        'trip_duration_minutes': catchData['trip_duration_minutes'].toString(),
        'fishing_zone': catchData['fishing_zone'],
        'location_name': catchData['location_name'],
        'latitude': catchData['latitude'].toString(),
        'longitude': catchData['longitude'].toString(),
        'water_depth': catchData['water_depth'].toString(),
        'weather_condition': catchData['weather_condition'],
        'notes': catchData['notes'] ?? '',
        'kapalId': catchData['kapalId'].toString(),
        'photo': await MultipartFile.fromFile(
          photoFile.path,
          filename: 'catch_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      });

      final response = await _dio.post(
        '/mobile/catches',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        return {
          'success': true,
          'message':
              response.data['message'] ?? 'Data tangkapan berhasil disimpan',
          'data': response.data['data'],
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal menyimpan data tangkapan',
      };
    } on DioException catch (e) {
      return _handleError(e, 'submit catch');
    } catch (e) {
      debugPrint('❌ Submit catch error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  /// GET - Fetch all catches
  static Future<Map<String, dynamic>> getCatches({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      debugPrint('🔍 [CatchService] Fetching catches...');
      final response = await _dio.get(
        '/mobile/catches',
        queryParameters: {
          'page': page,
          'limit': limit,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      debugPrint('✅ [CatchService] Response: ${response.statusCode}');
      debugPrint('📦 [CatchService] Data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> catchesData = response.data['data'] ?? [];
        debugPrint('📊 [CatchService] Found ${catchesData.length} catches');

        final List<CatchModel> catches = [];
        for (var json in catchesData) {
          try {
            final catch_ = CatchModel.fromJson(json);
            catches.add(catch_);
          } catch (e) {
            debugPrint('⚠️ [CatchService] Error parsing catch: $e');
            debugPrint('📄 [CatchService] JSON: $json');
          }
        }

        debugPrint(
            '✅ [CatchService] Successfully parsed ${catches.length} catches');

        return {
          'success': true,
          'data': catches,
          'pagination': response.data['pagination'],
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil data tangkapan',
      };
    } on DioException catch (e) {
      return _handleError(e, 'get catches');
    } catch (e) {
      debugPrint('❌ Get catches error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  /// GET - Fetch catch by ID
  static Future<Map<String, dynamic>> getCatchById(int id) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      final response = await _dio.get(
        '/mobile/catches/$id',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final catchData = CatchModel.fromJson(response.data['data']);
        return {
          'success': true,
          'data': catchData,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil data tangkapan',
      };
    } on DioException catch (e) {
      return _handleError(e, 'get catch by id');
    } catch (e) {
      debugPrint('❌ Get catch by id error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  /// GET - Fetch catches by date range
  static Future<Map<String, dynamic>> getCatchesByDateRange({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      final response = await _dio.get(
        '/mobile/catches',
        queryParameters: {
          'start_date': startDate.toIso8601String().split('T')[0],
          'end_date': endDate.toIso8601String().split('T')[0],
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> catchesData = response.data['data'] ?? [];
        final List<CatchModel> catches =
            catchesData.map((json) => CatchModel.fromJson(json)).toList();

        return {
          'success': true,
          'data': catches,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil data tangkapan',
      };
    } on DioException catch (e) {
      return _handleError(e, 'get catches by date range');
    } catch (e) {
      debugPrint('❌ Get catches by date range error: $e');
      return {'success': false, 'message': 'Terjadi kesalahan: $e'};
    }
  }

  // Helper methods
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Map<String, dynamic> _handleError(DioException e, String operation) {
    debugPrint('❌ CatchService $operation error: ${e.message}');

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
    } else if (e.response?.statusCode == 404) {
      return {'success': false, 'message': 'Data tidak ditemukan'};
    } else if (e.response?.statusCode == 500) {
      return {'success': false, 'message': 'Terjadi kesalahan di server'};
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
