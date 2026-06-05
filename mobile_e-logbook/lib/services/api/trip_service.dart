import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class TokenExpiredException implements Exception {
  final String message;
  TokenExpiredException(this.message);
  @override
  String toString() => message;
}

class TripService {
  static String get baseUrl => ApiConfig.baseUrl;

  // ==================== GET ALL TRIPS (with full data) ====================
  
  /// Get all trips with full details (nahkoda, awakKapal, durasi, etc)
  static Future<Map<String, dynamic>> getAllTrips() async {
    try {
      print('\n========== GET ALL TRIPS START ==========');
      
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/trip';
      print('🌐 [TRIPS] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [TRIPS] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [TRIPS] All trips retrieved');
        print('========== GET ALL TRIPS END (SUCCESS) ==========\n');
        return result;
      } else if (response.statusCode == 401) {
        print('🔐 [TRIPS] Token expired (401)');
        print('========== GET ALL TRIPS END (TOKEN EXPIRED) ==========\n');
        throw TokenExpiredException('Token sudah expired');
      } else {
        print('❌ [TRIPS] Failed: ${response.statusCode}');
        print('========== GET ALL TRIPS END (FAILED) ==========\n');
        throw Exception('Gagal mengambil data trips');
      }
    } catch (e) {
      print('❌ [TRIPS] Exception: $e');
      print('========== GET ALL TRIPS END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  // Get trip detail by ID
  static Future<Map<String, dynamic>> getTripDetail(int tripId) async {
    try {
      print('\n========== GET TRIP DETAIL START ==========');
      print('🔍 [TRIP] Trip ID: $tripId');
      
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/trip/$tripId';
      print('🌐 [TRIP] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [TRIP] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [TRIP] Trip detail retrieved');
        print('========== GET TRIP DETAIL END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [TRIP] Failed: ${response.statusCode}');
        print('========== GET TRIP DETAIL END (FAILED) ==========\n');
        throw Exception('Gagal mengambil detail trip');
      }
    } catch (e) {
      print('❌ [TRIP] Exception: $e');
      print('========== GET TRIP DETAIL END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }
  
  /// Upload dokumen perizinan trip (NAHKODA ONLY)
  /// jenisDokumen: izinMelaut, dokumenKapal, asuransi
  static Future<Map<String, dynamic>> uploadTripDocument({
    required int tripId,
    required String jenisDokumen,
    required String filePath,
    String? keterangan,
  }) async {
    try {
      print('\n========== UPLOAD TRIP DOCUMENT START ==========');
      print('📤 [DOC] Trip ID: $tripId');
      print('📤 [DOC] Jenis Dokumen: $jenisDokumen');
      print('📤 [DOC] File Path: $filePath');
      print('📤 [DOC] Keterangan: ${keterangan ?? "(kosong)"}');

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/trip/$tripId/upload-document';
      print('🌐 [DOC] URL: $url');

      var request = http.MultipartRequest('POST', Uri.parse(url));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['jenisDokumen'] = jenisDokumen;
      
      if (keterangan != null && keterangan.isNotEmpty) {
        request.fields['keterangan'] = keterangan;
      }

      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('File tidak ditemukan: $filePath');
      }

      String contentType = 'application/pdf';
      if (filePath.toLowerCase().endsWith('.jpg') ||
          filePath.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filePath.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      }

      print('📎 [DOC] Uploading file: ${filePath.split('/').last}');
      print('📎 [DOC] Content-Type: $contentType');
      print('📎 [DOC] File size: ${await file.length()} bytes');

      request.files.add(
        await http.MultipartFile.fromPath(
          'dokumen',
          filePath,
          contentType: http_parser.MediaType.parse(contentType),
        ),
      );

      print('📤 [DOC] Sending request...');
      final streamedResponse = await request.send().timeout(
        const Duration(minutes: 2),
      );
      final response = await http.Response.fromStream(streamedResponse);

      print('📥 [DOC] Response status: ${response.statusCode}');
      print('📥 [DOC] Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [DOC] Upload successful!');
        print('📊 [DOC] All documents complete: ${result['data']?['allDocumentsComplete']}');
        print('📊 [DOC] Trip status: ${result['data']?['tripStatus']}');
        print('========== UPLOAD TRIP DOCUMENT END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [DOC] Upload failed: ${response.statusCode}');
        print('========== UPLOAD TRIP DOCUMENT END (FAILED) ==========\n');
        throw Exception('Gagal upload dokumen: ${response.body}');
      }
    } catch (e) {
      print('❌ [DOC] Exception: $e');
      print('========== UPLOAD TRIP DOCUMENT END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Get trip documents status
  static Future<Map<String, dynamic>> getTripDocuments(int tripId) async {
    try {
      print('\n========== GET TRIP DOCUMENTS START ==========');
      print('🔍 [DOC] Trip ID: $tripId');
      
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/mobile/trip/$tripId/documents';
      print('🌐 [DOC] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [DOC] Response status: ${response.statusCode}');
      print('📥 [DOC] Response body: ${response.body}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [DOC] Documents retrieved');
        print('========== GET TRIP DOCUMENTS END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [DOC] Failed: ${response.statusCode}');
        print('========== GET TRIP DOCUMENTS END (FAILED) ==========\n');
        throw Exception('Gagal mengambil dokumen trip');
      }
    } catch (e) {
      print('❌ [DOC] Exception: $e');
      print('========== GET TRIP DOCUMENTS END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  // ==================== ABK/CREW: UPLOAD DATA OPERASIONAL ====================

  /// Upload data bahan bakar (ABK Only)
  static Future<Map<String, dynamic>> uploadFuelData({
    required int tripId,
    required String jenisBahanBakar,
    required double jumlahLiter,
    required double hargaPerLiter,
    required double totalHarga,
    required String tanggalPengisian,
    String? lokasiPengisian,
    String? keterangan,
    String? buktiFilePath,
  }) async {
    try {
      print('\n========== UPLOAD FUEL DATA START ==========');
      print('📤 [FUEL] Trip ID: $tripId');
      print('📤 [FUEL] Jenis: $jenisBahanBakar');
      print('📤 [FUEL] Jumlah: $jumlahLiter L');
      print('📤 [FUEL] Harga/L: Rp $hargaPerLiter');
      print('📤 [FUEL] Total: Rp $totalHarga');
      print('📤 [FUEL] Tanggal: $tanggalPengisian');
      print('📤 [FUEL] Lokasi: ${lokasiPengisian ?? "(kosong)"}');
      print('📤 [FUEL] Keterangan: ${keterangan ?? "(kosong)"}');
      print('📤 [FUEL] Bukti: ${buktiFilePath ?? "(tidak ada)"}');

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/mobile/trip/$tripId/fuel-data';
      print('🌐 [FUEL] URL: $url');

      var request = http.MultipartRequest('POST', Uri.parse(url));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['jenisBahanBakar'] = jenisBahanBakar;
      request.fields['jumlahLiter'] = jumlahLiter.toString();
      request.fields['hargaPerLiter'] = hargaPerLiter.toString();
      request.fields['totalHarga'] = totalHarga.toString();
      request.fields['tanggalPengisian'] = tanggalPengisian;
      
      if (lokasiPengisian != null && lokasiPengisian.isNotEmpty) {
        request.fields['lokasiPengisian'] = lokasiPengisian;
      }
      
      if (keterangan != null && keterangan.isNotEmpty) {
        request.fields['keterangan'] = keterangan;
      }

      if (buktiFilePath != null && buktiFilePath.isNotEmpty) {
        final file = File(buktiFilePath);
        if (!await file.exists()) {
          throw Exception('File tidak ditemukan: $buktiFilePath');
        }

        String contentType = 'image/jpeg';
        if (buktiFilePath.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        }

        print('📎 [FUEL] Uploading file: ${buktiFilePath.split('/').last}');
        print('📎 [FUEL] Content-Type: $contentType');
        print('📎 [FUEL] File size: ${await file.length()} bytes');

        request.files.add(
          await http.MultipartFile.fromPath(
            'bukti',
            buktiFilePath,
            contentType: http_parser.MediaType.parse(contentType),
          ),
        );
      }

      print('📤 [FUEL] Sending request...');
      final streamedResponse = await request.send().timeout(
        const Duration(minutes: 2),
      );
      final response = await http.Response.fromStream(streamedResponse);

      print('📥 [FUEL] Response status: ${response.statusCode}');
      print('📥 [FUEL] Response body: ${response.body}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [FUEL] Upload successful!');
        print('📊 [FUEL] Trip ID: ${result['data']?['tripId']}');
        print('========== UPLOAD FUEL DATA END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [FUEL] Upload failed: ${response.statusCode}');
        print('========== UPLOAD FUEL DATA END (FAILED) ==========\n');
        throw Exception('Gagal upload data bahan bakar: ${response.body}');
      }
    } catch (e) {
      print('❌ [FUEL] Exception: $e');
      print('========== UPLOAD FUEL DATA END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Upload data es (ABK Only)
  static Future<Map<String, dynamic>> uploadIceData({
    required int tripId,
    required String jenisEs,
    required double jumlahKg,
    required double hargaPerKg,
    required double totalHarga,
    required String tanggalPembelian,
    String? lokasiPembelian,
    String? keterangan,
    String? buktiFilePath,
  }) async {
    try {
      print('\n========== UPLOAD ICE DATA START ==========');
      print('📤 [ICE] Trip ID: $tripId');
      print('📤 [ICE] Jenis: $jenisEs');
      print('📤 [ICE] Jumlah: $jumlahKg Kg');
      print('📤 [ICE] Harga/Kg: Rp $hargaPerKg');
      print('📤 [ICE] Total: Rp $totalHarga');
      print('📤 [ICE] Tanggal: $tanggalPembelian');
      print('📤 [ICE] Lokasi: ${lokasiPembelian ?? "(kosong)"}');
      print('📤 [ICE] Keterangan: ${keterangan ?? "(kosong)"}');
      print('📤 [ICE] Bukti: ${buktiFilePath ?? "(tidak ada)"}');

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/mobile/trip/$tripId/ice-data';
      print('🌐 [ICE] URL: $url');

      var request = http.MultipartRequest('POST', Uri.parse(url));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['jenisEs'] = jenisEs;
      request.fields['jumlahKg'] = jumlahKg.toString();
      request.fields['hargaPerKg'] = hargaPerKg.toString();
      request.fields['totalHarga'] = totalHarga.toString();
      request.fields['tanggalPembelian'] = tanggalPembelian;
      
      if (lokasiPembelian != null && lokasiPembelian.isNotEmpty) {
        request.fields['lokasiPembelian'] = lokasiPembelian;
      }
      
      if (keterangan != null && keterangan.isNotEmpty) {
        request.fields['keterangan'] = keterangan;
      }

      if (buktiFilePath != null && buktiFilePath.isNotEmpty) {
        final file = File(buktiFilePath);
        if (!await file.exists()) {
          throw Exception('File tidak ditemukan: $buktiFilePath');
        }

        String contentType = 'image/jpeg';
        if (buktiFilePath.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        }

        print('📎 [ICE] Uploading file: ${buktiFilePath.split('/').last}');
        print('📎 [ICE] Content-Type: $contentType');
        print('📎 [ICE] File size: ${await file.length()} bytes');

        request.files.add(
          await http.MultipartFile.fromPath(
            'bukti',
            buktiFilePath,
            contentType: http_parser.MediaType.parse(contentType),
          ),
        );
      }

      print('📤 [ICE] Sending request...');
      final streamedResponse = await request.send().timeout(
        const Duration(minutes: 2),
      );
      final response = await http.Response.fromStream(streamedResponse);

      print('📥 [ICE] Response status: ${response.statusCode}');
      print('📥 [ICE] Response body: ${response.body}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [ICE] Upload successful!');
        print('📊 [ICE] Trip ID: ${result['data']?['tripId']}');
        print('========== UPLOAD ICE DATA END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [ICE] Upload failed: ${response.statusCode}');
        print('========== UPLOAD ICE DATA END (FAILED) ==========\n');
        throw Exception('Gagal upload data es: ${response.body}');
      }
    } catch (e) {
      print('❌ [ICE] Exception: $e');
      print('========== UPLOAD ICE DATA END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Get trip operational data (fuel + ice)
  static Future<Map<String, dynamic>> getTripOperationalData(int tripId) async {
    try {
      print('\n========== GET TRIP OPERATIONAL DATA START ==========');
      print('🔍 [OPERATIONAL] Trip ID: $tripId');
      
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/mobile/trip/$tripId/operational';
      print('🌐 [OPERATIONAL] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [OPERATIONAL] Response status: ${response.statusCode}');
      print('📥 [OPERATIONAL] Response body: ${response.body}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        print('✅ [OPERATIONAL] Data retrieved');
        print('========== GET TRIP OPERATIONAL DATA END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [OPERATIONAL] Failed: ${response.statusCode}');
        print('========== GET TRIP OPERATIONAL DATA END (FAILED) ==========\n');
        throw Exception('Gagal mengambil data operasional');
      }
    } catch (e) {
      print('❌ [OPERATIONAL] Exception: $e');
      print('========== GET TRIP OPERATIONAL DATA END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Update trip status
  static Future<Map<String, dynamic>> updateTripStatus(int tripId, String status) async {
    try {
      print('\n========== UPDATE TRIP STATUS START ==========');
      print('🔄 [STATUS] Trip ID: $tripId');
      print('🔄 [STATUS] New Status: $status');
      
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      // Use PUT method for update
      final url = '$baseUrl/api/trip/$tripId/status';
      print('🌐 [STATUS] URL: $url');
      print('🌐 [STATUS] Method: PUT');

      final response = await http.put(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': status}),
      ).timeout(const Duration(seconds: 30));

      print('📥 [STATUS] Response status: ${response.statusCode}');
      print('📥 [STATUS] Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        print('✅ [STATUS] Status updated successfully');
        print('========== UPDATE TRIP STATUS END (SUCCESS) ==========\n');
        return result;
      } else {
        print('❌ [STATUS] Failed: ${response.statusCode}');
        print('========== UPDATE TRIP STATUS END (FAILED) ==========\n');
        throw Exception('Gagal update status trip: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [STATUS] Exception: $e');
      print('========== UPDATE TRIP STATUS END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }
}
