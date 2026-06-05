import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../../routes/nahkoda_routes.dart';
import '../../../services/api/trip_service.dart';
import '../../../services/api/zone_service.dart';
import '../../../services/cuaca/weather_service.dart';
import '../../../provider/tracking_minimize_provider.dart';
import '../../../constants/tracking_constants.dart';
import '../../tracking/waiting_schedule_screen.dart';
import '../../tracking/waiting_approval_screen.dart';
import 'dart:core';

class NahkodaTrackingButton extends StatelessWidget {
  const NahkodaTrackingButton({super.key});

  // Get trip data from API
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

        // Filter trips untuk nahkoda ini
        final myTrips = allTrips.where((trip) {
          final nahkodaId = trip['nahkodaId'];
          return nahkodaId == currentUserId;
        }).toList();

        if (myTrips.isEmpty) return null;

        print('🔍 [Nahkoda] Total my trips: ${myTrips.length}');

        // PRIORITAS 1: Cari trip dengan status "berlayar" atau "darurat"
        var myTrip = myTrips.firstWhere((trip) {
          final status = trip['status']?.toLowerCase();
          return status == 'berlayar' ||
              status == 'darurat' ||
              status == 'emergency';
        }, orElse: () => {});

        if (myTrip.isNotEmpty) {
          print('✅ [Nahkoda] PRIORITAS 1: Ditemukan trip berlayar/darurat');
        } else {
          // PRIORITAS 2: Cari trip dengan status "disetujui" atau "diizinkan"
          myTrip = myTrips.firstWhere((trip) {
            final status = trip['status']?.toLowerCase();
            return status == 'disetujui' || status == 'diizinkan';
          }, orElse: () => {});

          if (myTrip.isNotEmpty) {
            print(
              '✅ [Nahkoda] PRIORITAS 2: Ditemukan trip disetujui/diizinkan',
            );
          } else {
            // PRIORITAS 3: Cari trip dengan status "aktif"
            myTrip = myTrips.firstWhere(
              (trip) => trip['status']?.toLowerCase() == 'aktif',
              orElse: () => {},
            );

            if (myTrip.isNotEmpty) {
              print('✅ [Nahkoda] PRIORITAS 3: Ditemukan trip aktif');
            } else {
              // PRIORITAS 4: Cari trip dengan status "menunggu" atau "menunggu_dokumen"
              myTrip = myTrips.firstWhere(
                (trip) => trip['status']?.toLowerCase() == 'menunggu' || trip['status']?.toLowerCase() == 'menunggu_dokumen',
                orElse: () => {},
              );

              if (myTrip.isNotEmpty) {
                print(
                  '✅ [Nahkoda] PRIORITAS 4: Ditemukan trip menunggu_dokumen',
                );
              } else {
                // FALLBACK: Ambil trip pertama
                myTrip = myTrips.first;
                print('⚠️ [Nahkoda] FALLBACK: Menggunakan trip pertama');
              }
            }
          }
        }

        print(
          '🔍 [Nahkoda] Selected trip ID: ${myTrip['id']}, Status: ${myTrip['status']}',
        );

        // Debug SEMUA field di myTrip
        print('🔍 [Nahkoda] ===== ALL TRIP FIELDS =====');
        myTrip.forEach((key, value) {
          print('🔍 [Nahkoda]   $key: $value');
        });
        print('🔍 [Nahkoda] ===== END ALL FIELDS =====');

        print('🔍 [Nahkoda] ===== PARSING HARBOR COORDINATES =====');

        // Parse harbor coordinates
        Map<String, dynamic>? harborCoords;
        String harborName = '-';

        // PRIORITAS 1: Gunakan harborZoneId dari backend (paling akurat)
        final harborZoneId = myTrip['harborZoneId'];
        final harborZone = myTrip['harborZone'];
        final areaTangkap = myTrip['areaTangkap'];

        print('🔍 [Nahkoda] harborZoneId: $harborZoneId');
        print('🔍 [Nahkoda] harborZone: $harborZone');
        print('🔍 [Nahkoda] areaTangkap: $areaTangkap');

        // PRIORITAS 1: Cek harborZoneId (paling akurat dari backend)
        if (harborZoneId != null) {
          print(
            '✅ [Nahkoda] PRIORITAS 1: Menggunakan harborZoneId: $harborZoneId',
          );
          try {
            final harborZones = await ZoneService.getAllHarborZones();
            final matchedZone = harborZones.firstWhere(
              (zone) => zone.id == harborZoneId,
              orElse: () => throw Exception('Zone not found'),
            );

            harborName = matchedZone.name;

            if (matchedZone.isCircle && matchedZone.centerPoint != null) {
              harborCoords = {
                'latitude': matchedZone.centerPoint!.latitude,
                'longitude': matchedZone.centerPoint!.longitude,
              };
              print(
                '✅ [Nahkoda] Koordinat dari harborZoneId (circle): $harborCoords',
              );
            } else if (matchedZone.isPolygon &&
                matchedZone.polygonCoordinates != null &&
                matchedZone.polygonCoordinates!.isNotEmpty) {
              harborCoords = {
                'latitude': matchedZone.polygonCoordinates!.first.latitude,
                'longitude': matchedZone.polygonCoordinates!.first.longitude,
              };
              print(
                '✅ [Nahkoda] Koordinat dari harborZoneId (polygon): $harborCoords',
              );
            }
          } catch (e) {
            print('❌ [Nahkoda] Error fetching zone by ID: $e');
          }
        }

        // PRIORITAS 2: Cek harborZone yang sudah populated
        if (harborCoords == null && harborZone != null) {
          print('✅ [Nahkoda] PRIORITAS 2: Menggunakan harborZone populated');
          harborName = harborZone['name'] ?? '-';

          if (harborZone['latitude'] != null &&
              harborZone['longitude'] != null) {
            harborCoords = {
              'latitude': harborZone['latitude'],
              'longitude': harborZone['longitude'],
            };
            print('✅ [Nahkoda] Koordinat dari harborZone: $harborCoords');
          } else if (harborZone['centerPoint'] != null) {
            final center = harborZone['centerPoint'];
            if (center['latitude'] != null && center['longitude'] != null) {
              harborCoords = {
                'latitude': center['latitude'],
                'longitude': center['longitude'],
              };
              print(
                '✅ [Nahkoda] Koordinat dari harborZone.centerPoint: $harborCoords',
              );
            }
          }
        }

        // PRIORITAS 3: Cek areaTangkap dengan koordinat langsung
        if (harborCoords == null && areaTangkap != null) {
          print('✅ [Nahkoda] PRIORITAS 3: Menggunakan areaTangkap');
          harborName = areaTangkap['nama'] ?? '-';

          if (areaTangkap['latitude'] != null &&
              areaTangkap['longitude'] != null) {
            harborCoords = {
              'latitude': areaTangkap['latitude'],
              'longitude': areaTangkap['longitude'],
            };
            print('✅ [Nahkoda] Koordinat dari areaTangkap: $harborCoords');
          } else if (harborName != '-' && harborName != 'Area tidak diset') {
            // Cari di harbor-zones berdasarkan nama
            print('🔍 [Nahkoda] Mencari "$harborName" di harbor-zones...');
            try {
              final harborZones = await ZoneService.getAllHarborZones();
              for (var zone in harborZones) {
                if (zone.name.toLowerCase() == harborName.toLowerCase()) {
                  print('✅ [Nahkoda] MATCH! Zone: ${zone.name}');
                  if (zone.isCircle && zone.centerPoint != null) {
                    harborCoords = {
                      'latitude': zone.centerPoint!.latitude,
                      'longitude': zone.centerPoint!.longitude,
                    };
                    print('✅ [Nahkoda] Koordinat: $harborCoords');
                    break;
                  } else if (zone.isPolygon &&
                      zone.polygonCoordinates != null &&
                      zone.polygonCoordinates!.isNotEmpty) {
                    harborCoords = {
                      'latitude': zone.polygonCoordinates!.first.latitude,
                      'longitude': zone.polygonCoordinates!.first.longitude,
                    };
                    print('✅ [Nahkoda] Koordinat: $harborCoords');
                    break;
                  }
                }
              }
              if (harborCoords == null) {
                print(
                  '❌ [Nahkoda] "$harborName" tidak ditemukan di harbor-zones',
                );
              }
            } catch (e) {
              print('❌ [Nahkoda] Error: $e');
            }
          }
        }

        // PRIORITAS 4: Cari di catch-polygons jika masih null
        if (harborCoords == null &&
            harborName != '-' &&
            harborName != 'Area tidak diset') {
          print(
            '🔍 [Nahkoda] PRIORITAS 4: Mencari "$harborName" di catch-polygons...',
          );
          try {
            final catchZones = await ZoneService.getAllCatchPolygons();
            for (var zone in catchZones) {
              if (zone.name.toLowerCase() == harborName.toLowerCase()) {
                print(
                  '✅ [Nahkoda] MATCH di catch-polygons! Zone: ${zone.name}',
                );
                if (zone.coordinates.isNotEmpty) {
                  harborCoords = {
                    'latitude': zone.coordinates.first.latitude,
                    'longitude': zone.coordinates.first.longitude,
                  };
                  print(
                    '✅ [Nahkoda] Koordinat dari catch-polygons: $harborCoords',
                  );
                  break;
                }
              }
            }
            if (harborCoords == null) {
              print(
                '❌ [Nahkoda] "$harborName" tidak ditemukan di catch-polygons',
              );
            }
          } catch (e) {
            print('❌ [Nahkoda] Error: $e');
          }
        }

        // FALLBACK: Gunakan koordinat default
        if (harborCoords == null) {
          print('⚠️ [Nahkoda] FALLBACK: Menggunakan koordinat default');
          harborName = 'Pelabuhan Muara Baru (Default)';
          harborCoords = {'latitude': -6.1075, 'longitude': 106.7803};
          print('✅ [Nahkoda] Koordinat default: $harborCoords');
        }

        print('🔍 [Nahkoda] Final harborCoords: $harborCoords');

        // ⚠️ VALIDASI KOORDINAT DARI BACKEND
        // ignore: unnecessary_null_comparison
        if (harborCoords != null) {
          final lat = harborCoords['latitude'];
          final lng = harborCoords['longitude'];

          print('🚨 [Nahkoda] ===== VALIDASI KOORDINAT BACKEND =====');
          print('🚨 [Nahkoda] RAW latitude: $lat');
          print('🚨 [Nahkoda] RAW longitude: $lng');
          print('🚨 [Nahkoda] Latitude valid range: -90 to 90');
          print('🚨 [Nahkoda] Longitude valid range: -180 to 180');

          if (lat != null && lng != null) {
            final latValue = (lat is num)
                ? lat.toDouble()
                : double.parse(lat.toString());
            final lngValue = (lng is num)
                ? lng.toDouble()
                : double.parse(lng.toString());

            print('🚨 [Nahkoda] Parsed latitude: $latValue');
            print('🚨 [Nahkoda] Parsed longitude: $lngValue');

            if (latValue.abs() > 90) {
              print('❌ [Nahkoda] ERROR! Latitude ($latValue) MELEBIHI BATAS!');
              print('❌ [Nahkoda] Kemungkinan KOORDINAT TERBALIK dari backend!');
              print(
                '❌ [Nahkoda] Seharusnya: latitude=$lngValue, longitude=$latValue',
              );
            } else if (lngValue.abs() > 180) {
              print('❌ [Nahkoda] ERROR! Longitude ($lngValue) MELEBIHI BATAS!');
            } else {
              print('✅ [Nahkoda] Koordinat VALID!');
            }

            // Cek apakah koordinat untuk Indonesia
            if (latValue >= -11 &&
                latValue <= 6 &&
                lngValue >= 95 &&
                lngValue <= 141) {
              print('✅ [Nahkoda] Koordinat dalam range Indonesia');
            } else {
              print('⚠️ [Nahkoda] WARNING! Koordinat di luar Indonesia!');
              print(
                '⚠️ [Nahkoda] Indonesia range: lat=-11 to 6, lng=95 to 141',
              );
            }
          }
          print('🚨 [Nahkoda] ===== END VALIDASI =====');
        }

        print('🔍 [Nahkoda] ===== END PARSING =====');

        // Debug tanggal keberangkatan
        print('📅 [Nahkoda] ===== DEBUG TANGGAL =====');
        print('📅 [Nahkoda] Raw waktuMulai: ${myTrip['waktuMulai']}');
        print(
          '📅 [Nahkoda] Raw tanggalBerangkat: ${myTrip['tanggalBerangkat']}',
        );

        // PRIORITAS: waktuMulai > tanggalBerangkat (sama seperti WaitingApprovalScreen)
        DateTime? departureDate;
        if (myTrip['waktuMulai'] != null) {
          departureDate = DateTime.parse(myTrip['waktuMulai']);
          print('📅 [Nahkoda] Using waktuMulai: $departureDate');
        } else if (myTrip['tanggalBerangkat'] != null) {
          departureDate = DateTime.parse(myTrip['tanggalBerangkat']);
          print('📅 [Nahkoda] Using tanggalBerangkat: $departureDate');
        } else {
          departureDate = DateTime.now();
          print('📅 [Nahkoda] Using DateTime.now(): $departureDate');
        }

        print('📅 [Nahkoda] Final departureDate: $departureDate');
        print('📅 [Nahkoda] Current time: ${DateTime.now()}');
        print(
          '📅 [Nahkoda] Time difference: ${departureDate.difference(DateTime.now())}',
        );
        print('📅 [Nahkoda] ===== END DEBUG =====');

        // Debug BBM dan Es dari perizinan.operasional
        print('⛽ [Nahkoda] ===== DEBUG BBM & ES =====');
        final perizinan = myTrip['perizinan'];
        final operasional = perizinan?['operasional'];
        print('⛽ [Nahkoda] perizinan: $perizinan');
        print('⛽ [Nahkoda] operasional: $operasional');

        final fuelValue = (operasional?['bensinTersedia'] ?? 0).toDouble();
        final iceValue = (operasional?['esTersedia'] ?? 0).toDouble();

        print('⛽ [Nahkoda] bensinTersedia: ${operasional?['bensinTersedia']}');
        print('⛽ [Nahkoda] esTersedia: ${operasional?['esTersedia']}');
        print('⛽ [Nahkoda] Converted fuelSupply: $fuelValue');
        print('⛽ [Nahkoda] Converted iceSupply: $iceValue');
        print('⛽ [Nahkoda] ===== END DEBUG =====');

        // Debug radius zona
        print('📏 [Nahkoda] ===== DEBUG RADIUS ZONA =====');
        print(
          '📏 [Nahkoda] Raw radiusZona from backend: ${myTrip['radiusZona']}',
        );
        final zoneRadius = myTrip['radiusZona']?.toDouble() ?? 50.0;
        print('📏 [Nahkoda] Final zoneRadius: $zoneRadius km');
        if (myTrip['radiusZona'] == null) {
          print(
            '⚠️ [Nahkoda] Backend TIDAK kirim radiusZona, pakai default 50 km',
          );
        } else {
          print(
            '✅ [Nahkoda] Backend kirim radiusZona: ${myTrip['radiusZona']} km',
          );
        }
        print('📏 [Nahkoda] ===== END DEBUG =====');

        return {
          'tripId': myTrip['id'],
          'vesselName': myTrip['kapal']?['namaKapal'] ?? 'Kapal',
          'vesselNumber': myTrip['kapal']?['nomorRegistrasi'] ?? '-',
          'captainName': myTrip['nahkoda']?['nama'] ?? 'Nahkoda',
          'crewCount': (myTrip['awakKapal'] as List?)?.length ?? 0,
          'departureHarbor': harborName,
          'estimatedDuration': myTrip['durasi'] ?? 1,
          'departureDate': departureDate,
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
      print('❌ [NahkodaTracking] Error: $e');
      return null;
    }
  }

  void _showTooEarlyDialog(BuildContext context, Duration timeUntilCanStart) {
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
              child: const Icon(Icons.schedule, color: Colors.orange, size: 20),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Belum Waktunya',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tracking dapat dimulai ${TrackingConstants.nahkodaBufferMinutes ~/ 60} jam sebelum waktu keberangkatan.',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tersedia dalam: ${_formatDuration(timeUntilCanStart)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.orange,
                      ),
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
            child: const Text('Tutup'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              NahkodaRoutes.navigateToTripInfo(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1B4F9C),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Cek Info Trip'),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    if (duration.inDays > 0) {
      return '${duration.inDays} hari ${duration.inHours % 24} jam';
    } else if (duration.inHours > 0) {
      return '${duration.inHours} jam ${duration.inMinutes % 60} menit';
    } else {
      return '${duration.inMinutes} menit';
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
              child: const Icon(Icons.schedule, color: Colors.orange, size: 20),
            ),
            const SizedBox(width: 12),
            const Text(
              'Belum Ada Penjadwalan Trip',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Text(
          'Admin belum mengirim informasi trip. Silakan hubungi admin untuk penjadwalan trip atau cek Info Trip untuk melihat jadwal terbaru.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              NahkodaRoutes.navigateToTripInfo(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1B4F9C),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Cek Info Trip'),
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

  void _handleTripPreparation(BuildContext context) async {
    print('\n🔵🔵🔵 [NahkodaButton] ===== HANDLE TRIP PREPARATION =====');

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
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

      // Cek status trip untuk routing yang tepat
      final status = tripData['status'] as String? ?? '';
      final statusLower = status.toLowerCase();

      print('🔵 [NahkodaButton] Trip status: $status');

      // PRIORITAS ROUTING BERDASARKAN STATUS:
      // 1. menunggu atau menunggu_dokumen -> MySchedulesScreen
      if (statusLower == 'menunggu' || statusLower == 'menunggu_dokumen') {
        print(
          '🔵 [NahkodaButton] Status menunggu / menunggu_dokumen -> MySchedulesScreen',
        );
        if (context.mounted) {
          NahkodaRoutes.navigateToMySchedules(context);
        }
        return;
      }

      // 2. aktif -> MySchedulesScreen (PreTripSimple)
      if (statusLower == 'aktif') {
        print('🔵 [NahkodaButton] Status aktif -> MySchedulesScreen');
        if (context.mounted) {
          NahkodaRoutes.navigateToMySchedules(context);
        }
        return;
      }

      // 3. menunggu_izin/pending -> WaitingApprovalScreen
      if (statusLower == 'menunggu_izin' || statusLower == 'pending') {
        print(
          '🔵 [NahkodaButton] Status menunggu_izin/pending -> WaitingApprovalScreen',
        );
        if (context.mounted) {
          _navigateToWaitingApproval(context, tripData);
        }
        return;
      }

      // 4. diizinkan/disetujui -> Cek cuaca dulu, lalu WaitingScheduleScreen
      if (statusLower == 'diizinkan' || statusLower == 'disetujui') {
        print(
          '🔵 [NahkodaButton] Status diizinkan/disetujui -> Cek cuaca -> WaitingScheduleScreen',
        );
        if (context.mounted) {
          await _checkWeatherAndNavigate(context, tripData);
        }
        return;
      }

      // 5. berlayar/darurat -> Langsung ke ActiveTrackingScreen (sudah dimulai)
      if (statusLower == 'berlayar' ||
          statusLower == 'darurat' ||
          statusLower == 'emergency') {
        print(
          '🔵 [NahkodaButton] Status $statusLower - cek minimize dulu',
        );
        
        // Cek apakah tracking sedang minimize
        if (!context.mounted) return;
        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);
        if (minimizeProvider.isMinimized && minimizeProvider.isTracking) {
          if (!context.mounted) return;
          _showAlreadyTrackingDialog(context);
          return;
        }
        
        if (context.mounted) {
          _navigateToActiveTracking(context, tripData);
        }
        return;
      }

      // FALLBACK: Cek waktu buffer untuk mulai tracking
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      final userRole = prefs.getString('role') ?? 'nahkoda';
      int? currentUserId;

      if (userDataString != null) {
        try {
          final userData = json.decode(userDataString);
          currentUserId = userData['id'];
        } catch (e) {
          print('❌ Error parsing user_data: $e');
        }
      }

      if (currentUserId == null) {
        if (context.mounted) {
          _showNoTripDialog(context);
        }
        return;
      }

      final departureDate = tripData['departureDate'] as DateTime;
      final nahkodaId = tripData['nahkodaId'] as int?;
      final awakKapal = tripData['awakKapal'] as List<dynamic>?;

      final canAccess = TrackingConstants.canAccessTracking(
        role: userRole,
        userId: currentUserId,
        nahkodaId: nahkodaId,
        awakKapal: awakKapal,
        departureDate: departureDate,
        status: status,
      );

      if (!canAccess) {
        final now = DateTime.now();
        final bufferMinutes = TrackingConstants.getBufferMinutes(userRole);
        final allowedStartTime = departureDate.subtract(
          Duration(minutes: bufferMinutes),
        );

        if (context.mounted) {
          _showTooEarlyDialog(context, allowedStartTime.difference(now));
        }
      } else {
        print('🔵 [NahkodaButton] Buffer time reached - go to WaitingSchedule');
        if (context.mounted) {
          _navigateToWaitingSchedule(context, tripData);
        }
      }
    } catch (e) {
      print('❌ [Trip Preparation] Error: $e');
      if (context.mounted) {
        Navigator.pop(context);
        await Future.delayed(Duration(milliseconds: 300));
        if (context.mounted) {
          _showNoTripDialog(context);
        }
      }
    }

    print('🔵🔵🔵 [NahkodaButton] ===== END HANDLE =====\n');
  }

  void _navigateToActiveTracking(
    BuildContext context,
    Map<String, dynamic> tripData,
  ) async {
    // Get user data for userRole and userName
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    final userRole = prefs.getString('role') ?? 'Nahkoda';
    String userName =
        tripData['captainName'] ??
        'Nahkoda'; // Default ke captain name dari trip

    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        // Ambil nama dari user_data, fallback ke captain name dari trip
        userName = userData['nama'] ?? tripData['captainName'] ?? 'Nahkoda';
        print('👤 [Navigate] userName from user_data: $userName');
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }

    // Debug sebelum navigasi
    print('\n🚀 [NahkodaButton] ===== SENDING TO ACTIVE TRACKING =====');
    print(
      '🚀 [NahkodaButton] vesselName: "${tripData['vesselName'] ?? 'Kapal'}"',
    );
    print(
      '🚀 [NahkodaButton] vesselNumber: "${tripData['vesselNumber'] ?? '-'}"',
    );
    print(
      '🚀 [NahkodaButton] captainName: "${tripData['captainName'] ?? 'Nahkoda'}"',
    );
    print('🚀 [NahkodaButton] crewCount: ${tripData['crewCount'] ?? 0}');
    print(
      '🚀 [NahkodaButton] selectedHarbor (departureHarbor): "${tripData['departureHarbor'] ?? '-'}"',
    );
    print(
      '🚀 [NahkodaButton] departureTime (departureDate): ${tripData['departureDate'] ?? DateTime.now()}',
    );
    print(
      '🚀 [NahkodaButton] estimatedReturnDate: ${tripData['estimatedReturnDate']}',
    );
    print(
      '🚀 [NahkodaButton] estimatedDuration: ${tripData['estimatedDuration'] ?? 1}',
    );
    print(
      '🚀 [NahkodaButton] fuelAmount (fuelSupply): ${tripData['fuelSupply']?.toDouble() ?? 0.0}',
    );
    print(
      '🚀 [NahkodaButton] iceStorage (iceSupply): ${tripData['iceSupply']?.toDouble() ?? 0.0}',
    );
    print(
      '🚀 [NahkodaButton] harborCoordinates: ${tripData['harborCoordinates']}',
    );
    print(
      '🚀 [NahkodaButton] zoneRadius: ${tripData['zoneRadius']?.toDouble() ?? 50.0}',
    );
    print('🚀 [NahkodaButton] userRole: "$userRole"');
    print('🚀 [NahkodaButton] userName: "$userName"');
    print(
      '🚀 [NahkodaButton] emergencyContact: "${tripData['emergencyContact'] ?? ''}"',
    );
    print('🚀 [NahkodaButton] notes: "${tripData['notes']}"');
    print('🚀 [NahkodaButton] ===== END SENDING DATA =====\n');

    if (!context.mounted) return;
    NahkodaRoutes.navigateToActiveTracking(
      context,
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
    );
  }

  void _navigateToWaitingSchedule(
    BuildContext context,
    Map<String, dynamic> tripData,
  ) async {
    // Validasi koordinat zona tangkap sebelum navigasi
    if (tripData['harborCoordinates'] == null) {
      _showErrorDialog(
        context,
        'Data Tidak Lengkap',
        'Koordinat zona tangkap tidak tersedia. Silakan hubungi admin untuk melengkapi data trip.',
      );
      return;
    }

    // Get user data for userRole and userName
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    final userRole = prefs.getString('role') ?? 'Nahkoda';
    String userName = tripData['captainName'] ?? 'Nahkoda';

    if (userDataString != null) {
      try {
        final userData = json.decode(userDataString);
        userName = userData['nama'] ?? tripData['captainName'] ?? 'Nahkoda';
      } catch (e) {
        print('❌ Error parsing user_data: $e');
      }
    }

    // Debug sebelum navigasi
    print('⏰ [WaitingSchedule] ===== SENDING DATA =====');
    print('⏰ [WaitingSchedule] userName: $userName');
    print('⏰ [WaitingSchedule] fuelSupply: ${tripData['fuelSupply']}');
    print('⏰ [WaitingSchedule] iceSupply: ${tripData['iceSupply']}');
    print('⏰ [WaitingSchedule] ===== END =====');

    if (!context.mounted) return;
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

  void _navigateToWaitingApproval(
    BuildContext context,
    Map<String, dynamic> tripData,
  ) {
    // Debug sebelum navigasi
    print('⏳ [WaitingApproval] ===== SENDING DATA =====');
    print('⏳ [WaitingApproval] fuelSupply: ${tripData['fuelSupply']}');
    print('⏳ [WaitingApproval] iceSupply: ${tripData['iceSupply']}');
    print('⏳ [WaitingApproval] ===== END =====');

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => WaitingApprovalScreen(
          tripData: {
            'tripId': tripData['tripId'],
            'vesselName': tripData['vesselName'] ?? 'Kapal',
            'vesselNumber': tripData['vesselNumber'] ?? '-',
            'captainName': tripData['captainName'] ?? 'Nahkoda',
            'crewCount': tripData['crewCount'] ?? 0,
            'departureHarbor': tripData['departureHarbor'] ?? '-',
            'departureDate': tripData['departureDate'] ?? DateTime.now(),
            'estimatedReturnDate': tripData['estimatedReturnDate'],
            'estimatedDuration': tripData['estimatedDuration'] ?? 1,
            'emergencyContact': tripData['emergencyContact'] ?? '',
            'fuelAmount': tripData['fuelSupply']?.toDouble() ?? 0.0,
            'iceStorage': tripData['iceSupply']?.toDouble() ?? 0.0,
            'notes': tripData['notes'],
            'harborCoordinates': tripData['harborCoordinates'],
            'zoneRadius': tripData['zoneRadius']?.toDouble() ?? 50.0,
          },
        ),
      ),
    );
  }

  void _showErrorDialog(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red),
            SizedBox(width: 8),
            Text(title),
          ],
        ),
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

  Future<void> _checkWeatherAndNavigate(
    BuildContext context,
    Map<String, dynamic> tripData,
  ) async {
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
      if (context.mounted) {
        Navigator.pop(context);
        await Future.delayed(Duration(milliseconds: 300));
        if (context.mounted) _navigateToWaitingSchedule(context, tripData);
      }
    }
  }

  bool _isWeatherExtreme(WeatherData weather) {
    final condition = weather.condition.toLowerCase();
    if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm') ||
        condition.contains('badai'))
      return true;
    if (weather.windSpeed > 40) return true;
    if (weather.waveHeight > 2.5) return true;
    return false;
  }

  void _showWeatherWarning(
    BuildContext context,
    WeatherData weather,
    Map<String, dynamic> tripData,
  ) {
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
            Text('� Kondisi: ${weather.condition}'),
            Text(
              '� Kecepatan Angin: ${weather.windSpeed.toStringAsFixed(1)} km/h',
            ),
            Text('� Tinggi Ombak: ${weather.waveHeight.toStringAsFixed(1)} m'),
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

  void _showWaitAndRetryDialog(
    BuildContext context,
    Map<String, dynamic> tripData,
  ) {
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
          final departureDate = snapshot.data!['departureDate'] as DateTime?;
          
          // PRIORITAS 1: Darurat (Merah)
          if (status == 'darurat' || status == 'emergency') {
            borderColor = Colors.red;
          }
          // PRIORITAS 2: Berlayar (Hijau)
          else if (status == 'berlayar' || status == 'sedang_melaut' || status == 'active' || status == 'sailing') {
            borderColor = Colors.green;
          }
          // PRIORITAS 3: Disetujui + Buffer Time (Hijau jika sudah masuk buffer 24 jam)
          else if ((status == 'diizinkan' || status == 'disetujui') && departureDate != null) {
            final trackingStartTime = departureDate.subtract(Duration(hours: 24));
            final isWithinBuffer = now.isAfter(trackingStartTime) || now.isAtSameMomentAs(trackingStartTime);
            borderColor = isWithinBuffer ? Colors.green : const Color(0xFF1565C0);
          }
          // PRIORITAS 4: Menunggu (Kuning)
          else if (status == 'menunggu' || status == 'menunggu_dokumen' || status == 'menunggu_izin' || status == 'pending' || status == 'aktif') {
            borderColor = Colors.amber;
          }
        }

        return GestureDetector(
          onTap: () {
            if (!snapshot.hasData || snapshot.data == null) {
              _showNoTripDialog(context);
            } else {
              _handleTripPreparation(context);
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
