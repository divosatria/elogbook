import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'dart:async';
import '../models/user_model.dart';
import '../config/api_config.dart';

class UserProvider extends ChangeNotifier {
  UserModel? _user;
  Timer? _syncTimer;

  UserModel? get user => _user;

  void startAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) async {
      final token = await _getToken();
      if (token != null) {
        await _loadProfilePictureFromAPI(token);
      }
    });
  }

  void stopAutoSync() {
    _syncTimer?.cancel();
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    super.dispose();
  }

  Future<void> loadUserFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    final userData = prefs.getString('user_data');

    if (token != null && userData != null) {
      final Map<String, dynamic> userMap = jsonDecode(userData);

      _user = UserModel(
        id: userMap['id'],
        name: userMap['name'],
        username: userMap['username'] ?? '',
        email: userMap['email'] ?? '',
        phone: userMap['phone'] ?? '',
        address: userMap['address'],
        token: token,
        role: userMap['role'],
        profilePicture: userMap['profile_picture'],
      );

      notifyListeners();

      // Load profile picture from API
      await _loadProfilePictureFromAPI(token);

      notifyListeners();
    }
  }

  Future<void> _loadProfilePictureFromAPI(String token) async {
    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      print('🔄 [UserProvider] Syncing profile from API...');
      final response = await dio.get(
        '/api/mobile/profile',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Cache-Control': 'no-cache',
          },
        ),
      );

      print('📡 [UserProvider] API Response: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final profileData = response.data['data'];
        final photoUrl = profileData['foto'] ?? profileData['fotoUrl'];
        final nama = profileData['nama'];
        final username = profileData['username'];

        print('📸 [UserProvider] Photo from API: $photoUrl');
        print('📝 [UserProvider] Name from API: $nama');
        print('📝 [UserProvider] Username from API: $username');
        print('📸 [UserProvider] Current photo: ${_user?.profilePicture}');
        print('📝 [UserProvider] Current name: ${_user?.name}');

        if (_user != null) {
          String? fullPhotoUrl;
          if (photoUrl != null && photoUrl.toString().isNotEmpty) {
            final timestamp = DateTime.now().millisecondsSinceEpoch;
            final path = photoUrl.toString();

            if (path.startsWith('http')) {
              fullPhotoUrl = '$path?t=$timestamp';
            } else if (path.startsWith('/')) {
              fullPhotoUrl = '${ApiConfig.baseUrl}$path?t=$timestamp';
            } else {
              // Path relatif tanpa slash, tambahkan /uploads/profile-photos/
              fullPhotoUrl =
                  '${ApiConfig.baseUrl}/uploads/profile-photos/$path?t=$timestamp';
            }
          }

          print('📸 [UserProvider] Full photo URL: $fullPhotoUrl');
          print('✅ [UserProvider] Updating profile with all data...');

          _user = UserModel(
            id: _user!.id,
            name: nama ?? _user!.name,
            username: username ?? _user!.username,
            email: _user!.email,
            phone: _user!.phone,
            address: _user!.address,
            token: _user!.token,
            role: _user!.role,
            vesselName: _user!.vesselName,
            vesselNumber: _user!.vesselNumber,
            captainName: _user!.captainName,
            crewCount: _user!.crewCount,
            crewNames: _user!.crewNames,
            profilePicture: fullPhotoUrl,
          );

          // Save to SharedPreferences
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(
            'user_data',
            jsonEncode({
              'id': _user!.id,
              'name': _user!.name,
              'username': _user!.username,
              'email': _user!.email,
              'phone': _user!.phone,
              'address': _user!.address,
              'role': _user!.role,
              'profile_picture': fullPhotoUrl,
            }),
          );
          print('💾 [UserProvider] Saved to SharedPreferences');

          notifyListeners();
          print('🔔 [UserProvider] Listeners notified');
        } else {
          print('⚠️ [UserProvider] User is null');
        }
      }
    } catch (e) {
      print('❌ [UserProvider] Error syncing profile: $e');
    }
  }

  Future<void> setUser(UserModel user) async {
    _user = user;

    // Save to SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'user_data',
      jsonEncode({
        'id': user.id,
        'name': user.name,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'address': user.address,
        'role': user.role,
        'profile_picture': user.profilePicture,
      }),
    );

    notifyListeners();
    startAutoSync();
  }

  Future<void> updateVesselInfo({
    required String vesselName,
    required String vesselNumber,
    required String captainName,
    required int crewCount,
    List<String>? crewNames,
  }) async {
    if (_user != null) {
      _user = UserModel(
        id: _user!.id,
        name: _user!.name,
        username: _user!.username,
        email: _user!.email,
        phone: _user!.phone,
        address: _user!.address,
        token: _user!.token,
        role: _user!.role,
        vesselName: vesselName,
        vesselNumber: vesselNumber,
        captainName: captainName,
        crewCount: crewCount,
        crewNames: crewNames,
      );
      notifyListeners();
    }
  }

  Future<void> updateRole(String role) async {
    if (_user != null) {
      _user = UserModel(
        id: _user!.id,
        name: _user!.name,
        username: _user!.username,
        email: _user!.email,
        phone: _user!.phone,
        address: _user!.address,
        token: _user!.token,
        role: role,
        vesselName: _user!.vesselName,
        vesselNumber: _user!.vesselNumber,
        captainName: _user!.captainName,
        crewCount: _user!.crewCount,
        crewNames: _user!.crewNames,
      );
      notifyListeners();
    }
  }

  Future<void> updateProfilePicture(String path) async {
    if (_user != null) {
      _user = UserModel(
        id: _user!.id,
        name: _user!.name,
        username: _user!.username,
        email: _user!.email,
        phone: _user!.phone,
        address: _user!.address,
        token: _user!.token,
        role: _user!.role,
        vesselName: _user!.vesselName,
        vesselNumber: _user!.vesselNumber,
        captainName: _user!.captainName,
        crewCount: _user!.crewCount,
        crewNames: _user!.crewNames,
        profilePicture: path,
      );

      // Save to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final userData = prefs.getString('user_data');
      if (userData != null) {
        final userMap = jsonDecode(userData);
        userMap['profile_picture'] = path;
        await prefs.setString('user_data', jsonEncode(userMap));
      }

      notifyListeners();
    }
  }

  void refreshProfilePicture() {
    notifyListeners();
  }

  Future<void> syncProfileFromAPI() async {
    final token = await _getToken();
    if (token != null) {
      try {
        final dio = Dio(
          BaseOptions(
            baseUrl: ApiConfig.baseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 10),
          ),
        );

        print('🔄 [syncProfileFromAPI] Fetching full profile...');
        final response = await dio.get(
          '/api/mobile/profile',
          options: Options(
            headers: {
              'Authorization': 'Bearer $token',
              'Cache-Control': 'no-cache',
            },
          ),
        );

        if (response.statusCode == 200 && response.data['success'] == true) {
          final data = response.data['data'];
          print('📊 [syncProfileFromAPI] API data: $data');

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
          final foto = data['foto'] ?? data['fotoUrl'];
          if (foto != null && foto.toString().isNotEmpty) {
            final timestamp = DateTime.now().millisecondsSinceEpoch;
            final path = foto.toString();
            if (path.startsWith('http')) {
              photoUrl = '$path?t=$timestamp';
            } else if (path.startsWith('/')) {
              photoUrl = '${ApiConfig.baseUrl}$path?t=$timestamp';
            } else {
              // Path relatif tanpa slash, tambahkan /uploads/profile-photos/
              photoUrl =
                  '${ApiConfig.baseUrl}/uploads/profile-photos/$path?t=$timestamp';
            }
          }

          print('📸 [syncProfileFromAPI] Photo URL: $photoUrl');
          print('📝 [syncProfileFromAPI] Name: ${data['nama']}');
          print('📝 [syncProfileFromAPI] Username: ${data['username']}');

          _user = UserModel(
            id: data['id'] is int
                ? data['id']
                : int.tryParse(data['id'].toString()) ?? 0,
            name: data['nama'] ?? '',
            username: data['username'] ?? '',
            email: data['email'] ?? '',
            phone: data['noTelepon'] ?? '',
            address: data['alamat'],
            token: token,
            role: mappedRole,
            profilePicture: photoUrl,
          );

          // Save to SharedPreferences
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(
            'user_data',
            jsonEncode({
              'id': _user!.id,
              'name': _user!.name,
              'username': _user!.username,
              'email': _user!.email,
              'phone': _user!.phone,
              'address': _user!.address,
              'role': _user!.role,
              'profile_picture': photoUrl,
            }),
          );

          print('🔔 [syncProfileFromAPI] Notifying listeners...');
          notifyListeners();
          print('✅ [syncProfileFromAPI] Profile synced successfully');
        }
      } catch (e) {
        print('❌ [syncProfileFromAPI] Error: $e');
      }
    }
  }

  Future<void> clearUser() async {
    _user = null;
    stopAutoSync();
    notifyListeners();
  }
}
