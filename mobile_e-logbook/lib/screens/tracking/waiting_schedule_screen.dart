import 'package:e_logbook/screens/tracking/active_tracking_screen.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../services/nitification/local_notification_service.dart';
import '../../services/cuaca/weather_service.dart';
import '../../provider/user_provider.dart';
import '../main_screen.dart';

class WaitingScheduleScreen extends StatefulWidget {
  final DateTime scheduledDepartureTime;
  final Map<String, dynamic> tripData;

  const WaitingScheduleScreen({
    Key? key,
    required this.scheduledDepartureTime,
    required this.tripData,
  }) : super(key: key);

  @override
  State<WaitingScheduleScreen> createState() => _WaitingScheduleScreenState();
}

class _WaitingScheduleScreenState extends State<WaitingScheduleScreen> {
  Timer? _countdownTimer;
  Duration _remainingTime = Duration.zero;
  bool _has2HourNotificationSent = false;
  bool _hasStartNotificationSent = false;

  @override
  void initState() {
    super.initState();
    print('\n📍 [WaitingSchedule] ===== INIT DEBUG =====');
    print('📍 [WaitingSchedule] scheduledDepartureTime: ${widget.scheduledDepartureTime}');
    print('📍 [WaitingSchedule] userRole received: ${widget.tripData['userRole']}');
    print('📍 [WaitingSchedule] userName received: ${widget.tripData['userName']}');
    print('📍 [WaitingSchedule] captainName: ${widget.tripData['captainName']}');
    print('📍 [WaitingSchedule] Current time: ${DateTime.now()}');
    print('📍 [WaitingSchedule] Time until departure: ${widget.scheduledDepartureTime.difference(DateTime.now())}');
    print('📍 [WaitingSchedule] ===== INIT DEBUG END =====\n');
    _startCountdown();
  }

  void _startCountdown() {
    _updateRemainingTime();
    _countdownTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      _updateRemainingTime();
      
      // Check for 1-day reminder (24 hours before departure)
      if (!_has2HourNotificationSent && _remainingTime.inHours <= 24 && _remainingTime.inHours > 23) {
        _send1DayReminder();
      }
      
      // Check for start notification (when time arrives)
      if (!_hasStartNotificationSent && (_remainingTime.isNegative || _remainingTime.inSeconds <= 0)) {
        _sendStartNotification();
        timer.cancel();
        _checkWeatherAndNavigate();
      }
    });
  }

  void _updateRemainingTime() {
    setState(() {
      final now = DateTime.now();
      final userRole = widget.tripData['userRole'] ?? 'Nahkoda';
      
      // Untuk Nahkoda: countdown ke waktu mulai tracking (24 jam sebelum keberangkatan)
      // Untuk Crew: countdown ke waktu keberangkatan
      if (userRole == 'Nahkoda') {
        final trackingStartTime = widget.scheduledDepartureTime.subtract(Duration(hours: 24));
        _remainingTime = trackingStartTime.difference(now);
        print('📅 [Countdown] Nahkoda - Tracking start: $trackingStartTime, Remaining: $_remainingTime');
      } else {
        _remainingTime = widget.scheduledDepartureTime.difference(now);
        print('📅 [Countdown] Crew - Departure: ${widget.scheduledDepartureTime}, Remaining: $_remainingTime');
      }
    });
  }

  Future<void> _send1DayReminder() async {
    _has2HourNotificationSent = true;
    try {
      await LocalNotificationService.showTripStartingSoonNotification(
        vesselName: widget.tripData['vesselName'] ?? 'Kapal',
        minutesLeft: 1440, // 24 hours = 1440 minutes
      );
      print('📢 [Reminder] 1-day notification sent');
      
      // Show dialog untuk navigasi
      if (mounted) {
        _showPreparationDialog();
      }
    } catch (e) {
      print('❌ [Reminder] Error sending 1-day notification: $e');
    }
  }

  void _showPreparationDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.notifications_active, color: Colors.white, size: 24),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                '⏰ Persiapan Trip',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trip akan dimulai dalam 1 hari!',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 12),
            Text(
              'Kapal ${widget.tripData['vesselName']} akan berangkat besok. Pastikan semua persiapan sudah dilakukan.',
              style: TextStyle(fontSize: 14, color: Colors.grey[700]),
            ),
            SizedBox(height: 16),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Lakukan pengecekan akhir sebelum keberangkatan',
                      style: TextStyle(fontSize: 12, color: Colors.blue[900]),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Nanti Saja'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _checkWeatherBeforeWaiting();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFF1B4F9C),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Lihat Countdown',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _checkWeatherBeforeWaiting() async {
    try {
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

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 10),
      );

      final weather = await WeatherService.getWeatherByPosition(position);
      
      if (mounted) Navigator.pop(context);

      if (weather == null) {
        return;
      }

      final isExtreme = _isWeatherExtreme(weather);

      if (!mounted) return;

      if (isExtreme) {
        _showWeatherWarning(weather);
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  Future<void> _sendStartNotification() async {
    _hasStartNotificationSent = true;
    try {
      await LocalNotificationService.showTripStartingNowNotification(
        vesselName: widget.tripData['vesselName'] ?? 'Kapal',
      );
      print('🚢 [Start] Trip starting notification sent');
    } catch (e) {
      print('❌ [Start] Error sending start notification: $e');
    }
  }

  Future<void> _checkWeatherAndNavigate() async {
    try {
      print('🌦️ [Weather] Checking weather before starting...');
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 10),
      );

      final weather = await WeatherService.getWeatherByPosition(position);

      if (weather == null) {
        print('⚠️ [Weather] Could not get weather data, proceeding anyway');
        _navigateToTracking();
        return;
      }

      final isExtreme = _isWeatherExtreme(weather);

      if (!mounted) return;

      if (isExtreme) {
        _showWeatherWarning(weather);
      } else {
        _navigateToTracking();
      }
    } catch (e) {
      print('❌ [Weather] Error checking weather: $e');
      if (mounted) {
        _navigateToTracking();
      }
    }
  }

  bool _isWeatherExtreme(WeatherData weather) {
    final condition = weather.condition.toLowerCase();
    if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm') ||
        condition.contains('badai')) {
      return true;
    }
    if (weather.windSpeed > 40) return true;
    if (weather.waveHeight > 2.5) return true;
    return false;
  }

  void _showWeatherWarning(WeatherData weather) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning, color: Colors.red, size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Cuaca Tidak Aman',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
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
            Text('• Kecepatan Angin: ${weather.windSpeed.toStringAsFixed(1)} km/h'),
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
            onPressed: () {
              Navigator.pop(context);
            },
            child: Text('Tunda Trip'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _navigateToTracking();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Tetap Lanjutkan'),
          ),
        ],
      ),
    );
  }

  void _navigateToTracking() {
    print('\n🚀 [WaitingSchedule] ===== NAVIGATE TO ACTIVE TRACKING =====');
    print('🚀 [WaitingSchedule] Starting navigation to ActiveTrackingScreen');
    print('🚀 [WaitingSchedule] tripData keys: ${widget.tripData.keys.toList()}');
    
    // Validasi dan parse data dengan type safety
    final departureTime = widget.tripData['departureTime'];
    if (departureTime == null || departureTime is! DateTime) {
      print('❌ [WaitingSchedule] Error: departureTime is null or invalid type');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: Waktu keberangkatan tidak valid'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    // Parse harborCoordinates dengan type safety
    Map<String, dynamic>? harborCoordinates;
    final rawCoordinates = widget.tripData['harborCoordinates'];
    if (rawCoordinates != null && rawCoordinates is Map) {
      harborCoordinates = Map<String, dynamic>.from(rawCoordinates);
      print('✅ [WaitingSchedule] harborCoordinates: $harborCoordinates');
    } else {
      print('⚠️ [WaitingSchedule] harborCoordinates is null or invalid, using default');
      harborCoordinates = {
        'latitude': -6.1075,
        'longitude': 106.8975,
      };
    }
    
    // Parse estimatedReturnDate
    DateTime? estimatedReturnDate;
    final rawReturnDate = widget.tripData['estimatedReturnDate'];
    if (rawReturnDate != null && rawReturnDate is DateTime) {
      estimatedReturnDate = rawReturnDate;
    }
    
    // Parse numeric values dengan type safety
    final crewCount = (widget.tripData['crewCount'] ?? 0) is int 
        ? widget.tripData['crewCount'] as int 
        : int.tryParse(widget.tripData['crewCount'].toString()) ?? 0;
    
    final estimatedDuration = (widget.tripData['estimatedDuration'] ?? 1) is int
        ? widget.tripData['estimatedDuration'] as int
        : int.tryParse(widget.tripData['estimatedDuration'].toString()) ?? 1;
    
    final fuelAmount = (widget.tripData['fuelAmount'] ?? 0.0) is num
        ? (widget.tripData['fuelAmount'] as num).toDouble()
        : double.tryParse(widget.tripData['fuelAmount'].toString()) ?? 0.0;
    
    final iceStorage = (widget.tripData['iceStorage'] ?? 0.0) is num
        ? (widget.tripData['iceStorage'] as num).toDouble()
        : double.tryParse(widget.tripData['iceStorage'].toString()) ?? 0.0;
    
    final zoneRadius = (widget.tripData['zoneRadius'] ?? 50.0) is num
        ? (widget.tripData['zoneRadius'] as num).toDouble()
        : double.tryParse(widget.tripData['zoneRadius'].toString()) ?? 50.0;
    
    print('\n📦 [WaitingSchedule] ===== SENDING TO ACTIVE TRACKING =====');
    print('📦 [WaitingSchedule] vesselName: "${widget.tripData['vesselName']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] vesselNumber: "${widget.tripData['vesselNumber']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] captainName: "${widget.tripData['captainName']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] crewCount: $crewCount');
    print('📦 [WaitingSchedule] selectedHarbor: "${widget.tripData['selectedHarbor']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] departureTime: $departureTime');
    print('📦 [WaitingSchedule] estimatedReturnDate: $estimatedReturnDate');
    print('📦 [WaitingSchedule] estimatedDuration: $estimatedDuration');
    print('📦 [WaitingSchedule] fuelAmount: $fuelAmount');
    print('📦 [WaitingSchedule] iceStorage: $iceStorage');
    print('📦 [WaitingSchedule] harborCoordinates: $harborCoordinates');
    print('📦 [WaitingSchedule] zoneRadius: $zoneRadius');
    print('📦 [WaitingSchedule] userRole: "${widget.tripData['userRole']?.toString() ?? 'Nahkoda'}"');
    print('📦 [WaitingSchedule] userName: "${widget.tripData['userName']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] emergencyContact: "${widget.tripData['emergencyContact']?.toString() ?? ''}"');
    print('📦 [WaitingSchedule] notes: "${widget.tripData['notes']?.toString()}"');
    print('📦 [WaitingSchedule] ===== END SENDING DATA =====\n');
    
    print('✅ [WaitingSchedule] All data validated, navigating...');
    
    // Gunakan NavigationHelper.pushReplacementNoTransition seperti tracking button
    NavigationHelper.pushReplacementNoTransition(
      context,
      ActiveTrackingScreen(
        vesselName: widget.tripData['vesselName']?.toString() ?? '',
        vesselNumber: widget.tripData['vesselNumber']?.toString() ?? '',
        captainName: widget.tripData['captainName']?.toString() ?? '',
        crewCount: crewCount,
        selectedHarbor: widget.tripData['selectedHarbor']?.toString() ?? '',
        departureTime: departureTime,
        estimatedReturnDate: estimatedReturnDate,
        estimatedDuration: estimatedDuration,
        emergencyContact: widget.tripData['emergencyContact']?.toString() ?? '',
        fuelAmount: fuelAmount,
        iceStorage: iceStorage,
        notes: widget.tripData['notes']?.toString(),
        harborCoordinates: harborCoordinates,
        zoneRadius: zoneRadius,
        userRole: widget.tripData['userRole']?.toString() ?? 'Nahkoda',
        userName: widget.tripData['userName']?.toString() ?? '',
        tripId: widget.tripData['tripId'],
      ),
    );
  }

  String _formatCountdown() {
    if (_remainingTime.isNegative) return '00:00:00';
    
    final days = _remainingTime.inDays;
    final hours = _remainingTime.inHours.remainder(24);
    final minutes = _remainingTime.inMinutes.remainder(60);
    final seconds = _remainingTime.inSeconds.remainder(60);
    
    if (days > 0) {
      return '$days hari ${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userProvider = Provider.of<UserProvider>(context);
    final userName = userProvider.user?.name ?? '-';
    
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        print('🔙 [WaitingSchedule] Back button pressed - navigating to MainScreen');
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const MainScreen()),
          (route) => false,
        );
      },
      child: Scaffold(
        backgroundColor: Color(0xFFF5F7FA),
        appBar: AppBar(
          title: Text(
            'Menunggu Jadwal',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
          ),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: Icon(Icons.close, color: Colors.white),
              onPressed: () {
                print('❌ [WaitingSchedule] Close button pressed - navigating to MainScreen');
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const MainScreen()),
                  (route) => false,
                );
              },
              tooltip: 'Tutup',
            ),
          ],
          flexibleSpace: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              ),
            ),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(20),
            child: Column(
              children: [
                // Header Card dengan Badge Role & Info Kapal
                Container(
                  padding: EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 15,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge Role & Nama
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: widget.tripData['userRole'] == 'Nahkoda'
                                ? [Color(0xFF1B4F9C), Color(0xFF2563EB)]
                                : [Color(0xFF2563EB), Color(0xFF1B4F9C)],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              widget.tripData['userRole'] == 'Nahkoda' ? Icons.sailing : Icons.person,
                              color: Colors.white,
                              size: 16,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Role: ${widget.tripData['userRole'] ?? '-'}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(width: 4),
                            Text(
                              '•',
                              style: TextStyle(color: Colors.white.withOpacity(0.7)),
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Nama: $userName',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 16),
                      Divider(height: 1),
                      SizedBox(height: 16),
                      // Info Kapal
                      Row(
                        children: [
                          Container(
                            padding: EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Color(0xFF1B4F9C).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              Icons.directions_boat,
                              color: Color(0xFF1B4F9C),
                              size: 28,
                            ),
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.tripData['vesselName'] ?? '-',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[800],
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'No. Reg: ${widget.tripData['vesselNumber'] ?? '-'}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Khusus Crew: Tampilkan Nama Nahkoda
                      if (widget.tripData['userRole'] != 'Nahkoda') ...[
                        Builder(
                          builder: (context) {
                            print('📍 [WaitingSchedule] Showing captain card because userRole=${widget.tripData['userRole']}');
                            return SizedBox(height: 12);
                          },
                        ),
                        Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.blue.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.person_outline, color: Colors.blue, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Nahkoda: ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey[600],
                                ),
                              ),
                              Text(
                                widget.tripData['captainName'] ?? '-',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue[900],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                SizedBox(height: 20),
                
                // Lottie Animation
                Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFF1B4F9C).withOpacity(0.1),
                        blurRadius: 20,
                        offset: Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Lottie.asset(
                    'assets/animations/clock.json',
                    fit: BoxFit.contain,
                  ),
                ),
                
                SizedBox(height: 32),
                
                // Title
                Text(
                  'Tracking Akan Dimulai Dalam',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                SizedBox(height: 20),
                
                // Countdown Timer
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 40, vertical: 24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFF1B4F9C).withOpacity(0.3),
                        blurRadius: 15,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Text(
                    _formatCountdown(),
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 3,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
                
                SizedBox(height: 32),
                
                // Info Banner
                Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.blue.shade200,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.info_outline,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Tracking akan dimulai otomatis saat waktu keberangkatan tiba',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.blue[900],
                            fontWeight: FontWeight.w500,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
