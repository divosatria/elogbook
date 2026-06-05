import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
import '../../config/api_config.dart';

class DocumentService {
  static String get baseUrl => ApiConfig.apiUrl;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(minutes: 2),
      receiveTimeout: const Duration(minutes: 2),
      sendTimeout: const Duration(minutes: 2),
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    ),
  );

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<Map<String, dynamic>> uploadDocument({
    required String jenisDokumen,
    String? nomorDokumen,
    String? tanggalBerlaku,
    required String filePath,
    String? keterangan,
  }) async {
    try {
      print('📤 Uploading document:');
      print('  - jenisDokumen: $jenisDokumen');
      print('  - nomorDokumen: $nomorDokumen');
      print('  - tanggalBerlaku: $tanggalBerlaku');
      print('  - filePath: $filePath');
      print('  - keterangan: $keterangan');

      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      // Check file size
      final file = File(filePath);
      final fileSize = await file.length();
      print('📁 File size: ${(fileSize / 1024 / 1024).toStringAsFixed(2)} MB');

      if (fileSize > 10 * 1024 * 1024) {
        // 10MB limit
        return {
          'success': false,
          'message': 'File terlalu besar. Maksimal 10MB',
        };
      }

      // Build FormData - hanya kirim field yang ada nilainya
      final formDataMap = <String, dynamic>{
        'jenisDokumen': jenisDokumen,
        'file': await MultipartFile.fromFile(
          filePath,
          filename: filePath.split(RegExp(r'[\\\\/]')).last,
        ),
      };

      // Hanya tambahkan field jika ada nilainya
      if (nomorDokumen != null && nomorDokumen.isNotEmpty) {
        formDataMap['nomorDokumen'] = nomorDokumen;
      }
      if (tanggalBerlaku != null && tanggalBerlaku.isNotEmpty) {
        formDataMap['tanggalBerlaku'] = tanggalBerlaku;
      }
      if (keterangan != null && keterangan.isNotEmpty) {
        formDataMap['keterangan'] = keterangan;
      }

      FormData formData = FormData.fromMap(formDataMap);

      // Debug: Print semua field yang akan dikirim
      print('📋 FormData fields:');
      for (var field in formData.fields) {
        print('   - ${field.key}: ${field.value}');
      }
      for (var file in formData.files) {
        print('   - ${file.key}: ${file.value.filename}');
      }

      print('🚀 Starting upload...');
      final response = await _dio.post(
        '/mobile/profile/documents',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'multipart/form-data',
          },
        ),
        onSendProgress: (sent, total) {
          final progress = (sent / total * 100).toStringAsFixed(1);
          print('📤 Upload progress: $progress%');
        },
      );

      print('📡 Response status: ${response.statusCode}');
      print('📡 Response data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'message': response.data['message'],
          'data': response.data['data'],
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal upload dokumen',
      };
    } on DioException catch (e) {
      print('❌ DioException: ${e.type}');
      print('❌ Response: ${e.response?.data}');
      print('❌ Status code: ${e.response?.statusCode}');

      // Print detailed error information
      if (e.response?.data != null && e.response?.data['errors'] != null) {
        print('❌ Detailed errors:');
        for (var error in e.response?.data['errors']) {
          print('   - ${error['message']}');
        }
      }

      String errorMessage = 'Gagal upload dokumen';
      if (e.type == DioExceptionType.connectionTimeout) {
        errorMessage = 'Koneksi timeout. Periksa koneksi internet Anda';
      } else if (e.type == DioExceptionType.sendTimeout) {
        errorMessage = 'Upload timeout. File mungkin terlalu besar';
      } else if (e.type == DioExceptionType.receiveTimeout) {
        errorMessage = 'Server tidak merespons. Coba lagi nanti';
      } else if (e.response?.statusCode == 419) {
        errorMessage = 'Session expired. Silakan login ulang';
      }

      return {
        'success': false,
        'message': e.response?.data['message'] ?? errorMessage,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Gagal upload dokumen: ${e.toString()}',
      };
    }
  }

  static Future<Map<String, dynamic>> getDocuments() async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      print('📥 Fetching documents...');
      final response = await _dio.get(
        '/mobile/profile/documents',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      print('📡 Response status: ${response.statusCode}');
      print('📡 Response data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        dynamic documentsData = response.data['data'];

        // Extract dokumen array from nested structure
        if (documentsData is Map && documentsData.containsKey('dokumen')) {
          documentsData = documentsData['dokumen'];
        }

        if (documentsData is! List) {
          documentsData = documentsData != null ? [documentsData] : [];
        }

        // Filter untuk hanya ambil dokumen terbaru per jenis
        final filteredDocs = _filterLatestDocuments(documentsData);
        print(
          '📋 Filtered ${documentsData.length} docs to ${filteredDocs.length} unique docs',
        );

        return {'success': true, 'documents': filteredDocs};
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil dokumen',
      };
    } on DioException catch (e) {
      print('❌ DioException: ${e.type}');
      print('❌ Response: ${e.response?.data}');
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Gagal mengambil dokumen',
      };
    } catch (e) {
      print('❌ Error: $e');
      return {
        'success': false,
        'message': 'Gagal mengambil dokumen: ${e.toString()}',
      };
    }
  }

  // Filter untuk mengambil hanya dokumen terbaru per jenis
  static List<dynamic> _filterLatestDocuments(List<dynamic> documents) {
    final Map<String, dynamic> latestDocs = {};

    for (var doc in documents) {
      final jenis = doc['jenisDokumen'];
      if (jenis == null) continue;

      final docId = doc['id'];
      final uploadedAt = doc['uploadedAt'] ?? doc['createdAt'] ?? '';

      // Jika belum ada dokumen jenis ini, atau dokumen ini lebih baru
      if (!latestDocs.containsKey(jenis)) {
        latestDocs[jenis] = doc;
      } else {
        final existingUploadedAt = latestDocs[jenis]['uploadedAt'] ??
            latestDocs[jenis]['createdAt'] ??
            '';
        final existingId = latestDocs[jenis]['id'];

        // Bandingkan timestamp, atau jika sama bandingkan ID (yang lebih besar = lebih baru)
        if (uploadedAt.compareTo(existingUploadedAt) > 0 ||
            (uploadedAt == existingUploadedAt &&
                docId != null &&
                existingId != null &&
                int.tryParse(docId.toString()) != null &&
                int.tryParse(existingId.toString()) != null &&
                int.parse(docId.toString()) >
                    int.parse(existingId.toString()))) {
          latestDocs[jenis] = doc;
        }
      }
    }

    return latestDocs.values.toList();
  }
}
