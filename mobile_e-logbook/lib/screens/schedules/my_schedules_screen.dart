import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../services/local/secure_storage_service.dart';
import '../../services/api/trip_service.dart';
import '../../services/api/vessel_service.dart';
import '../../services/nitification/local_notification_service.dart';
import '../../services/cuaca/weather_service.dart';
import '../../provider/tracking_minimize_provider.dart';
import '../tracking/active_tracking_screen.dart';
import '../tracking/waiting_schedule_screen.dart';
import '../../utils/auth_helper.dart';
import '../../utils/navigation_helper.dart';
import '../../constants/harbor_coordinates.dart';

class MySchedulesScreen extends StatefulWidget {
  const MySchedulesScreen({Key? key}) : super(key: key);

  @override
  State<MySchedulesScreen> createState() => _MySchedulesScreenState();
}

class _MySchedulesScreenState extends State<MySchedulesScreen> {
  dynamic _parseJsonString(dynamic value) {
    if (value is String) {
      try {
        return json.decode(value);
      } catch (_) {
        return null;
      }
    }
    return value;
  }

  List<Map<String, dynamic>> _schedules = [];
  bool _isLoading = true;
  bool _hasActiveTrip = false;
  Timer? _notificationPollTimer;
  String? _lastNotificationId;

  @override
  void initState() {
    super.initState();
    _initializeData();
    _startNotificationPolling();
  }

  @override
  void dispose() {
    _notificationPollTimer?.cancel();
    super.dispose();
  }

  void _startNotificationPolling() {
    _notificationPollTimer = Timer.periodic(Duration(seconds: 30), (
      timer,
    ) async {
      await _checkNewTaskNotification();
    });
  }

  Future<void> _checkNewTaskNotification() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await SecureStorageService.getToken();
      final userRole = prefs.getString('role');
      final userDataString = prefs.getString('user_data');

      if (token == null || userRole == null) return;

      int? currentUserId;
      if (userDataString != null) {
        try {
          final userData = json.decode(userDataString);
          currentUserId = userData['id'];
        } catch (e) {
          print('❌ [Notification] Error parsing user_data: $e');
          return;
        }
      }

      if (currentUserId == null) return;

      final response = await http.get(
        Uri.parse('${ApiConfig.apiUrl}/mobile/notifications'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final notifications = data['data'] as List;

          // Filter notifikasi berdasarkan user ID
          final myNotifications = notifications.where((n) {
            final recipientId = n['userId'] ?? n['recipientId'];
            return recipientId == currentUserId;
          }).toList();

          // Cek notifikasi tugas baru
          final newTaskNotif = myNotifications.firstWhere(
            (n) => n['type'] == 'new_task' && n['isRead'] == false,
            orElse: () => null,
          );

          if (newTaskNotif != null &&
              newTaskNotif['id'] != _lastNotificationId) {
            _lastNotificationId = newTaskNotif['id'];

            // Hanya tampilkan notifikasi jika tidak ada trip aktif
            if (!_hasActiveTrip) {
              // Untuk crew, tambahkan info bahwa perlu menunggu izin nahkoda
              String message =
                  newTaskNotif['message'] ?? 'Anda mendapat tugas trip baru';
              if (userRole.toLowerCase() == 'crew' ||
                  userRole.toLowerCase() == 'abk') {
                message += '. Menunggu Nahkoda mendapatkan izin dari Admin';
              }

              await LocalNotificationService.showNewTaskNotification(
                title: newTaskNotif['title'] ?? 'Tugas Baru',
                message: message,
              );

              await _loadSchedules();
            }
          }

          // Untuk crew: Cek notifikasi status berlayar
          if (userRole.toLowerCase() == 'crew' ||
              userRole.toLowerCase() == 'abk') {
            final berlayarNotif = myNotifications.firstWhere(
              (n) => n['type'] == 'trip_berlayar' && n['isRead'] == false,
              orElse: () => null,
            );

            if (berlayarNotif != null) {
              await LocalNotificationService.showNewTaskNotification(
                title: berlayarNotif['title'] ?? 'Trip Berlayar',
                message: berlayarNotif['message'] ??
                    'Trip sudah dimulai, tracking aktif',
              );

              // Refresh data
              await _loadSchedules();
            }
          }
        }
      }
    } catch (e) {
      print('❌ [Notification] Error: $e');
    }
  }

  Future<void> _initializeData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    // Pastikan vessel data sudah tersedia
    await _ensureVesselDataAvailable();

    // Baru load schedules
    await _loadSchedules();
  }

  Future<void> _ensureVesselDataAvailable() async {
    try {
      print('🔄 [MySchedules] Ensuring vessel data is available...');

      final vesselService = VesselService();
      final vesselId = await vesselService.getVesselIdFromUserSettings() ??
          await vesselService.getVesselIdFromTrip();

      if (vesselId != null) {
        print('✅ [MySchedules] Vessel ID found: $vesselId');
      } else {
        print('⚠️ [MySchedules] No vessel data available');
      }
    } catch (e) {
      print('❌ [MySchedules] Error fetching vessel data: $e');
    }
  }

  Future<void> _loadSchedules() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      // Ambil user ID dari profile
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      int? currentUserId;

      if (userDataString != null) {
        try {
          final userData = json.decode(userDataString);
          currentUserId = userData['id'];
          print('👤 [MySchedules] Current User ID: $currentUserId');
        } catch (e) {
          print('❌ [MySchedules] Error parsing user_data: $e');
        }
      }

      // Ambil semua trips
      final response = await TripService.getAllTrips();
      if (response['success'] == true && response['data'] != null) {
        final allTrips = List<Map<String, dynamic>>.from(response['data']);
        print('\n========== FILTER SCHEDULES START ==========');
        print('📋 [MySchedules] Total trips from API: ${allTrips.length}');

        // Cek apakah ada trip BERLAYAR atau DARURAT untuk user ini
        final activeTrip = allTrips.firstWhere((trip) {
          final nahkodaId = trip['nahkodaId'];
          dynamic rawAwakKapal = trip['awakKapal'];
          if (rawAwakKapal is String) {
            try { rawAwakKapal = json.decode(rawAwakKapal); } catch (_) {}
          }
          final awakKapal = rawAwakKapal as List?;
          final status = trip['status']?.toLowerCase();

          final isMyTrip =
              (currentUserId != null && nahkodaId == currentUserId) ||
                  (currentUserId != null &&
                      awakKapal != null &&
                      awakKapal.contains(currentUserId));

          // Cek jika ada trip yang sedang berlayar atau darurat
          return isMyTrip &&
              (status == 'berlayar' ||
                  status == 'sedang_melaut' ||
                  status == 'active' ||
                  status == 'sailing' ||
                  status == 'darurat' ||
                  status == 'emergency');
        }, orElse: () => {});

        final hasActive = activeTrip.isNotEmpty;
        print('🚨 [MySchedules] Has active/sailing trip: $hasActive');

        // Filter: tampilkan trip BERLAYAR, DISETUJUI, atau SELESAI
        final filteredTrips = allTrips.where((trip) {
          final nahkodaId = trip['nahkodaId'];
          dynamic rawAwakKapal = trip['awakKapal'];
          if (rawAwakKapal is String) {
            try { rawAwakKapal = json.decode(rawAwakKapal); } catch (_) {}
          }
          final awakKapal = rawAwakKapal as List?;
          final status = trip['status']?.toLowerCase();

          // Filter 1: Apakah trip ini milik user?
          final isMyTrip =
              (currentUserId != null && nahkodaId == currentUserId) ||
                  (currentUserId != null &&
                      awakKapal != null &&
                      awakKapal.contains(currentUserId));

          // Filter 2: Tampilkan trip berlayar, darurat, siap dimulai, atau selesai
          // Status berlayar: berlayar, sedang_melaut, active, sailing
          // Status darurat: darurat, emergency
          // Status selesai: selesai, completed, finished
          // Status siap: disetujui, approved, siap_berangkat, menunggu_dokumen, menunggu_izin
          final isBerlayar = status == 'berlayar' ||
              status == 'sedang_melaut' ||
              status == 'active' ||
              status == 'sailing';
          final isDarurat = status == 'darurat' || status == 'emergency';
          final isSelesai = status == 'selesai' ||
              status == 'completed' ||
              status == 'finished';
          final validStatuses = [
            'disetujui',
            'approved',
            'siap_berangkat',
            'menunggu_dokumen',
            'menunggu_izin',
            'menunggu',
          ];
          final isValidStatus = validStatuses.contains(status);

          // Jika ada trip berlayar/darurat, tampilkan:
          // - Trip berlayar/darurat (untuk lanjutkan tracking)
          // - Trip selesai (untuk lihat hasil)
          // - Trip menunggu_dokumen (untuk persiapan trip berikutnya)
          final shouldShow = hasActive
              ? (isBerlayar ||
                  isDarurat ||
                  isSelesai ||
                  status == 'menunggu_dokumen')
              : (isValidStatus || isSelesai);

          final match = isMyTrip && shouldShow;
          if (isMyTrip) {
            print(
              '🔍 [MySchedules] Trip ID ${trip['id']}, Status: $status, shouldShow: $shouldShow, hasActive: $hasActive',
            );
          }
          if (match) {
            print(
              '✅ [MySchedules] MATCH - Trip ID ${trip['id']}, Nahkoda ID $nahkodaId, Status: $status',
            );
          }
          return match;
        }).toList();

        // Sort by tanggalBerangkat (newest first)
        filteredTrips.sort((a, b) {
          try {
            final dateA = DateTime.parse(a['tanggalBerangkat'] ?? '');
            final dateB = DateTime.parse(b['tanggalBerangkat'] ?? '');
            return dateB.compareTo(dateA);
          } catch (e) {
            return 0;
          }
        });

        // Ambil semua trip (tidak dibatasi 3)
        final limitedTrips = filteredTrips;

        print('🔍 [MySchedules] Filtered trips: ${limitedTrips.length}');
        print('========== FILTER SCHEDULES END ==========\n');

        if (!mounted) return;
        setState(() {
          _schedules = limitedTrips;
          _hasActiveTrip = hasActive;
          _isLoading = false;
        });
      } else {
        if (!mounted) return;
        setState(() {
          _schedules = [];
          _hasActiveTrip = false;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ [MySchedules] Error loading schedules: $e');

      // Check if token expired
      if (AuthHelper.isTokenExpiredError(e) && mounted) {
        await AuthHelper.handleTokenExpired(context);
        return;
      }

      if (!mounted) return;
      setState(() {
        _schedules = [];
        _hasActiveTrip = false;
        _isLoading = false;
      });
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'menunggu':
      case 'menunggu_dokumen':
        return Colors.orange;
      case 'menunggu_izin':
        return Colors.amber;
      case 'disetujui':
        return Colors.green;
      case 'siap_berangkat':
        return Colors.blue;
      case 'siap_berlayar': // Status efektif saat buffer time tercapai
        return Colors.green;
      case 'berlayar':
        return Colors.green;
      case 'sedang_melaut':
        return Colors.green;
      case 'active':
        return Colors.green;
      case 'sailing':
        return Colors.green;
      case 'selesai':
        return Colors.green;
      case 'completed':
        return Colors.green;
      case 'finished':
        return Colors.green;
      case 'ditolak':
        return Colors.red;
      case 'darurat':
        return Colors.red;
      case 'emergency':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String? status) {
    switch (status?.toLowerCase()) {
      case 'menunggu':
        return 'Menunggu';
      case 'menunggu_dokumen':
        return 'Menunggu Dokumen';
      case 'menunggu_izin':
        return 'Menunggu Izin';
      case 'disetujui':
        return 'Disetujui';
      case 'siap_berangkat':
        return 'Siap Berangkat';
      case 'berlayar':
        return 'Berlayar';
      case 'sedang_melaut':
        return 'Sedang Melaut';
      case 'active':
        return 'Aktif';
      case 'sailing':
        return 'Berlayar';
      case 'selesai':
        return 'Selesai';
      case 'completed':
        return 'Selesai';
      case 'finished':
        return 'Selesai';
      case 'ditolak':
        return 'Ditolak';
      case 'darurat':
        return 'DARURAT';
      case 'emergency':
        return 'DARURAT';
      default:
        return status ?? 'Unknown';
    }
  }

  String _getCrewCount(dynamic awakKapal) {
    if (awakKapal == null) return '0 orang';
    if (awakKapal is List) {
      return '${awakKapal.length} orang';
    }
    return '0 orang';
  }

  Future<void> _checkAndNavigate(Map<String, dynamic> schedule) async {
    print('\n========================================');
    print('🔍 [CHECK] MULAI CEK DOKUMEN');
    print('========================================');
    print('📋 [CHECK] Trip ID: ${schedule['id']}');
    print('🚢 [CHECK] Kapal: ${schedule['kapal']?['namaKapal']}');
    print('👤 [CHECK] Nahkoda: ${schedule['nahkoda']?['nama']}');
    print('========================================\n');

    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(
          child: Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Memeriksa kelengkapan dokumen...'),
              ],
            ),
          ),
        ),
      );

      print('📡 [CHECK] Fetching trip detail from API...');
      // Get trip detail untuk cek dokumen
      final response = await TripService.getTripDetail(schedule['id']);

      if (mounted) Navigator.pop(context); // Close loading

      if (response['success'] != true) {
        print('❌ [CHECK] Failed to get trip detail');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Gagal memuat data trip'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      final tripData = response['data'];
      final perizinan = _parseJsonString(tripData['perizinan']) ?? {};
      final dokumen = perizinan['dokumen'] ?? {};
      final fuelDataList = perizinan['fuelData'] as List? ?? [];
      final iceDataList = perizinan['iceData'] as List? ?? [];

      // Cek kelengkapan dokumen
      final hasFuel = fuelDataList.isNotEmpty;
      final hasIce = iceDataList.isNotEmpty;
      final hasIzinMelaut = dokumen['izinMelaut'] == true;
      final hasDokumenKapal = dokumen['dokumenKapal'] == true;
      final hasAsuransi = dokumen['asuransi'] == true;

      final isComplete =
          hasFuel && hasIce && hasIzinMelaut && hasDokumenKapal && hasAsuransi;

      print('\n========================================');
      print('📊 [CHECK] HASIL CEK DOKUMEN');
      print('========================================');
      print(
        '⛽ BBM: ${hasFuel ? "✅ Ada (${fuelDataList.length} data)" : "❌ Belum"}',
      );
      print(
        '🧊 Es: ${hasIce ? "✅ Ada (${iceDataList.length} data)" : "❌ Belum"}',
      );
      print('📄 Izin Melaut: ${hasIzinMelaut ? "✅ Sudah" : "❌ Belum"}');
      print('📄 Dokumen Kapal: ${hasDokumenKapal ? "✅ Sudah" : "❌ Belum"}');
      print('📄 Asuransi: ${hasAsuransi ? "✅ Sudah" : "❌ Belum"}');
      print('========================================');
      print(
        '🎯 [CHECK] Kelengkapan: ${isComplete ? "✅ LENGKAP" : "❌ BELUM LENGKAP"}',
      );
      print('========================================\n');

      if (isComplete) {
        // Dokumen lengkap → Langsung cek cuaca dan navigasi
        await _checkWeatherAndNavigate(tripData);
      } else {
        // Dokumen belum lengkap → Ke Pre-Trip Form
        print('\n⚠️ [CHECK] ========================================');
        print('⚠️ [CHECK] DOKUMEN BELUM LENGKAP - KE FORM');
        print('⚠️ [CHECK] ========================================\n');
        _navigateToPreTripForm(schedule);
      }
    } catch (e) {
      print('\n❌ [CHECK] ========================================');
      print('❌ [CHECK] ERROR: $e');
      print('❌ [CHECK] ========================================\n');
      if (mounted) {
        Navigator.pop(context); // Close loading if still open
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Terjadi kesalahan: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _checkWeatherAndNavigate(Map<String, dynamic> tripData) async {
    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Container(
          padding: EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Memeriksa Cuaca...'),
            ],
          ),
        ),
      ),
    );

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 10),
      );
      final weather = await WeatherService.getWeatherByPosition(position);
      if (!mounted) return;
      Navigator.pop(context);

      if (weather == null) {
        await Future.delayed(Duration(milliseconds: 300));
        if (!mounted) return;
        _navigateToWaitingSchedule(tripData);
        return;
      }

      final isExtreme = _isWeatherExtreme(weather);
      if (!mounted) return;

      if (isExtreme) {
        _showWeatherWarning(weather, tripData);
      } else {
        await Future.delayed(Duration(milliseconds: 300));
        if (!mounted) return;
        _navigateToWaitingSchedule(tripData);
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        await Future.delayed(Duration(milliseconds: 300));
        if (mounted) _navigateToWaitingSchedule(tripData);
      }
    }
  }

  bool _isWeatherExtreme(WeatherData weather) {
    final condition = weather.condition.toLowerCase();
    if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm') ||
        condition.contains('badai')) return true;
    if (weather.windSpeed > 40) return true;
    if (weather.waveHeight > 2.5) return true;
    return false;
  }

  void _showWeatherWarning(WeatherData weather, Map<String, dynamic> tripData) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.warning, color: Colors.red, size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Cuaca Tidak Aman',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kondisi cuaca saat ini tidak mendukung untuk melaut:'),
            SizedBox(height: 12),
            Text('• Kondisi: ${weather.condition}'),
            Text(
                '• Kecepatan Angin: ${weather.windSpeed.toStringAsFixed(1)} km/h'),
            Text('• Tinggi Ombak: ${weather.waveHeight.toStringAsFixed(1)} m'),
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange),
              ),
              child: Text(
                'Demi keselamatan, disarankan untuk menunda trip.',
                style: TextStyle(fontSize: 13, color: Colors.orange.shade900),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _navigateToWaitingSchedule(tripData);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Tetap Lanjutkan'),
          ),
        ],
      ),
    );
  }

  void _navigateToPreTripForm(Map<String, dynamic> schedule) {
    final kapal = schedule['kapal'];
    final nahkoda = schedule['nahkoda'];

    Navigator.pushNamed(
      context,
      '/pre-trip-form',
      arguments: {
        'id': schedule['id'],
        'kapal': {
          'namaKapal': kapal?['namaKapal'] ?? kapal?['nama'],
          'nomorRegistrasi': kapal?['nomorRegistrasi'],
        },
        'nahkoda': {'nama': nahkoda?['nama'] ?? nahkoda?['username']},
        'awakKapal': schedule['awakKapal'],
        'tanggalBerangkat': schedule['tanggalBerangkat'],
        'estimasiPulang': schedule['estimasiPulang'],
        'durasi': schedule['durasi'],
        'areaTangkap': schedule['areaTangkap'],
        'targetIkan': schedule['targetIkan'],
        'estimasiBerat': schedule['estimasiBerat'],
      },
    );
  }

  Future<void> _navigateToTracking(Map<String, dynamic> tripData) async {
    print('\n========================================');
    print('🚀 [NAVIGATE] PREPARE DATA UNTUK TRACKING');
    print('========================================');

    final prefs = await SharedPreferences.getInstance();
    String? userRole = prefs.getString('role')?.toLowerCase();
    final userDataString = prefs.getString('user_data');

    print('🔍 [NAVIGATE] Role from SharedPreferences: $userRole');

    String userName = '';
    int? currentUserId;
    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['nama'] ?? userData['name'] ?? '';
        currentUserId = userData['id'];
        if (userRole == null || userRole.isEmpty) {
          userRole = userData['role']?.toString().toLowerCase();
          print('🔍 [NAVIGATE] Role from user_data: $userRole');
        }
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }

    if (userRole == null || userRole.isEmpty) {
      final nahkodaId = tripData['nahkodaId'];
      if (currentUserId != null && currentUserId == nahkodaId) {
        userRole = 'nahkoda';
        print('🔍 [NAVIGATE] Role from tripData: nahkoda (user is captain)');
      } else {
        userRole = 'crew';
        print('🔍 [NAVIGATE] Role from tripData: crew (user is not captain)');
      }
    }

    print('✅ [NAVIGATE] Final userRole: $userRole');

    final perizinan = _parseJsonString(tripData['perizinan']) ?? {};
    final kapal = _parseJsonString(tripData['kapal']) ?? {};
    final nahkoda = _parseJsonString(tripData['nahkoda']) ?? {};
    final areaTangkap = _parseJsonString(tripData['areaTangkap']) ?? {};

    double totalFuel = 0.0;
    double totalIce = 0.0;

    final fuelDataList = perizinan['fuelData'] as List? ?? [];
    for (var fuel in fuelDataList) {
      final jumlah = fuel['jumlahLiter'];
      if (jumlah != null) {
        totalFuel += (jumlah is num)
            ? jumlah.toDouble()
            : double.tryParse(jumlah.toString()) ?? 0.0;
      }
    }

    final iceDataList = perizinan['iceData'] as List? ?? [];
    for (var ice in iceDataList) {
      final jumlah = ice['jumlahKg'];
      if (jumlah != null) {
        totalIce += (jumlah is num)
            ? jumlah.toDouble()
            : double.tryParse(jumlah.toString()) ?? 0.0;
      }
    }

    DateTime departureTime;
    try {
      if (tripData['waktuMulai'] != null) {
        departureTime = DateTime.parse(tripData['waktuMulai']);
      } else if (tripData['tanggalBerangkat'] != null) {
        departureTime = DateTime.parse(tripData['tanggalBerangkat']);
      } else {
        departureTime = DateTime.now();
      }
    } catch (e) {
      print('⚠️ [NAVIGATE] Error parsing departure time: $e, using now');
      departureTime = DateTime.now();
    }

    DateTime? estimatedReturnDate;
    try {
      if (tripData['estimasiPulang'] != null) {
        estimatedReturnDate = DateTime.parse(tripData['estimasiPulang']);
      }
    } catch (e) {
      estimatedReturnDate = null;
    }

    Map<String, double>? harborCoordinates;
    try {
      var lat = areaTangkap['latitude'];
      var lng = areaTangkap['longitude'];

      if (lat == null || lng == null) {
        lat = tripData['latitude'];
        lng = tripData['longitude'];
      }

      if (lat == null || lng == null) {
        final harborName = tripData['pelabuhanAsal'] ?? areaTangkap['nama'];
        if (harborName != null && harborName.toString().isNotEmpty) {
          final coords = getHarborCoordinates(harborName.toString());
          lat = coords['latitude'];
          lng = coords['longitude'];
        }
      }

      if (lat == null || lng == null) {
        lat = -6.1075;
        lng = 106.7975;
      }

      harborCoordinates = {
        'latitude':
            (lat is num) ? lat.toDouble() : double.parse(lat.toString()),
        'longitude':
            (lng is num) ? lng.toDouble() : double.parse(lng.toString()),
      };
    } catch (e) {
      harborCoordinates = {'latitude': -6.1075, 'longitude': 106.7975};
    }

    print('🚀 [NAVIGATE] Navigating to ActiveTrackingScreen...');

    if (!mounted) return;

    NavigationHelper.pushReplacementNoTransition(
      context,
      ActiveTrackingScreen(
        vesselName: kapal['namaKapal'] ?? kapal['nama'] ?? '',
        vesselNumber: kapal['nomorRegistrasi'] ?? '',
        captainName: nahkoda['nama'] ?? nahkoda['username'] ?? '',
        crewCount: (tripData['awakKapal'] as List?)?.length ?? 0,
        selectedHarbor: tripData['pelabuhanAsal'] ?? areaTangkap['nama'] ?? '',
        departureTime: departureTime,
        estimatedReturnDate: estimatedReturnDate,
        estimatedDuration: (tripData['durasi'] is num)
            ? (tripData['durasi'] as num).toInt()
            : int.tryParse(tripData['durasi']?.toString() ?? '1') ?? 1,
        emergencyContact: '',
        fuelAmount: totalFuel,
        iceStorage: totalIce,
        notes: null,
        harborCoordinates: harborCoordinates,
        zoneRadius: 50.0,
        userRole: userRole == 'nahkoda' ? 'Nahkoda' : 'ABK',
        userName: userName,
        tripId: tripData['id'],
      ),
    );
    print('✅ [NAVIGATE] Navigation completed!');
    print('========================================\n');
  }

  void _navigateToWaitingSchedule(Map<String, dynamic> tripData) async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    String userName = '';
    String userRole = prefs.getString('role')?.toLowerCase() ?? 'crew';

    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['nama'] ?? userData['name'] ?? '';
      } catch (e) {}
    }

    final perizinan = _parseJsonString(tripData['perizinan']) ?? {};
    final kapal = _parseJsonString(tripData['kapal']) ?? {};
    final nahkoda = _parseJsonString(tripData['nahkoda']) ?? {};
    final areaTangkap = _parseJsonString(tripData['areaTangkap']) ?? {};

    double totalFuel = 0.0;
    double totalIce = 0.0;
    final fuelDataList = perizinan['fuelData'] as List? ?? [];
    for (var fuel in fuelDataList) {
      final jumlah = fuel['jumlahLiter'];
      if (jumlah != null) {
        totalFuel += (jumlah is num)
            ? jumlah.toDouble()
            : double.tryParse(jumlah.toString()) ?? 0.0;
      }
    }
    final iceDataList = perizinan['iceData'] as List? ?? [];
    for (var ice in iceDataList) {
      final jumlah = ice['jumlahKg'];
      if (jumlah != null) {
        totalIce += (jumlah is num)
            ? jumlah.toDouble()
            : double.tryParse(jumlah.toString()) ?? 0.0;
      }
    }

    DateTime departureTime;
    try {
      departureTime = tripData['waktuMulai'] != null
          ? DateTime.parse(tripData['waktuMulai'])
          : DateTime.parse(tripData['tanggalBerangkat']);
    } catch (e) {
      departureTime = DateTime.now();
    }

    // Untuk nahkoda: countdown ke 24 jam sebelum keberangkatan
    // Untuk crew: countdown ke waktu keberangkatan
    DateTime scheduledDepartureTime;
    if (userRole == 'nahkoda') {
      scheduledDepartureTime = departureTime.subtract(Duration(hours: 24));
    } else {
      scheduledDepartureTime = departureTime;
    }

    DateTime? estimatedReturnDate;
    try {
      if (tripData['estimasiPulang'] != null) {
        estimatedReturnDate = DateTime.parse(tripData['estimasiPulang']);
      }
    } catch (e) {}

    Map<String, double>? harborCoordinates;
    try {
      var lat = areaTangkap['latitude'];
      var lng = areaTangkap['longitude'];
      if (lat == null || lng == null) {
        lat = tripData['latitude'];
        lng = tripData['longitude'];
      }
      if (lat == null || lng == null) {
        final harborName = tripData['pelabuhanAsal'] ?? areaTangkap['nama'];
        if (harborName != null && harborName.toString().isNotEmpty) {
          final coords = getHarborCoordinates(harborName.toString());
          lat = coords['latitude'];
          lng = coords['longitude'];
        }
      }
      if (lat == null || lng == null) {
        lat = -6.1075;
        lng = 106.7975;
      }
      harborCoordinates = {
        'latitude':
            (lat is num) ? lat.toDouble() : double.parse(lat.toString()),
        'longitude':
            (lng is num) ? lng.toDouble() : double.parse(lng.toString()),
      };
    } catch (e) {
      harborCoordinates = {'latitude': -6.1075, 'longitude': 106.7975};
    }

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WaitingScheduleScreen(
          scheduledDepartureTime: scheduledDepartureTime,
          tripData: {
            'vesselName': kapal['namaKapal'] ?? kapal['nama'] ?? '',
            'vesselNumber': kapal['nomorRegistrasi'] ?? '',
            'captainName': nahkoda['nama'] ?? nahkoda['username'] ?? '',
            'crewCount': (tripData['awakKapal'] as List?)?.length ?? 0,
            'selectedHarbor':
                tripData['pelabuhanAsal'] ?? areaTangkap['nama'] ?? '',
            'departureTime': departureTime,
            'estimatedReturnDate': estimatedReturnDate,
            'estimatedDuration': (tripData['durasi'] is num)
                ? (tripData['durasi'] as num).toInt()
                : int.tryParse(tripData['durasi']?.toString() ?? '1') ?? 1,
            'emergencyContact': '',
            'fuelAmount': totalFuel,
            'iceStorage': totalIce,
            'notes': null,
            'harborCoordinates': harborCoordinates,
            'zoneRadius': 50.0,
            'userRole': userRole == 'nahkoda' ? 'Nahkoda' : 'ABK',
            'userName': userName,
            'tripId': tripData['id'],
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        iconTheme: IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: Text(
          'Jadwal Tugas Saya',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadSchedules,
        child: _isLoading
            ? Center(child: CircularProgressIndicator())
            : _schedules.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: EdgeInsets.all(16),
                    itemCount: _schedules.length,
                    itemBuilder: (context, index) {
                      return _buildScheduleCard(_schedules[index]);
                    },
                  ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            'Belum ada jadwal tugas',
            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(Map<String, dynamic> schedule) {
    final dateFormat = DateFormat('dd MMM yyyy');

    // Debug: Print schedule data
    print('\n========== SCHEDULE CARD DATA ==========');
    print('Schedule ID: ${schedule['id']}');
    print('Nahkoda: ${schedule['nahkoda']}');
    print('awakKapal: ${schedule['awakKapal']}');
    print('durasi: ${schedule['durasi']}');
    print('targetIkan: ${schedule['targetIkan']}');
    print('estimasiBerat: ${schedule['estimasiBerat']}');
    print('========================================\n');

    DateTime? scheduledDate;
    try {
      scheduledDate = schedule['tanggalBerangkat'] != null
          ? DateTime.parse(schedule['tanggalBerangkat'])
          : null;
    } catch (e) {
      scheduledDate = null;
    }

    final kapal = schedule['kapal'];
    final nahkoda = schedule['nahkoda'];
    final status = schedule['status'];

    return Container(
      margin: EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFF1B4F9C).withOpacity(0.1),
                  Color(0xFF2563EB).withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.directions_boat,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        kapal?['namaKapal'] ?? kapal?['nama'] ?? 'Kapal',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        kapal?['nomorRegistrasi'] ?? '-',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _getStatusText(status),
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoRow(
                  Icons.calendar_today,
                  'Tanggal Berangkat',
                  scheduledDate != null
                      ? dateFormat.format(scheduledDate)
                      : '-',
                  Colors.blue,
                ),
                if (nahkoda != null) ...[
                  SizedBox(height: 12),
                  _buildInfoRow(
                    Icons.person_outline,
                    'Nahkoda',
                    nahkoda['nama'] ?? nahkoda['username'] ?? '-',
                    Colors.purple,
                  ),
                ],
                SizedBox(height: 12),
                _buildInfoRow(
                  Icons.groups,
                  'Jumlah Crew',
                  _getCrewCount(schedule['awakKapal']),
                  Colors.orange,
                ),
                SizedBox(height: 12),
                _buildInfoRow(
                  Icons.access_time,
                  'Durasi',
                  '${schedule['durasi'] ?? 0} hari',
                  Colors.green,
                ),
                SizedBox(height: 12),
                _buildInfoRow(
                  Icons.location_on,
                  'Area Tangkap',
                  schedule['areaTangkap']?['nama'] ?? '-',
                  Colors.teal,
                ),
                SizedBox(height: 16),
                // Button berbeda untuk setiap status
                if (status?.toLowerCase() == 'selesai' ||
                    status?.toLowerCase() == 'completed' ||
                    status?.toLowerCase() == 'finished')
                  // Trip selesai
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          '/history',
                          arguments: {'tripId': schedule['id']},
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history, size: 20, color: Colors.white),
                          SizedBox(width: 8),
                          Text(
                            'Lihat Hasil Tangkapan',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (status?.toLowerCase() == 'berlayar' ||
                    status?.toLowerCase() == 'sedang_melaut' ||
                    status?.toLowerCase() == 'active' ||
                    status?.toLowerCase() == 'sailing')
                  // Trip berlayar
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        // Cek apakah tracking sedang minimize
                        final minimizeProvider =
                            Provider.of<TrackingMinimizeProvider>(context,
                                listen: false);
                        if (minimizeProvider.isMinimized &&
                            minimizeProvider.isTracking) {
                          // Jika minimize, tampilkan dialog peringatan
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16)),
                              title: Row(
                                children: [
                                  Icon(Icons.navigation, color: Colors.blue),
                                  SizedBox(width: 8),
                                  Expanded(
                                      child: Text('Tracking Sedang Berjalan')),
                                ],
                              ),
                              content: Text(
                                  'Anda memiliki tracking yang sedang berjalan di background. Silakan buka tracking tersebut terlebih dahulu melalui minimize overlay.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: Text('Tutup'),
                                ),
                              ],
                            ),
                          );
                          return;
                        }

                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => Center(
                            child: CircularProgressIndicator(
                              color: Colors.blue,
                            ),
                          ),
                        );

                        final response = await TripService.getTripDetail(
                          schedule['id'],
                        );
                        if (mounted) Navigator.pop(context);

                        if (response['success'] == true) {
                          await _navigateToTracking(response['data']);
                        } else if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Gagal memuat data trip'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.navigation, size: 20, color: Colors.white),
                          SizedBox(width: 8),
                          Text(
                            'Lanjutkan Tracking',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (status?.toLowerCase() == 'darurat' ||
                    status?.toLowerCase() == 'emergency')
                  // Trip darurat
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            // Cek apakah tracking sedang minimize
                            final minimizeProvider =
                                Provider.of<TrackingMinimizeProvider>(context,
                                    listen: false);
                            print(
                                '🚨 [DARURAT] Check: isMinimized=${minimizeProvider.isMinimized}, isTracking=${minimizeProvider.isTracking}');
                            if (minimizeProvider.isMinimized &&
                                minimizeProvider.isTracking) {
                              print('🚨 [DARURAT] Show warning dialog');
                              showDialog(
                                context: context,
                                builder: (context) => AlertDialog(
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16)),
                                  title: Row(
                                    children: [
                                      Icon(Icons.navigation,
                                          color: Colors.blue),
                                      SizedBox(width: 8),
                                      Expanded(
                                          child:
                                              Text('Tracking Sedang Berjalan')),
                                    ],
                                  ),
                                  content: Text(
                                      'Anda memiliki tracking yang sedang berjalan di background. Silakan buka tracking tersebut terlebih dahulu melalui minimize overlay.'),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(context),
                                      child: Text('Tutup'),
                                    ),
                                  ],
                                ),
                              );
                              return;
                            }

                            showDialog(
                              context: context,
                              barrierDismissible: false,
                              builder: (context) => Center(
                                child: CircularProgressIndicator(
                                    color: Colors.red),
                              ),
                            );

                            final response = await TripService.getTripDetail(
                              schedule['id'],
                            );
                            if (mounted) Navigator.pop(context);

                            if (response['success'] == true) {
                              await _navigateToTracking(response['data']);
                            } else if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Gagal memuat data trip'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            padding: EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.warning,
                                  size: 20, color: Colors.white),
                              SizedBox(width: 8),
                              Text(
                                'Lanjutkan - DARURAT!',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.support_agent,
                              color: Colors.orange,
                              size: 20,
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Untuk membatalkan status darurat, hubungi Admin',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.orange.shade900,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                else if (!_hasActiveTrip &&
                    (status?.toLowerCase() == 'menunggu' ||
                        status?.toLowerCase() == 'menunggu_dokumen' ||
                        status?.toLowerCase() == 'menunggu_izin' ||
                        status?.toLowerCase() == 'disetujui' ||
                        status?.toLowerCase() == 'siap_berangkat'))
                  // Trip baru - siap dimulai
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        await _checkAndNavigate(schedule);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.sailing, size: 20, color: Colors.white),
                          SizedBox(width: 8),
                          Text(
                            'Mulai Trip',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  // Trip tidak bisa dimulai (ada trip aktif)
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Colors.orange,
                          size: 20,
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Selesaikan trip yang sedang berjalan untuk memulai trip baru',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.orange.shade900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
