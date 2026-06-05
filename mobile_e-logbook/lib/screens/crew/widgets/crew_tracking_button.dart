import 'package:e_logbook/screens/tracking/active_tracking_screen.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../../services/api/trip_service.dart';
import '../../../services/api/zone_service.dart';
import '../../../services/cuaca/weather_service.dart';
import '../../../provider/tracking_minimize_provider.dart';
import '../../../routes/crew_routes.dart';
import '../../tracking/waiting_schedule_screen.dart';
import '../../tracking/pre_tracking_simple_wrapper.dart';

class CrewTrackingButton extends StatelessWidget {
  const CrewTrackingButton({super.key});

  Future<Map<String, dynamic>?> _getTripData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      int? currentUserId;
      
      if (userDataString != null) {
        final userData = json.decode(userDataString);
        currentUserId = userData['id'];
      }
      
      if (currentUserId == null) return null;
      
      final response = await TripService.getAllTrips();
      if (response['success'] == true && response['data'] != null) {
        final allTrips = List<Map<String, dynamic>>.from(response['data']);
        
        print('🔍 [Crew] Total trips: ${allTrips.length}');
        print('🔍 [Crew] Current user ID: $currentUserId');
        
        final myTrip = allTrips.firstWhere(
          (trip) {
            final nahkodaId = trip['nahkodaId'];
            final awakKapal = trip['awakKapal'] as List?;
            
            if (nahkodaId == currentUserId) {
              print('✅ [Crew] Found trip as nahkoda: ${trip['id']}');
              return true;
            }
            
            if (awakKapal != null) {
              for (var crew in awakKapal) {
                final crewId = crew is Map ? crew['id'] : crew;
                if (crewId == currentUserId) {
                  print('✅ [Crew] Found trip as crew member: ${trip['id']}');
                  return true;
                }
              }
            }
            
            return false;
          },
          orElse: () => {},
        );
        
        if (myTrip.isEmpty) return null;
        
        Map<String, dynamic>? harborCoords;
        String harborName = '-';
        final areaTangkap = myTrip['areaTangkap'];
        
        if (areaTangkap != null) {
          harborName = areaTangkap['nama'] ?? '-';
          
          if (areaTangkap['latitude'] != null && areaTangkap['longitude'] != null) {
            harborCoords = {
              'latitude': areaTangkap['latitude'],
              'longitude': areaTangkap['longitude'],
            };
          } else {
            try {
              final harborZones = await ZoneService.getAllHarborZones();
              
              for (var zone in harborZones) {
                if (zone.name.toLowerCase() == harborName.toLowerCase() ||
                    harborName.toLowerCase().contains(zone.name.toLowerCase()) ||
                    zone.name.toLowerCase().contains(harborName.toLowerCase())) {
                  
                  if (zone.isCircle && zone.centerPoint != null) {
                    harborCoords = {
                      'latitude': zone.centerPoint!.latitude,
                      'longitude': zone.centerPoint!.longitude,
                    };
                    break;
                  } else if (zone.isPolygon && zone.polygonCoordinates?.isNotEmpty == true) {
                    harborCoords = {
                      'latitude': zone.polygonCoordinates!.first.latitude,
                      'longitude': zone.polygonCoordinates!.first.longitude,
                    };
                    break;
                  }
                }
              }
              
              if (harborCoords == null) {
                final catchPolygons = await ZoneService.getAllCatchPolygons();
                for (var polygon in catchPolygons) {
                  if (polygon.name.toLowerCase() == harborName.toLowerCase() ||
                      harborName.toLowerCase().contains(polygon.name.toLowerCase()) ||
                      polygon.name.toLowerCase().contains(harborName.toLowerCase())) {
                    
                    if (polygon.coordinates.isNotEmpty) {
                      harborCoords = {
                        'latitude': polygon.coordinates.first.latitude,
                        'longitude': polygon.coordinates.first.longitude,
                      };
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              print('❌ [Crew] Error fetching zones: $e');
            }
          }
        }
        
        if (harborCoords == null) {
          harborCoords = {
            'latitude': -6.1075,
            'longitude': 106.7803,
          };
        }
        
        final perizinan = myTrip['perizinan'];
        final operasional = perizinan?['operasional'];
        
        final fuelValue = (operasional?['bensinTersedia'] ?? 0).toDouble();
        final iceValue = (operasional?['esTersedia'] ?? 0).toDouble();
        
        return {
          'tripId': myTrip['id'],
          'vesselName': myTrip['kapal']?['namaKapal'] ?? 'Kapal',
          'vesselNumber': myTrip['kapal']?['nomorRegistrasi'] ?? '-',
          'captainName': myTrip['nahkoda']?['nama'] ?? 'Nahkoda',
          'crewCount': (myTrip['awakKapal'] as List?)?.length ?? 0,
          'departureHarbor': harborName,
          'estimatedDuration': myTrip['durasi'] ?? 1,
          'departureDate': myTrip['tanggalBerangkat'] != null 
              ? DateTime.parse(myTrip['tanggalBerangkat'])
              : DateTime.now(),
          'estimatedReturnDate': myTrip['estimasiPulang'] != null
              ? DateTime.parse(myTrip['estimasiPulang'])
              : null,
          'fuelSupply': fuelValue,
          'iceSupply': iceValue,
          'emergencyContact': myTrip['kontakDarurat'] ?? '',
          'notes': myTrip['catatan'],
          'status': myTrip['status'],
          'nahkodaId': myTrip['nahkodaId'],
          'awakKapal': myTrip['awakKapal'],
          'harborCoordinates': harborCoords,
          'zoneRadius': myTrip['radiusZona']?.toDouble() ?? 50.0,
        };
      }
      
      return null;
    } catch (e) {
      print('❌ [CrewTracking] Error: $e');
      return null;
    }
  }

  void _showNoTripDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.info_outline, color: Colors.orange, size: 20),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text('Belum Ada Trip', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: const Text(
          'Belum ada trip yang dijadwalkan untuk Anda.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  void _showAlreadyTrackingDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.navigation, color: Colors.blue, size: 20),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Tracking Sedang Aktif',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'Anda sedang dalam tracking aktif. Silakan buka kembali layar tracking yang sedang berjalan.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  void _handleTracking(BuildContext context) async {
    print('\n🔵🔵🔵 [CrewButton] ===== HANDLE TRACKING =====');
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final tripData = await _getTripData();
      
      if (context.mounted) {
        Navigator.pop(context);
      }
      
      if (tripData == null) {
        if (context.mounted) {
          _showNoTripDialog(context);
        }
        return;
      }
      
      final status = tripData['status'] as String? ?? '';
      final statusLower = status.toLowerCase();
      
      print('🔵 [CrewButton] Trip status: $status');
      
      // 1. menunggu atau menunggu_dokumen -> MySchedulesScreen
      if (statusLower == 'menunggu' || statusLower == 'menunggu_dokumen') {
        print('🔵 [CrewButton] Status menunggu / menunggu_dokumen -> MySchedulesScreen');
        if (context.mounted) {
          CrewRoutes.navigateToMySchedules(context);
        }
        return;
      }
      
      // 2. menunggu_izin/pending -> PreTrackingSimple
      if (statusLower == 'menunggu_izin' || statusLower == 'pending') {
        print('🔵 [CrewButton] Status menunggu_izin -> PreTrackingSimple');
        if (context.mounted) {
          _navigateToPreTrackingSimple(context, tripData);
        }
        return;
      }
      
      // 3. disetujui/diizinkan -> Cek cuaca dulu, lalu WaitingScheduleScreen
      if (statusLower == 'disetujui' || statusLower == 'diizinkan') {
        print('🔵 [CrewButton] Status disetujui -> Cek cuaca -> WaitingScheduleScreen');
        if (context.mounted) {
          await _checkWeatherAndNavigate(context, tripData);
        }
        return;
      }
      
      // 4. berlayar/darurat -> ActiveTrackingScreen (langsung, skip cek cuaca)
      if (statusLower == 'berlayar' || statusLower == 'darurat' || statusLower == 'emergency') {
        print('🔵 [CrewButton] Status $statusLower - cek minimize dulu');
        
        // Cek apakah tracking sedang minimize
        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);
        if (minimizeProvider.isMinimized && minimizeProvider.isTracking) {
          _showAlreadyTrackingDialog(context);
          return;
        }
        
        if (context.mounted) {
          _navigateToActiveTracking(context, tripData);
        }
        return;
      }
      
      if (context.mounted) {
        _showNoTripDialog(context);
      }
    } catch (e) {
      print('❌ [Crew Tracking] Error: $e');
      if (context.mounted) {
        Navigator.pop(context);
        await Future.delayed(Duration(milliseconds: 300));
        if (context.mounted) {
          _showNoTripDialog(context);
        }
      }
    }
    
    print('🔵🔵🔵 [CrewButton] ===== END HANDLE =====\n');
  }

  Future<void> _checkWeatherAndNavigate(BuildContext context, Map<String, dynamic> tripData) async {
    if (!context.mounted) return;
    
    if (tripData['harborCoordinates'] == null) {
      _showErrorDialog(
        context,
        'Data Tidak Lengkap',
        'Koordinat zona tangkap tidak tersedia.',
      );
      return;
    }
    
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

      if (!context.mounted) return;
      Navigator.pop(context);

      if (weather == null) {
        if (!context.mounted) return;
        await Future.delayed(Duration(milliseconds: 300));
        if (!context.mounted) return;
        _navigateToWaitingSchedule(context, tripData);
        return;
      }

      final isExtreme = _isWeatherExtreme(weather);

      if (!context.mounted) return;

      if (isExtreme) {
        _showWeatherWarning(context, weather, tripData);
      } else {
        await Future.delayed(Duration(milliseconds: 300));
        if (!context.mounted) return;
        _navigateToWaitingSchedule(context, tripData);
      }
    } catch (e) {
      print('❌ [Weather Check] Error: $e');
      if (context.mounted) {
        Navigator.pop(context);
        await Future.delayed(Duration(milliseconds: 300));
        if (context.mounted) {
          _navigateToWaitingSchedule(context, tripData);
        }
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

  void _showWeatherWarning(BuildContext context, WeatherData weather, Map<String, dynamic> tripData) {
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
            onPressed: () => Navigator.pop(context),
            child: Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _showWaitAndRetryDialog(context, tripData);
            },
            child: Text('Tunggu & Coba Lagi'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _navigateToWaitingSchedule(context, tripData);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Tetap Lanjutkan'),
          ),
        ],
      ),
    );
  }

  void _showWaitAndRetryDialog(BuildContext context, Map<String, dynamic> tripData) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.schedule, color: Colors.blue, size: 28),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Menunggu Cuaca Membaik',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Menunggu 5 menit untuk cek cuaca kembali...',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal'),
          ),
        ],
      ),
    );

    Future.delayed(Duration(minutes: 5), () async {
      if (!context.mounted) return;
      Navigator.pop(context);
      await _checkWeatherAndNavigate(context, tripData);
    });
  }

  void _showErrorDialog(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Tutup'),
          ),
        ],
      ),
    );
  }

  void _navigateToPreTrackingSimple(BuildContext context, Map<String, dynamic> tripData) async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    final userRole = prefs.getString('role') ?? 'ABK';
    String userName = 'ABK';
    
    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['name'] ?? userData['nama'] ?? 'ABK';
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }
    
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PreTrackingSimple(
          tripId: tripData['tripId'],
          vesselName: tripData['vesselName'] ?? 'Kapal',
          vesselNumber: tripData['vesselNumber'] ?? '-',
          captainName: tripData['captainName'] ?? 'Nahkoda',
          crewCount: tripData['crewCount'] ?? 0,
          departureHarbor: tripData['departureHarbor'] ?? '-',
          departureDate: tripData['departureDate'] ?? DateTime.now(),
          estimatedReturnDate: tripData['estimatedReturnDate'],
          estimatedDuration: tripData['estimatedDuration'] ?? 1,
          fuelAmount: tripData['fuelSupply']?.toDouble() ?? 0.0,
          iceStorage: tripData['iceSupply']?.toDouble() ?? 0.0,
          harborCoordinates: tripData['harborCoordinates'],
          zoneRadius: tripData['zoneRadius']?.toDouble() ?? 50.0,
          userRole: userRole,
          userName: userName,
        ),
      ),
    );
  }

  void _navigateToWaitingSchedule(BuildContext context, Map<String, dynamic> tripData) async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    final userRole = prefs.getString('role') ?? 'ABK';
    String userName = 'ABK';
    
    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['name'] ?? userData['nama'] ?? 'ABK';
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }
    
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => WaitingScheduleScreen(
          scheduledDepartureTime: tripData['departureDate'] ?? DateTime.now(),
          tripData: {
            'vesselName': tripData['vesselName'] ?? 'Kapal',
            'vesselNumber': tripData['vesselNumber'] ?? '-',
            'captainName': tripData['captainName'] ?? 'Nahkoda',
            'crewCount': tripData['crewCount'] ?? 0,
            'selectedHarbor': tripData['departureHarbor'] ?? '-',
            'departureTime': tripData['departureDate'] ?? DateTime.now(),
            'estimatedReturnDate': tripData['estimatedReturnDate'],
            'estimatedDuration': tripData['estimatedDuration'] ?? 1,
            'emergencyContact': tripData['emergencyContact'] ?? '',
            'fuelAmount': tripData['fuelSupply']?.toDouble() ?? 0.0,
            'iceStorage': tripData['iceSupply']?.toDouble() ?? 0.0,
            'notes': tripData['notes'],
            'harborCoordinates': tripData['harborCoordinates'],
            'zoneRadius': tripData['zoneRadius']?.toDouble() ?? 50.0,
            'userRole': userRole,
            'userName': userName,
          },
        ),
      ),
    );
  }

  void _navigateToActiveTracking(BuildContext context, Map<String, dynamic> tripData) async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    final userRole = prefs.getString('role') ?? 'ABK';
    String userName = tripData['captainName'] ?? 'ABK';
    
    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['nama'] ?? userData['name'] ?? tripData['captainName'] ?? 'ABK';
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }
    
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ActiveTrackingScreen(
          vesselName: tripData['vesselName'] ?? 'Kapal',
          vesselNumber: tripData['vesselNumber'] ?? '-',
          captainName: tripData['captainName'] ?? 'Nahkoda',
          crewCount: tripData['crewCount'] ?? 0,
          selectedHarbor: tripData['departureHarbor'] ?? '-',
          departureTime: tripData['departureDate'] ?? DateTime.now(),
          estimatedReturnDate: tripData['estimatedReturnDate'],
          estimatedDuration: tripData['estimatedDuration'] ?? 1,
          emergencyContact: tripData['emergencyContact'] ?? '',
          fuelAmount: tripData['fuelSupply']?.toDouble() ?? 0.0,
          iceStorage: tripData['iceSupply']?.toDouble() ?? 0.0,
          notes: tripData['notes'],
          harborCoordinates: tripData['harborCoordinates'],
          zoneRadius: tripData['zoneRadius']?.toDouble() ?? 50.0,
          userRole: userRole,
          userName: userName,
          tripId: tripData['id'],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isNight = now.hour >= 18 || now.hour < 6;
    final lottieAsset = isNight 
        ? 'assets/animations/tripmalam.json'
        : 'assets/animations/tripsiang.json';

    return FutureBuilder<Map<String, dynamic>?>(
      future: _getTripData(),
      builder: (context, snapshot) {
        // Prioritas warna border (dari tertinggi ke terendah):
        Color borderColor = Colors.grey; // Default
        
        if (snapshot.connectionState == ConnectionState.done && snapshot.hasData && snapshot.data != null) {
          final status = snapshot.data!['status']?.toString().toLowerCase() ?? '';
          
          // PRIORITAS 1: Darurat (Merah)
          if (status == 'darurat' || status == 'emergency') {
            borderColor = Colors.red;
          }
          // PRIORITAS 2: Berlayar (Hijau)
          else if (status == 'berlayar' || status == 'sedang_melaut' || status == 'active' || status == 'sailing') {
            borderColor = Colors.green;
          }
          // PRIORITAS 3: Disetujui (Biru)
          else if (status == 'diizinkan' || status == 'disetujui') {
            borderColor = const Color(0xFF1565C0);
          }
          // PRIORITAS 4: Menunggu (Kuning)
          else if (status == 'menunggu' || status == 'menunggu_dokumen' || status == 'menunggu_izin' || status == 'pending') {
            borderColor = Colors.amber;
          }
        }

        return GestureDetector(
          onTap: () {
            if (!snapshot.hasData || snapshot.data == null) {
              _showNoTripDialog(context);
            } else {
              _handleTracking(context);
            }
          },
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: borderColor, width: 4),
              boxShadow: [
                BoxShadow(
                  color: borderColor.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipOval(
              child: Lottie.asset(
                lottieAsset,
                fit: BoxFit.cover,
                repeat: true,
                animate: true,
              ),
            ),
          ),
        );
      },
    );
  }
}
