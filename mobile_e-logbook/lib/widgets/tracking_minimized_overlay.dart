import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';
import 'package:e_logbook/screens/tracking/production_map.dart';
import 'package:e_logbook/screens/tracking/active_tracking_screen.dart';
import 'package:e_logbook/screens/main_screen.dart';

class TrackingMinimizedOverlay extends StatefulWidget {
  const TrackingMinimizedOverlay({super.key});

  @override
  State<TrackingMinimizedOverlay> createState() => _TrackingMinimizedOverlayState();
}

class _TrackingMinimizedOverlayState extends State<TrackingMinimizedOverlay> with SingleTickerProviderStateMixin {
  Offset? _position;
  Offset? _dragPosition;
  bool _showControls = false;
  late AnimationController _snapController;


  @override
  void initState() {
    super.initState();
    print('🟢 [Minimize Widget] initState called - Widget created');
    _snapController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    print('🔴 [Minimize Widget] dispose called - Widget destroyed');
    _snapController.dispose();
    super.dispose();
  }

  Offset _getInitialPosition(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    return Offset(16, screenHeight - 180 - 80); // Kiri bawah
  }

  Offset _snapToCorner(Offset position, Size screenSize) {
    final centerX = position.dx + 70;
    final centerY = position.dy + 90;
    final isRight = centerX > screenSize.width / 2;
    final isBottom = centerY > screenSize.height / 2;

    final x = isRight ? screenSize.width - 140 - 16 : 16.0;
    final y = isBottom ? screenSize.height - 180 - 80 : 80.0;

    return Offset(x, y);
  }

  void _animateToCorner(Offset targetPosition) {
    setState(() {
      _position = targetPosition;
      _dragPosition = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    print('🔄 [Minimize Widget] build called - Rebuilding widget');
    return Consumer<TrackingMinimizeProvider>(
      builder: (context, provider, child) {
        print('📊 [Minimize Widget] Consumer builder called');
        print('📊 [Minimize Widget] isMinimized: ${provider.isMinimized}');
        print('📊 [Minimize Widget] isTrackingActive: ${provider.isTrackingActive}');
        
        final trackingData = provider.trackingData;
        final currentPosition = provider.currentPosition;
        
        print('📊 [Minimize Widget] trackingData: ${trackingData != null}');
        print('📊 [Minimize Widget] currentPosition: ${currentPosition != null}');
        
        if (trackingData == null) {
          print('⚠️ [Minimize Widget] trackingData is null - returning empty widget');
          return const SizedBox.shrink();
        }

        final position = _dragPosition ?? _position ?? _getInitialPosition(context);

        return AnimatedPositioned(
          duration: _dragPosition != null ? Duration.zero : const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          left: position.dx,
          top: position.dy,
          child: GestureDetector(
            onTap: () {
              print('👆 [Minimize Widget] Widget tapped - toggling controls');
              print('👆 [Minimize Widget] Current _showControls: $_showControls');
              setState(() => _showControls = !_showControls);
              print('👆 [Minimize Widget] New _showControls: $_showControls');
            },
            onPanStart: (details) {
              setState(() {
                _dragPosition = _position ?? _getInitialPosition(context);
              });
            },
            onPanUpdate: (details) {
              setState(() {
                _dragPosition = Offset(
                  (_dragPosition!.dx + details.delta.dx).clamp(0.0, MediaQuery.of(context).size.width - 140.0),
                  (_dragPosition!.dy + details.delta.dy).clamp(0.0, MediaQuery.of(context).size.height - 180.0),
                );
              });
            },
            onPanEnd: (details) {
              if (_dragPosition != null) {
                final targetPosition = _snapToCorner(_dragPosition!, MediaQuery.of(context).size);
                _animateToCorner(targetPosition);
              }
            },
            child: Container(
              width: 140,
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: IgnorePointer(
                      child: () {
                        // Validasi koordinat harbor
                        final harborCoords = trackingData['harborCoordinates'];
                        double harborLat = 0.0;
                        double harborLng = 0.0;
                        
                        if (harborCoords != null) {
                          harborLat = (harborCoords['latitude'] ?? harborCoords['lat'] ?? 0.0).toDouble();
                          harborLng = (harborCoords['longitude'] ?? harborCoords['lng'] ?? 0.0).toDouble();
                          
                          if (harborLat.abs() > 90) {
                            final temp = harborLat;
                            harborLat = harborLng;
                            harborLng = temp;
                          }
                        }
                        
                        // Jika currentPosition null, gunakan harbor sebagai default
                        final position = currentPosition ?? Position(
                          latitude: harborLat,
                          longitude: harborLng,
                          timestamp: DateTime.now(),
                          accuracy: 0,
                          altitude: 0,
                          heading: 0,
                          speed: 0,
                          speedAccuracy: 0,
                          altitudeAccuracy: 0,
                          headingAccuracy: 0,
                        );
                        
                        return ProductionTrackingMap(
                          currentPosition: position,
                          harborLat: harborLat,
                          harborLng: harborLng,
                          harborName: trackingData['selectedHarbor'] ?? '',
                          zoneRadius: (trackingData['zoneRadius'] ?? 50.0).toDouble(),
                          isViolating: provider.isViolating,
                          selectedCatchZoneName: trackingData['selectedHarbor'] ?? '',
                          zoneStatus: provider.zoneStatus,
                          isMinimized: true,
                        );
                      }(),
                    ),
                  ),
                  if (_showControls)
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Stack(
                        children: [
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () {
                                print('❌ [Minimize Widget] Close button tapped');
                                if (provider.navigatorKey?.currentContext != null) {
                                  showDialog(
                                    context: provider.navigatorKey!.currentContext!,
                                    builder: (dialogContext) => AlertDialog(
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      title: Row(
                                        children: [
                                          Container(
                                            padding: EdgeInsets.all(8),
                                            decoration: BoxDecoration(
                                              color: Colors.orange.withOpacity(0.1),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(Icons.exit_to_app, color: Colors.orange),
                                          ),
                                          SizedBox(width: 12),
                                          Expanded(
                                            child: Text('Keluar dari Tracking?', style: TextStyle(fontSize: 18)),
                                          ),
                                        ],
                                      ),
                                      content: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Anda akan keluar dari layar tracking.'),
                                          SizedBox(height: 12),
                                          Container(
                                            padding: EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.blue.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Row(
                                              children: [
                                                Icon(Icons.info_outline, color: Colors.blue, size: 20),
                                                SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    'Tracking tetap berjalan di background. Anda bisa kembali kapan saja.',
                                                    style: TextStyle(fontSize: 12, color: Colors.blue.shade900),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(dialogContext),
                                          child: Text('Batal'),
                                        ),
                                        ElevatedButton(
                                          onPressed: () async {
                                            print('❌ [Minimize] Close confirmed - tracking continues');
                                            Navigator.pop(dialogContext);
                                            
                                            // Set minimize false agar widget hilang
                                            provider.maximize();
                                            
                                            // Navigate ke MainScreen, tracking tetap jalan
                                            if (provider.navigatorKey?.currentContext != null) {
                                              Navigator.of(provider.navigatorKey!.currentContext!).pushAndRemoveUntil(
                                                MaterialPageRoute(builder: (context) => MainScreen()),
                                                (route) => false,
                                              );
                                            }
                                          },
                                          style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                                          child: Text('Keluar'),
                                        ),
                                      ],
                                    ),
                                  );
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                            ),
                          ),
                          Center(
                            child: GestureDetector(
                              onTap: () {
                                print('\n🔵🔵🔵 [Minimize] MAXIMIZE BUTTON TAPPED');
                                setState(() => _showControls = false);
                                
                                // Maximize dulu baru navigate
                                provider.maximize();
                                
                                // Navigate ke ActiveTrackingScreen dengan data dari provider
                                final data = trackingData;
                                // ignore: unnecessary_null_comparison
                                if (data != null && provider.navigatorKey?.currentState != null) {
                                  provider.navigatorKey!.currentState!.pushAndRemoveUntil(
                                    MaterialPageRoute(
                                      builder: (context) => ActiveTrackingScreen(
                                        vesselName: data['vesselName'] ?? '',
                                        vesselNumber: data['vesselNumber'] ?? '',
                                        captainName: data['captainName'] ?? '',
                                        crewCount: data['crewCount'] ?? 0,
                                        selectedHarbor: data['selectedHarbor'] ?? '',
                                        departureTime: data['departureTime'] ?? DateTime.now(),
                                        estimatedReturnDate: data['estimatedReturnDate'],
                                        estimatedDuration: data['estimatedDuration'] ?? 1,
                                        emergencyContact: data['emergencyContact'] ?? '',
                                        fuelAmount: (data['fuelAmount'] ?? 0.0).toDouble(),
                                        iceStorage: (data['iceStorage'] ?? 0.0).toDouble(),
                                        notes: data['notes'],
                                        harborCoordinates: data['harborCoordinates'],
                                        zoneRadius: (data['zoneRadius'] ?? 50.0).toDouble(),
                                        userRole: data['userRole'] ?? 'Nahkoda',
                                        userName: data['userName'] ?? '',
                                      ),
                                    ),
                                    (route) => false,
                                  );
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1B4F9C),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.open_in_full,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
