import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/user_model.dart';
import '../nitification/admin_notification_service.dart';
import 'package:flutter/material.dart';
import '../../utils/account_status_interceptor.dart';
import '../../utils/token_interceptor.dart';
import '../../config/api_config.dart';

class AuthService {
  // Centralized URL from ApiConfig (.env)
  static String get baseUrl => ApiConfig.apiUrl;

  static late Dio _dio;

  static void init() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      ),
    );

    _dio.interceptors.add(
      LogInterceptor(requestBody: true, responseBody: true),
    );
  }

  static void addAccountStatusInterceptor(BuildContext context) {
    _dio.interceptors.add(AccountStatusInterceptor(context));
  }

  static void addTokenInterceptor(BuildContext context) {
    _dio.interceptors.removeWhere((i) => i is TokenInterceptor);
    _dio.interceptors.add(TokenInterceptor(context: context));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/mobile/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final token = response.data['token'];
        final user = await _processUserData(response.data['user']);

        if (token != null) await saveToken(token);
        await _fetchVesselDataFromTrip(token, user.id);
        await _initializeUserNotifications(user);

        return {
          'success': true,
          'user': user,
          'token': token,
          'message': 'Login berhasil',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Login gagal',
      };
    } on DioException catch (e) {
      return _handleLoginError(e);
    } catch (e) {
      return {'success': false, 'message': 'Terjadi kesalahan tidak terduga'};
    }
  }

  static Future<UserModel> _processUserData(
      Map<String, dynamic> userData) async {
    final profile = userData['profile'] ?? {};

    String mappedRole = 'Crew';
    if (userData['role'] != null) {
      final apiRole = userData['role'].toString().toLowerCase();
      if (apiRole == 'nahkoda') mappedRole = 'Nahkoda';
    }

    return UserModel(
      id: userData['id'] is int
          ? userData['id']
          : int.tryParse(userData['id'].toString()) ?? 0,
      name: profile['nama'] ?? '',
      email: userData['email'] ?? '',
      phone: profile['telepon'] ?? '',
      address: profile['alamat'],
      role: mappedRole,
      profilePicture: null,
      vesselName: null,
      vesselNumber: null,
      captainName: null,
    );
  }

  static Future<void> _fetchVesselDataFromTrip(String token, int userId) async {
    try {
      final tripResponse = await _dio.get(
        '/trip',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (tripResponse.statusCode == 200 &&
          tripResponse.data['success'] == true) {
        final trips = tripResponse.data['data'] as List;

        // Filter trip: user adalah nahkoda ATAU crew, DAN status bukan selesai
        for (var trip in trips) {
          final nahkodaId = trip['nahkodaId'];
          final awakKapal = trip['awakKapal'] as List?;
          final status = trip['status']?.toString().toLowerCase();

          // Skip jika trip sudah selesai
          if (status == 'selesai' || status == 'completed') continue;

          // Cek apakah user adalah nahkoda atau crew
          final isNahkoda = nahkodaId == userId;
          final isCrew = awakKapal != null && awakKapal.contains(userId);

          if (isNahkoda || isCrew) {
            final kapal = trip['kapal'];
            final nahkoda = trip['nahkoda'];

            final prefs = await SharedPreferences.getInstance();
            await prefs.setString(
              'vessel_data',
              jsonEncode({
                'kapal': {
                  'id': kapal['id'],
                  'namaKapal': kapal['namaKapal'],
                  'nomorRegistrasi': kapal['nomorRegistrasi'],
                },
                'nahkoda': nahkoda != null
                    ? {
                        'id': nahkoda['id'],
                        'nama': nahkoda['nama'],
                        'username': nahkoda['username'],
                      }
                    : null,
                'tripId': trip['id'],
                'tripStatus': trip['status'],
              }),
            );
            break; // Ambil trip pertama yang match
          }
        }
      }
    } catch (e) {
      // Silent fail - vessel data is optional
    }
  }

  static Future<void> _initializeUserNotifications(UserModel user) async {
    if (user.isNahkoda) {
      try {
        await AdminNotificationService.initializeNahkodaDocuments(user.email);
        await AdminNotificationService.createAdminNotification(
          userId: user.email,
          title: 'Selamat Datang, Nahkoda!',
          message:
              'Mohon lengkapi dokumen-dokumen yang diperlukan sebelum memulai trip pertama Anda.',
          type: 'document_requirement',
          isUrgent: true,
        );
      } catch (e) {
        // Silent fail - notifications are optional
      }
    }
  }

  static Map<String, dynamic> _handleLoginError(DioException e) {
    if (e.response?.statusCode == 400) {
      return {
        'success': false,
        'message':
            e.response?.data['message'] ?? 'Email dan password wajib diisi'
      };
    } else if (e.response?.statusCode == 401) {
      final message =
          e.response?.data['message'] ?? 'Email atau password salah';
      return {
        'success': false,
        'message': message,
        'isAccountInactive': message.toLowerCase().contains('tidak aktif')
      };
    } else if (e.response?.statusCode == 403) {
      return {
        'success': false,
        'message': e.response?.data['message'] ??
            'Akun tidak memiliki akses mobile app'
      };
    } else if (e.response?.statusCode == 429) {
      return {
        'success': false,
        'message': e.response?.data['message'] ??
            'Terlalu banyak percobaan, coba lagi nanti'
      };
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return {
        'success': false,
        'message': 'Koneksi timeout. Periksa koneksi internet Anda',
        'isTimeout': true
      };
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return {
        'success': false,
        'message': 'Server tidak merespons. Coba lagi nanti',
        'isTimeout': true
      };
    } else if (e.type == DioExceptionType.connectionError) {
      return {
        'success': false,
        'message':
            'Tidak dapat terhubung ke server. Periksa koneksi internet Anda'
      };
    } else if (e.type == DioExceptionType.sendTimeout) {
      return {
        'success': false,
        'message': 'Gagal mengirim data. Coba lagi',
        'isTimeout': true
      };
    }
    return {
      'success': false,
      'message': e.response?.data['message'] ?? 'Login gagal. Coba lagi'
    };
  }

  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await _dio.post(
        '/auth/forgot-password',
        data: {'email': email},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'message': response.data['message'] ??
              'Link reset password telah dikirim ke email Anda',
        };
      }

      return {
        'success': false,
        'message':
            response.data['message'] ?? 'Gagal mengirim link reset password',
      };
    } on DioException catch (e) {
      return _handleForgotPasswordError(e);
    } catch (e) {
      return {'success': false, 'message': 'Terjadi kesalahan tidak terduga'};
    }
  }

  static Map<String, dynamic> _handleForgotPasswordError(DioException e) {
    if (e.response?.statusCode == 404) {
      return {'success': false, 'message': 'Email tidak terdaftar'};
    } else if (e.response?.statusCode == 400) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Email tidak valid'
      };
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return {'success': false, 'message': 'Koneksi timeout'};
    } else if (e.type == DioExceptionType.connectionError) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server'};
    }
    return {
      'success': false,
      'message':
          e.response?.data['message'] ?? 'Gagal mengirim link reset password'
    };
  }

  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final token = await getToken();
      if (token == null) {
        return {'success': false, 'message': 'Token tidak ditemukan'};
      }

      final response = await _dio.post(
        '/mobile/change-password',
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
          'new_password_confirmation': confirmPassword,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'message': response.data['message'] ?? 'Password berhasil diubah',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Gagal mengubah password',
      };
    } on DioException catch (e) {
      return _handleChangePasswordError(e);
    } catch (e) {
      return {'success': false, 'message': 'Terjadi kesalahan tidak terduga'};
    }
  }

  static Map<String, dynamic> _handleChangePasswordError(DioException e) {
    if (e.response?.statusCode == 400) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Data tidak valid'
      };
    } else if (e.response?.statusCode == 401) {
      return {'success': false, 'message': 'Password lama tidak sesuai'};
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return {'success': false, 'message': 'Koneksi timeout'};
    } else if (e.type == DioExceptionType.connectionError) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server'};
    }
    return {
      'success': false,
      'message': e.response?.data['message'] ?? 'Gagal mengubah password'
    };
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    await prefs.remove('vessel_data');
    await prefs.remove('popup_shown_this_session');

    // Clear profile photo cache
    await prefs.remove('cached_profile_photo_url');
    await prefs.remove('cached_profile_photo_path');

    debugPrint('✅ Logout complete - all data cleared');
  }
}
