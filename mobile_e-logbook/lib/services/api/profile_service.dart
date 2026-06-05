import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/local/secure_storage_service.dart';
import '../../models/user_model.dart';
import '../../config/api_config.dart';

class ProfileService {
  static String get baseUrl => ApiConfig.apiUrl;

  static String get baseUrlWithoutApi => ApiConfig.baseUrl;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Accept': 'application/json'},
    ),
  );

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return await SecureStorageService.getToken();
  }

  static Future<Map<String, dynamic>> getProfile() async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      final response = await _dio.get(
        '/mobile/profile',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];

        String mappedRole = 'Nahkoda';
        if (data['role'] != null) {
          final apiRole = data['role'].toString().toLowerCase();
          if (apiRole == 'abk') {
            mappedRole = 'ABK';
          } else if (apiRole == 'nahkoda') {
            mappedRole = 'Nahkoda';
          }
        }

        String? photoUrl;
        final fotoUrl = data['fotoUrl'];
        final foto = data['foto'];

        if (fotoUrl != null && fotoUrl.toString().isNotEmpty) {
          final path = fotoUrl.toString();
          if (path.startsWith('http')) {
            photoUrl = path;
          } else if (path.startsWith('/')) {
            photoUrl = '$baseUrlWithoutApi$path';
          } else {
            photoUrl = '$baseUrlWithoutApi/uploads/profile-photos/$path';
          }
        } else if (foto != null && foto.toString().isNotEmpty) {
          final path = foto.toString();
          if (path.startsWith('http')) {
            photoUrl = path;
          } else if (path.startsWith('/')) {
            photoUrl = '$baseUrlWithoutApi$path';
          } else {
            photoUrl = '$baseUrlWithoutApi/uploads/profile-photos/$path';
          }
        }

        final user = UserModel(
          id: data['id'] is int
              ? data['id']
              : int.tryParse(data['id'].toString()) ?? 0,
          name: data['nama'] ?? '',
          username: data['username'],
          email: data['email'] ?? '',
          phone: data['noTelepon'] ?? '',
          address: data['alamat'],
          role: mappedRole,
          profilePicture: photoUrl,
        );

        return {
          'success': true,
          'user': user,
          'isActive': data['isActive'] ?? true,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengambil profil',
      };
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final message = e.response?.data['message'] ?? '';
        return {
          'success': false,
          'message': message,
          'isAccountInactive': message.toLowerCase().contains('tidak aktif'),
        };
      }
      return {'success': false, 'message': 'Gagal mengambil profil'};
    } catch (e) {
      return {
        'success': false,
        'message': 'Terjadi kesalahan: ${e.toString()}',
      };
    }
  }

  static Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? username,
    String? phone,
    String? address,
    String? photoPath,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      FormData formData = FormData.fromMap({
        if (name != null) 'nama': name,
        if (username != null) 'username': username,
        if (phone != null) 'noTelepon': phone,
        if (address != null) 'alamat': address,
        if (photoPath != null)
          'foto': await MultipartFile.fromFile(
            photoPath,
            filename: photoPath.split(RegExp(r'[\\/]')).last,
          ),
      });

      final response = await _dio.put(
        '/mobile/profile',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        String? newPhotoUrl;
        if (response.data['data'] != null) {
          if (response.data['data']['foto'] != null) {
            final fotoPath = response.data['data']['foto'].toString();

            if (fotoPath.isNotEmpty) {
              if (fotoPath.startsWith('http')) {
                newPhotoUrl = fotoPath;
              } else if (fotoPath.startsWith('/')) {
                newPhotoUrl = '$baseUrlWithoutApi$fotoPath';
              } else {
                newPhotoUrl =
                    '$baseUrlWithoutApi/uploads/profile-photos/$fotoPath';
              }
            }
          }
        }

        return {
          'success': true,
          'message': 'Profil berhasil diperbarui',
          'photoUrl': newPhotoUrl,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal memperbarui profil',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data['message'] ??
            'Gagal memperbarui profil: ${e.message}',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Gagal memperbarui profil: ${e.toString()}',
      };
    }
  }
}
