import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../config/api_config.dart';

class VesselService {
  static String get baseUrl => ApiConfig.baseUrl;

  Future<Map<String, dynamic>> getFuelSummary({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final vesselId = await getVesselIdFromUserSettings() ?? await getVesselIdFromTrip();
      if (vesselId == null) {
        throw Exception('Tidak ada kapal yang di-assign.');
      }

      final url = '$baseUrl/mobile/vessel/$vesselId/fuel-summary';

      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);

        if (responseData['success'] == true) {
          return responseData['data'];
        } else {
          throw Exception('Response success is false');
        }
      } else {
        throw Exception('Gagal mengambil ringkasan BBM: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<Map<String, dynamic>> uploadVesselDocument({
    required String jenisDokumen,
    required String filePath,
    String? nomorSertifikat,
    String? tanggalBerlaku,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final vesselId = await getVesselIdFromUserSettings() ?? await getVesselIdFromTrip();
      if (vesselId == null) {
        throw Exception('Tidak ada kapal yang di-assign.');
      }

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/mobile/vessel/$vesselId/documents'),
      );

      request.headers['Authorization'] = 'Bearer $token';
      request.fields['jenisDokumen'] = jenisDokumen;

      if (nomorSertifikat != null && nomorSertifikat.isNotEmpty) {
        request.fields['nomorSertifikat'] = nomorSertifikat;
      }

      if (tanggalBerlaku != null && tanggalBerlaku.isNotEmpty) {
        request.fields['tanggalBerlaku'] = tanggalBerlaku;
      }

      final file = File(filePath);
      if (await file.exists()) {
        String contentType = 'application/pdf';
        if (filePath.toLowerCase().endsWith('.jpg') ||
            filePath.toLowerCase().endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (filePath.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        }

        request.files.add(
          await http.MultipartFile.fromPath(
            'file',
            filePath,
            contentType: http_parser.MediaType.parse(contentType),
          ),
        );
      } else {
        throw Exception('File tidak ditemukan: $filePath');
      }

      final streamedResponse = await request.send().timeout(
        const Duration(minutes: 2),
      );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        if (result['success'] == true) {
          return result;
        } else {
          throw Exception(result['message'] ?? 'Upload gagal');
        }
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<Map<String, dynamic>?> getVesselDetail() async {
    print('\n🔍 [VESSEL_SERVICE] getVesselDetail called');
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userDataString = prefs.getString('user_data');

      if (token == null || userDataString == null) {
        print('❌ [VESSEL_SERVICE] Token or user_data is null');
        throw Exception('Token tidak ditemukan');
      }

      final userData = json.decode(userDataString);
      final currentUserId = userData['id'];
      final userRole = userData['role']?.toString().toLowerCase();
      print('👤 [VESSEL_SERVICE] User ID: $currentUserId, Role: $userRole');

      final connectivityResult = await Connectivity().checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        print('❌ [VESSEL_SERVICE] Tidak ada koneksi internet');
        throw Exception('Tidak ada koneksi internet');
      }

      // 1. Get all vessels first
      final vesselUrl = '$baseUrl/api/kapal';
      print('📡 [VESSEL_SERVICE] Calling: $vesselUrl');

      final vesselResponse = await http
          .get(
            Uri.parse(vesselUrl),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 30));

      print('📥 [VESSEL_SERVICE] Vessels response: ${vesselResponse.statusCode}');

      List<dynamic> allVessels = [];
      if (vesselResponse.statusCode == 200) {
        allVessels = json.decode(vesselResponse.body) as List;
        print('🚢 [VESSEL_SERVICE] Total vessels: ${allVessels.length}');

        // Find vessel by nahkodaId or abk
        for (var vessel in allVessels) {
          final nahkodaId = vessel['nahkodaId'];
          final abkList = vessel['abk'] as List?;
          
          final isNahkoda = nahkodaId == currentUserId;
          final isAbk = abkList?.any((abk) => abk['id'] == currentUserId) ?? false;

          if (isNahkoda || isAbk) {
            print('✅ [VESSEL_SERVICE] Found vessel in /api/kapal: ${vessel['namaKapal']}');
            return vessel;
          }
        }
        print('⚠️ [VESSEL_SERVICE] No direct assignment in /api/kapal');
      }

      // 2. Fallback: get from trip, then find vessel detail
      final tripUrl = '$baseUrl/api/trip';
      print('📡 [VESSEL_SERVICE] Fallback to: $tripUrl');

      final tripResponse = await http
          .get(
            Uri.parse(tripUrl),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 30));

      print('📥 [VESSEL_SERVICE] Trip response: ${tripResponse.statusCode}');

      if (tripResponse.statusCode == 200) {
        final responseData = json.decode(tripResponse.body);
        if (responseData['success'] == true && responseData['data'] != null) {
          final trips = responseData['data'] as List;
          print('🚢 [VESSEL_SERVICE] Total trips: ${trips.length}');

          for (var trip in trips) {
            final status = trip['status']?.toString().toLowerCase();
            if (status == 'selesai' || status == 'completed') continue;

            final nahkodaId = trip['nahkodaId'];
            final awakKapal = trip['awakKapal'] as List?;
            
            final isNahkoda = nahkodaId == currentUserId;
            final isCrew = awakKapal?.contains(currentUserId) ?? false;

            if (isNahkoda || isCrew) {
              final kapalFromTrip = trip['kapal'];
              if (kapalFromTrip != null) {
                final vesselId = kapalFromTrip['id'];
                print('🔍 [VESSEL_SERVICE] Found trip vessel ID: $vesselId');
                
                // Try to find full vessel detail from allVessels
                if (allVessels.isNotEmpty) {
                  final fullVessel = allVessels.firstWhere(
                    (v) => v['id'] == vesselId,
                    orElse: () => null,
                  );
                  
                  if (fullVessel != null) {
                    print('✅ [VESSEL_SERVICE] Found full vessel detail from /api/kapal: ${fullVessel['namaKapal']}');
                    return fullVessel;
                  }
                }
                
                // Fallback to trip vessel data
                print('⚠️ [VESSEL_SERVICE] Using vessel data from trip: ${kapalFromTrip['namaKapal']}');
                return kapalFromTrip;
              }
            }
          }
        }
      }

      print('❌ [VESSEL_SERVICE] No vessel found');
      return null;
    } catch (e, stackTrace) {
      print('❌ [VESSEL_SERVICE] Exception: $e');
      print('Stack trace: $stackTrace');
      rethrow;
    }
  }

  Future<String?> getVesselIdFromUserSettings() async {
    print('\n🔍 [VESSEL_SERVICE] getVesselIdFromUserSettings called');
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userDataString = prefs.getString('user_data');
      
      if (token == null || userDataString == null) {
        print('❌ [VESSEL_SERVICE] Token or user_data is null');
        return null;
      }
      
      final userData = json.decode(userDataString);
      final currentUserId = userData['id'];
      print('👤 [VESSEL_SERVICE] Current user ID: $currentUserId');

      final url = '$baseUrl/api/kapal';
      print('📡 [VESSEL_SERVICE] Calling: $url');

      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 30));

      print('📥 [VESSEL_SERVICE] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final vessels = json.decode(response.body) as List;
        print('🚢 [VESSEL_SERVICE] Total vessels: ${vessels.length}');
        
        for (var vessel in vessels) {
          final nahkodaId = vessel['nahkodaId'];
          final abkList = vessel['abk'] as List?;
          
          final isNahkoda = nahkodaId == currentUserId;
          final isAbk = abkList?.any((abk) => abk['id'] == currentUserId) ?? false;

          if (isNahkoda || isAbk) {
            final vesselId = vessel['id'].toString();
            print('✅ [VESSEL_SERVICE] Vessel ID from kapal: $vesselId');
            return vesselId;
          }
        }
      }
      print('❌ [VESSEL_SERVICE] No vessel ID from user settings');
      return null;
    } catch (e) {
      print('❌ [VESSEL_SERVICE] Error in getVesselIdFromUserSettings: $e');
      return null;
    }
  }

  Future<String?> getVesselIdFromTrip() async {
    print('\n🔍 [VESSEL_SERVICE] getVesselIdFromTrip called');
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userDataString = prefs.getString('user_data');
      
      if (token == null || userDataString == null) {
        print('❌ [VESSEL_SERVICE] Token or user_data is null');
        return null;
      }
      
      final userData = json.decode(userDataString);
      final currentUserId = userData['id'];
      print('👤 [VESSEL_SERVICE] Current user ID: $currentUserId');

      final url = '$baseUrl/api/trip';
      print('📡 [VESSEL_SERVICE] Calling: $url');

      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 30));

      print('📥 [VESSEL_SERVICE] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        print('✅ [VESSEL_SERVICE] Success: ${responseData['success']}');
        if (responseData['success'] == true && responseData['data'] != null) {
          final trips = responseData['data'] as List;
          print('🚢 [VESSEL_SERVICE] Total trips: ${trips.length}');
          
          for (var i = 0; i < trips.length; i++) {
            final trip = trips[i];
            final nahkodaId = trip['nahkodaId'];
            final awakKapal = trip['awakKapal'] as List?;
            final status = trip['status']?.toString().toLowerCase();
            
            print('   Trip #${i + 1}: status=$status, nahkodaId=$nahkodaId');
            
            if (status == 'selesai' || status == 'completed') {
              print('      Skipped (completed)');
              continue;
            }
            
            final isNahkoda = currentUserId != null && nahkodaId == currentUserId;
            final isCrew = currentUserId != null && awakKapal != null && awakKapal.contains(currentUserId);
            
            print('      isNahkoda=$isNahkoda, isCrew=$isCrew');
            
            if (isNahkoda || isCrew) {
              final kapal = trip['kapal'];
              print('      Kapal data: $kapal');
              if (kapal != null && kapal['id'] != null) {
                final vesselId = kapal['id'].toString();
                print('✅ [VESSEL_SERVICE] Vessel ID from trip: $vesselId');
                return vesselId;
              }
            }
          }
        }
      }
      print('❌ [VESSEL_SERVICE] No vessel ID from trip');
      return null;
    } catch (e) {
      print('❌ [VESSEL_SERVICE] Error in getVesselIdFromTrip: $e');
      return null;
    }
  }
}
