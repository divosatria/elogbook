import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class ProfilePhotoCache {
  static const String _photoUrlKey = 'cached_profile_photo_url';
  static const String _photoPathKey = 'cached_profile_photo_path';

  /// Download dan simpan foto profil ke local storage
  static Future<String?> cacheProfilePhoto(String photoUrl) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedUrl = prefs.getString(_photoUrlKey);
      final cachedPath = prefs.getString(_photoPathKey);

      // Jika URL sama dan file masih ada, return path yang sudah ada (skip download)
      if (cachedUrl == photoUrl && cachedPath != null) {
        final file = File(cachedPath);
        if (await file.exists()) {
          print('✅ Photo already cached, skipping download');
          return cachedPath;
        }
      }

      print('📥 Downloading new profile photo...');

      // Download foto baru ke temporary path dulu
      final dir = await getApplicationDocumentsDirectory();
      final fileName = _generateFileName(photoUrl);
      final filePath = '${dir.path}/profile_photos/$fileName';
      
      // Buat folder jika belum ada
      final folder = Directory('${dir.path}/profile_photos');
      if (!await folder.exists()) {
        await folder.create(recursive: true);
      }

      // Download file dengan timeout
      final dio = Dio();
      dio.options.connectTimeout = const Duration(seconds: 10);
      dio.options.receiveTimeout = const Duration(seconds: 10);
      
      await dio.download(photoUrl, filePath);
      
      // Setelah download berhasil, baru hapus foto lama
      if (cachedPath != null && cachedPath != filePath) {
        final oldFile = File(cachedPath);
        if (await oldFile.exists()) {
          await oldFile.delete();
          print('🗑️ Deleted old photo');
        }
      }
      
      // Simpan info ke SharedPreferences
      await prefs.setString(_photoUrlKey, photoUrl);
      await prefs.setString(_photoPathKey, filePath);
      
      print('✅ Photo downloaded and cached: $filePath');
      return filePath;
    } catch (e) {
      print('❌ Error caching photo: $e');
      return null;
    }
  }

  /// Get cached photo URL
  static Future<String?> getCachedPhotoUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_photoUrlKey);
    } catch (e) {
      return null;
    }
  }

  /// Get cached photo path
  static Future<String?> getCachedPhotoPath() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedPath = prefs.getString(_photoPathKey);
      
      if (cachedPath != null) {
        final file = File(cachedPath);
        if (await file.exists()) {
          return cachedPath;
        }
      }
      return null;
    } catch (e) {
      print('❌ Error getting cached photo: $e');
      return null;
    }
  }

  /// Clear cached photo
  static Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedPath = prefs.getString(_photoPathKey);
      
      if (cachedPath != null) {
        final file = File(cachedPath);
        if (await file.exists()) {
          await file.delete();
        }
      }
      
      await prefs.remove(_photoUrlKey);
      await prefs.remove(_photoPathKey);
      print('✅ Photo cache cleared');
    } catch (e) {
      print('❌ Error clearing cache: $e');
    }
  }

  /// Generate unique filename from URL
  static String _generateFileName(String url) {
    final hash = md5.convert(utf8.encode(url)).toString();
    final extension = url.split('.').last.split('?').first;
    return 'profile_$hash.$extension';
  }
}
