import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/local/secure_storage_service.dart';
import '../../config/api_config.dart';

class ScheduleService {
  static String get baseUrl => ApiConfig.baseUrl;

  static Future<Map<String, dynamic>> getMySchedules() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await SecureStorageService.getToken();

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/mobile/my-schedules';
      print('🌐 [ScheduleService] Calling: $url');
      
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [ScheduleService] Status: ${response.statusCode}');
      print('📥 [ScheduleService] Body: ${response.body}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        if (result['success'] == true && result['data'] != null) {
          // Response structure: { success, data: { schedules: [], total, role } }
          final schedules = result['data']['schedules'] ?? [];
          print('✅ [ScheduleService] Found ${schedules.length} schedules');
          return {
            'success': true,
            'data': schedules,
          };
        }
        return {
          'success': false,
          'message': 'Data tidak ditemukan',
        };
      } else {
        return {
          'success': false,
          'message': 'Gagal memuat jadwal',
        };
      }
    } catch (e) {
      print('❌ [ScheduleService] Error: $e');
      return {
        'success': false,
        'message': 'Terjadi kesalahan',
      };
    }
  }
}
