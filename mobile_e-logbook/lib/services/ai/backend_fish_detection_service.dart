import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../config/api_config.dart';
import '../api/auth_service.dart';

class FishDetectionResult {
  final String fishName;
  final String fishType;
  final String condition;
  final double estimatedLength;
  final double estimatedHeight;
  final double estimatedWeight;
  final int estimatedQuantity;
  final double confidence;
  final String freshness;
  final double estimatedPrice;
  final String notes;
  final double unitWeight;

  FishDetectionResult({
    required this.fishName,
    required this.fishType,
    required this.condition,
    required this.estimatedLength,
    required this.estimatedHeight,
    required this.estimatedWeight,
    required this.estimatedQuantity,
    required this.confidence,
    required this.freshness,
    required this.estimatedPrice,
    this.notes = '',
    double? unitWeight,
  }) : unitWeight = unitWeight ?? (estimatedWeight / estimatedQuantity);
}

class BackendFishDetectionService {
  static Future<FishDetectionResult> detectFish(File image) async {
    try {
      debugPrint('\n🔍 ========== BACKEND AI DETECTION START ==========');
      debugPrint('📁 Image path: ${image.path}');
      
      final token = await AuthService.getToken();
      if (token == null) {
        throw Exception('Tidak ada token autentikasi. Silakan login kembali.');
      }

      final dio = Dio(
        BaseOptions(
          baseUrl: ApiConfig.apiUrl,
          connectTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 60),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        ),
      );

      final String fileName = image.path.split('/').last;
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(
          image.path,
          filename: fileName,
        ),
      });

      debugPrint('📤 Sending image to backend AI Service...');
      
      final response = await dio.post(
        '/mobile/predict-fish',
        data: formData,
      );

      debugPrint('📥 Response status: ${response.statusCode}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        debugPrint('✅ Backend API Response OK');
        final fishData = response.data['data'];
        
        debugPrint('🐟 Detected fish: ${fishData['fishName']}');
        
        double rawWeight = (fishData['estimatedWeight'] ?? 0.5).toDouble();
        double rawLength = (fishData['estimatedLength'] ?? 20.0).toDouble();
        int quantity = (fishData['estimatedQuantity'] ?? 1).toInt();
        String fishName = fishData['fishName'] ?? 'Ikan Tidak Teridentifikasi';
        
        // Let's just use what the backend gives.
        double unitWeight = rawWeight / quantity;

        debugPrint('========== BACKEND AI DETECTION SUCCESS ==========\n');

        return FishDetectionResult(
          fishName: fishName,
          fishType: fishData['fishType'] ?? 'Ikan Laut',
          condition: fishData['condition'] ?? 'Normal',
          estimatedLength: rawLength,
          estimatedHeight: (fishData['estimatedHeight'] ?? (rawLength * 0.3)).toDouble(),
          estimatedWeight: rawWeight,
          estimatedQuantity: quantity,
          confidence: (fishData['confidence'] ?? 0.0).toDouble(),
          freshness: fishData['freshness'] ?? 'Tidak terdeteksi',
          estimatedPrice: 0.0,
          notes: fishData['notes'] ?? 'Analisis visual AI (Backend) selesai.',
          unitWeight: unitWeight,
        );
      } else {
        throw Exception(response.data['message'] ?? 'Gagal melakukan deteksi ikan dari backend.');
      }
    } on DioException catch (e) {
      debugPrint('❌ Dio error: ${e.message}');
      if (e.response != null) {
        debugPrint('🔴 Backend Error Data: ${e.response?.data}');
        final msg = e.response?.data['message'] ?? 'Terjadi kesalahan dari server AI.';
        throw Exception('Server Error: $msg');
      }
      throw Exception('Koneksi ke server AI gagal: ${e.message}');
    } catch (e) {
      debugPrint('❌ Exception caught: $e');
      debugPrint('========== BACKEND AI DETECTION ERROR ==========\n');
      rethrow;
    }
  }
}
