import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:e_logbook/widgets/sos_alert_dialog.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';
import '../../../screens/nahkoda/widgets/menu_toggle_button.dart';
import '../../../services/api/trip_service.dart';
import 'crew_menu_items.dart';

class CrewFloatingMenu extends StatefulWidget {
  const CrewFloatingMenu({super.key});

  @override
  State<CrewFloatingMenu> createState() => _CrewFloatingMenuState();
}

class _CrewFloatingMenuState extends State<CrewFloatingMenu>
    with TickerProviderStateMixin {
  bool _isMenuOpen = false;
  bool _isBerlayar = false;
  bool _showTracking = true;
  Timer? _toggleTimer;
  DateTime? _berlayarStartTime;
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _checkTripStatus();
    _startPeriodicCheck();
    _startFabToggle();
  }
  
  void _startFabToggle() {
    _toggleTimer?.cancel();
    _toggleTimer = Timer.periodic(Duration(seconds: 3), (timer) {
      if (mounted) {
        if (_isBerlayar && _berlayarStartTime != null) {
          final elapsed = DateTime.now().difference(_berlayarStartTime!);
          if (elapsed.inSeconds >= 10) {
            setState(() {
              _showTracking = !_showTracking;
            });
          }
        } else if (!_isBerlayar) {
          setState(() {
            _showTracking = !_showTracking;
          });
        }
      }
    });
  }
  
  void _startPeriodicCheck() {
    Timer.periodic(Duration(seconds: 30), (timer) {
      if (mounted) {
        _checkTripStatus();
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _checkTripStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      int? currentUserId;
      
      if (userDataString != null) {
        final userData = json.decode(userDataString);
        currentUserId = userData['id'];
      }
      
      if (currentUserId == null) return;
      
      final response = await TripService.getAllTrips();
      if (response['success'] == true && response['data'] != null) {
        final allTrips = List<Map<String, dynamic>>.from(response['data']);
        
        final hasBerlayar = allTrips.any((trip) {
          final nahkodaId = trip['nahkodaId'];
          final awakKapal = trip['awakKapal'] as List?;
          final status = trip['status']?.toLowerCase();
          
          final isMyTrip = (nahkodaId == currentUserId) ||
                           (awakKapal != null && awakKapal.contains(currentUserId));
          
          return isMyTrip && status == 'berlayar';
        });
        
        if (mounted) {
          final wasBerlayar = _isBerlayar;
          setState(() {
            _isBerlayar = hasBerlayar;
            if (hasBerlayar && !wasBerlayar) {
              _berlayarStartTime = DateTime.now();
              _showTracking = true;
            }
          });
        }
      }
    } catch (e) {
      print('❌ [CrewMenu] Error checking trip status: $e');
    }
  }

  @override
  void dispose() {
    _toggleTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _toggleMenu() {
    setState(() {
      _isMenuOpen = !_isMenuOpen;
    });
    if (_isMenuOpen) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  Future<void> _handleSosAlert(BuildContext context) async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.location_off, color: Colors.white),
                SizedBox(width: 12),
                Expanded(child: Text('GPS tidak aktif. Aktifkan GPS terlebih dahulu.')),
              ],
            ),
            backgroundColor: Colors.orange,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            action: SnackBarAction(
              label: 'Pengaturan',
              textColor: Colors.white,
              onPressed: () {
                Geolocator.openLocationSettings();
              },
            ),
          ),
        );
      }
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.error, color: Colors.white),
                  SizedBox(width: 12),
                  Expanded(child: Text('Izin lokasi ditolak')),
                ],
              ),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text('Izin lokasi ditolak permanen. Aktifkan di pengaturan.'),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            action: SnackBarAction(
              label: 'Pengaturan',
              textColor: Colors.white,
              onPressed: () {
                Geolocator.openAppSettings();
              },
            ),
          ),
        );
      }
      return;
    }

    if (!mounted) return;
    final success = await showSosAlertDialog(context);

    if (success == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '🚨 Sinyal Darurat Terkirim!',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Admin akan segera merespons',
                      style: TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Emergency Alert
        if (!_isMenuOpen)
          Positioned(
            right: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
            bottom: ResponsiveHelper.height(context, mobile: 153, tablet: 183),
            child: GestureDetector(
              onTap: () async {
                await _handleSosAlert(context);
              },
              child: Container(
                width: ResponsiveHelper.width(context, mobile: 56, tablet: 70),
                height: ResponsiveHelper.height(context, mobile: 56, tablet: 70),
                decoration: BoxDecoration(
                  color: Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.red, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 0),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(2),
                  child: Lottie.asset(
                    'assets/animations/alert.json',
                    fit: BoxFit.contain,
                    repeat: true,
                    animate: true,
                  ),
                ),
              ),
            ),
          ),
        // Menu Toggle Button
        Positioned(
          right: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
          bottom: ResponsiveHelper.height(context, mobile: 80, tablet: 96),
          child: MenuToggleButton(
            isMenuOpen: _isMenuOpen,
            onToggle: _toggleMenu,
          ),
        ),
        // Menu Items
        if (_isMenuOpen)
          CrewMenuItems(
            animation: _animation,
            onMenuToggle: _toggleMenu,
          ),
      ],
    );
  }


}
