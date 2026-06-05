import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'vessel_service.dart';
import '../../config/api_config.dart';

class SosService {
  static final Dio _dio = Dio();
  static String get baseUrl => ApiConfig.baseUrl;

  /// Send SOS alert to backend
  ///
  /// Parameters:
  /// - note: Optional message (if empty, will use default message with location)
  static Future<Map<String, dynamic>> sendSosAlert({String? note}) async {
    try {
      print('🚨 [SOS] Starting SOS alert...');

      // Get token
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan. Silakan login kembali.');
      }

      // Get vessel ID
      final vesselService = VesselService();
      final vesselId = await vesselService.getVesselIdFromUserSettings() ?? 
                       await vesselService.getVesselIdFromTrip();
      
      if (vesselId == null) {
        throw Exception('Data kapal tidak ditemukan');
      }

      print('🚢 [SOS] Kapal ID: $vesselId');

      // Get current location
      print('📍 [SOS] Getting current location...');
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      print('📍 [SOS] Location: ${position.latitude}, ${position.longitude}');

      // Prepare default message if note is empty
      final message = note?.trim().isEmpty ?? true
          ? 'DARURAT! Kapal memerlukan bantuan segera. Lokasi: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}'
          : note!.trim();

      final requestData = {
        'kapalId': vesselId,
        'location': {'lat': position.latitude, 'lng': position.longitude},
        'note': message,
      };

      print('🚨 SOS Alert Request:');
      print('   URL: $baseUrl/api/mobile/sos');
      print('   Data: $requestData');

      // Send POST request
      final response = await _dio.post(
        '$baseUrl/api/mobile/sos',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status! < 500, // Don't throw on 4xx
        ),
        data: requestData,
      );

      print('✅ SOS Response: ${response.data}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data;
      } else {
        throw Exception('Failed to send SOS: ${response.statusCode}');
      }
    } on DioException catch (e) {
      print('❌ SOS DioException: ${e.message}');
      print('❌ Response: ${e.response?.data}');
      print('❌ Status: ${e.response?.statusCode}');

      if (e.response != null) {
        final statusCode = e.response!.statusCode;
        final responseData = e.response!.data;

        if (statusCode == 500) {
          print('🔴 Server Error 500 - Backend issue');
          print('🔴 Response data: $responseData');
          throw Exception('Server error. Hubungi administrator.');
        }

        final message = responseData is Map
            ? (responseData['message'] ?? 'Gagal mengirim sinyal darurat')
            : 'Gagal mengirim sinyal darurat';
        throw Exception(message);
      } else if (e.type == DioExceptionType.connectionTimeout) {
        throw Exception('Koneksi timeout. Periksa koneksi internet Anda.');
      } else if (e.type == DioExceptionType.receiveTimeout) {
        throw Exception('Server tidak merespons. Coba lagi.');
      } else {
        throw Exception('Gagal mengirim SOS: ${e.message}');
      }
    } catch (e) {
      print('❌ Unexpected error: $e');
      throw Exception('Terjadi kesalahan: $e');
    }
  }

  /// Get SOS history (if needed in the future)
  static Future<List<Map<String, dynamic>>> getSosHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final response = await _dio.get(
        '$baseUrl/api/mobile/sos/history',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      } else {
        throw Exception('Gagal memuat riwayat SOS');
      }
    } catch (e) {
      throw Exception('Error loading SOS history: $e');
    }
  }
}
