import 'package:e_logbook/provider/user_provider.dart';
import 'package:e_logbook/provider/notification_provider.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';
import 'package:e_logbook/screens/nahkoda/widgets/nahkoda_floating_menu.dart';
import 'package:e_logbook/screens/nahkoda/widgets/nahkoda_tracking_button.dart';
import 'package:e_logbook/screens/crew/widgets/crew_floating_menu.dart';
import 'package:e_logbook/screens/crew/widgets/crew_tracking_button.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:e_logbook/utils/profile_photo_cache.dart';
import 'package:e_logbook/services/api/auth_service.dart';
import 'package:e_logbook/services/api/trip_service.dart';
import 'package:e_logbook/services/nitification/local_notification_service.dart';
import 'package:e_logbook/widgets/sos_alert_dialog.dart';
import 'package:e_logbook/routes/app_routes.dart';
import 'package:e_logbook/routes/crew_routes.dart';
import 'package:e_logbook/routes/nahkoda_routes.dart';
import 'package:e_logbook/provider/navigation_provider.dart';
import 'package:e_logbook/widgets/tracking_minimized_overlay.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'home_screen.dart';
import 'statistics_screen.dart';
import 'history_screen.dart';
import 'profile_screen.dart';
import 'splash_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final List<Widget> _screens = [
    const HomeScreen(),
    const StatisticsScreen(),
    const HistoryScreen(),
    const ProfileScreen(),
  ];
  
  String _currentAddress = "Mendeteksi lokasi...";
  ImageProvider? _cachedImageProvider;
  bool _isBerlayar = false;
  bool _showTracking = false;
  Timer? _toggleTimer;
  DateTime? _berlayarStartTime;
  Timer? _periodicCheckTimer;
  int _checkRetryCount = 0;
  
  @override
  void initState() {
    super.initState();
    _requestNotificationPermission();
    _getCurrentLocation();
    AuthService.addAccountStatusInterceptor(context);
    AuthService.addTokenInterceptor(context);
    _loadUserData();
    _initCachedPhoto();
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
    _periodicCheckTimer?.cancel();
    _scheduleNextCheck();
  }

  void _scheduleNextCheck() {
    _periodicCheckTimer?.cancel();
    
    final interval = Duration(seconds: 30 + (_checkRetryCount * 10));
    _periodicCheckTimer = Timer(interval, () async {
      if (!mounted) return;
      
      final hasConnection = await _hasInternetConnection();
      if (!hasConnection) {
        _checkRetryCount++;
        _scheduleNextCheck();
        return;
      }
      
      await _checkTripStatus();
      _checkRetryCount = 0;
      _scheduleNextCheck();
    });
  }

  Future<bool> _hasInternetConnection() async {
    try {
      final result = await Connectivity().checkConnectivity();
      return result != ConnectivityResult.none;
    } catch (e) {
      return false;
    }
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
      print('❌ [MainScreen] Error checking trip status: $e');
    }
  }
  
  @override
  void dispose() {
    _toggleTimer?.cancel();
    _periodicCheckTimer?.cancel();
    super.dispose();
  }
  
  Future<void> _requestNotificationPermission() async {
    await LocalNotificationService.requestPermissions();
  }
  
  Future<void> _initCachedPhoto() async {
    final cachedPath = await ProfilePhotoCache.getCachedPhotoPath();
    if (mounted && cachedPath != null) {
      setState(() {
        _cachedImageProvider = FileImage(File(cachedPath));
      });
    }
  }
  
  Future<void> _loadUserData() async {
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    await userProvider.loadUserFromStorage();
    print('DEBUG MainScreen: Loading user data...');
    print('DEBUG MainScreen: Current user = ${userProvider.user}');
    print('DEBUG MainScreen: Profile picture = ${userProvider.user?.profilePicture}');
  }
  
  Future<void> _getCurrentLocation() async {
    if (kIsWeb) {
      if (mounted) {
        setState(() {
          _currentAddress = "Lokasi tidak ditemukan";
        });
      }
      return;
    }
    
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          setState(() {
            _currentAddress = "Lokasi tidak aktif";
          });
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            setState(() {
              _currentAddress = "Izin lokasi ditolak";
            });
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _currentAddress = "Izin lokasi ditolak permanen";
          });
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      
      if (placemarks.isNotEmpty && mounted) {
        final p = placemarks.first;
        setState(() {
          _currentAddress = "${p.subLocality ?? p.locality ?? 'Tidak diketahui'}, ${p.administrativeArea ?? ''}";
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentAddress = "Gagal mendapatkan lokasi";
        });
      }
    }
  }
  @override
  Widget build(BuildContext context) {
    // Gunakan ResponsiveHelper untuk konsistensi
    double fabSize = ResponsiveHelper.width(context, mobile: 70, tablet: 90);
    double navHeight = 70;
    double iconSize = ResponsiveHelper.width(context, mobile: 24, tablet: 28);
    double fontSize = ResponsiveHelper.font(context, mobile: 10, tablet: 12);

    return Consumer3<UserProvider, NavigationProvider, TrackingMinimizeProvider>(
      builder: (context, userProvider, navProvider, trackingProvider, child) {
        final user = userProvider.user;
        final isABK = user?.isABK == true;
        final selectedIndex = navProvider.selectedIndex;
        final isTablet = ResponsiveHelper.isTablet(context);

        if (isTablet) {
          return _buildTabletLayout(userProvider, navProvider, selectedIndex, isABK, trackingProvider);
        }

        return Scaffold(
          resizeToAvoidBottomInset: false,
          backgroundColor: Colors.white,

          body: Stack(
            children: [
              IndexedStack(
                index: selectedIndex,
                children: [
                  Stack(
                    children: [
                      _screens[0],
                      if (!isABK) const NahkodaFloatingMenu(),
                      if (isABK) const CrewFloatingMenu(),
                    ],
                  ),
                  _screens[1],
                  _screens[2],
                  _screens[3],
                ],
              ),
            ],
          ),

          floatingActionButton: isABK
              ? AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: child,
                    );
                  },
                  child: _showTracking 
                      ? const CrewTrackingButton(key: ValueKey('tracking'))
                      : _buildCatchFAB(fabSize),
                )
              : const NahkodaTrackingButton(),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,

          bottomNavigationBar: BottomAppBar(
            shape: const CircularNotchedRectangle(),
            notchMargin: 8,
            elevation: 10,
            height: navHeight,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  Icons.home_rounded,
                  'Beranda',
                  0,
                  iconSize,
                  fontSize,
                  navProvider,
                ),
                _buildNavItem(
                  Icons.bar_chart_rounded,
                  'Statistik',
                  1,
                  iconSize,
                  fontSize,
                  navProvider,
                ),
                const SizedBox(width: 80),
                _buildNavItem(
                  Icons.history_rounded,
                  'Riwayat',
                  2,
                  iconSize,
                  fontSize,
                  navProvider,
                ),
                _buildNavItem(
                  Icons.person_rounded,
                  'Profil',
                  3,
                  iconSize,
                  fontSize,
                  navProvider,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // NAVIGATION ITEM
  Widget _buildNavItem(
    IconData icon,
    String label,
    int index,
    double iconSize,
    double fontSize,
    NavigationProvider navProvider,
  ) {
    final bool isSelected = navProvider.selectedIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => navProvider.setIndex(index),
        child: SizedBox(
          height: 60,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: iconSize,
                color: isSelected ? const Color(0xFF1B4F9C) : Colors.grey[500],
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? const Color(0xFF1B4F9C) : Colors.grey[500],
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Catch FAB untuk Crew
  Widget _buildCatchFAB(double fabSize) {
    return GestureDetector(
      key: const ValueKey('catch'),
      onTap: () => _handleCreateCatch(context),
      child: Container(
        width: 90,
        height: 90,
        child: Lottie.asset(
          'assets/animations/catch.json',
          fit: BoxFit.contain,
          repeat: true,
          animate: true,
        ),
      ),
    );
  }

  Widget _buildTabletLayout(UserProvider userProvider, NavigationProvider navProvider, int selectedIndex, bool isABK, TrackingMinimizeProvider trackingProvider) {
    final screenWidth = MediaQuery.of(context).size.width;
    final sidebarWidth = screenWidth < 800 ? 180.0 : 200.0;
    final headerHeight = screenWidth < 800 ? 80.0 : 90.0;
    final bodyTopOffset = headerHeight - 4;
    
    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: const Color(0xFFF5F5F5),
      body: Stack(
        children: [
          Row(
            children: [
              // Sidebar Navigation
              Container(
                width: sidebarWidth,
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(2, 0),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Header with logo
                    Container(
                      padding: EdgeInsets.only(
                        top: ResponsiveHelper.height(context, mobile: 21, tablet: 25),
                        bottom: ResponsiveHelper.height(context, mobile: 14, tablet: 18),
                        left: 8,
                        right: 8,
                      ),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                      ),
                      child: Column(
                        children: [
                          // Logo oipb
                          Image.asset(
                            'assets/oipb.png',
                            height: ResponsiveHelper.height(context, mobile: 50, tablet: 70),
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) {
                              return const Icon(
                                Icons.school,
                                size: 40,
                                color: Color(0xFF1B4F9C),
                              );
                            },
                          ),
                          const SizedBox(height: 6),
                          
                          // E-LogBook Title
                          Text(
                            'E-LogBook',
                            style: TextStyle(
                              color: const Color(0xFF1B4F9C),
                              fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                          SizedBox(height: ResponsiveHelper.height(context, mobile: 3, tablet: 4)),
                          
                          // Version
                          Text(
                            'v1.0.0',
                            style: TextStyle(
                              color: const Color(0xFF1B4F9C),
                              fontSize: ResponsiveHelper.font(context, mobile: 8, tablet: 9),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    // Navigation Items
                    Expanded(
                      child: Column(
                        children: [
                          _buildSidebarItem(Icons.home_rounded, 'Beranda', 0, selectedIndex, navProvider),
                          _buildSidebarItem(Icons.bar_chart_rounded, 'Statistik', 1, selectedIndex, navProvider),
                          _buildSidebarItem(Icons.history_rounded, 'Riwayat', 2, selectedIndex, navProvider),
                          _buildSidebarItem(Icons.person_rounded, 'Profil', 3, selectedIndex, navProvider),
                          
                          if (isABK) ...[
                            _buildActionItem(Icons.storage, 'Data Raw', () {
                              CrewRoutes.navigateToDataRaw(context);
                            }),
                            _buildActionItem(Icons.calendar_today, 'Jadwal Tugas', () {
                              CrewRoutes.navigateToMySchedules(context);
                            }),
                            _buildActionItem(Icons.support_agent, 'WhatsApp CS', () {
                              CrewRoutes.navigateToCustomerService(context);
                            }),
                          ] else ...[
                            _buildActionItem(Icons.sailing, 'Info Trip', () {
                              NahkodaRoutes.navigateToTripInfo(context);
                            }),
                            _buildActionItem(Icons.calendar_today, 'Jadwal Tugas', () {
                              NahkodaRoutes.navigateToMySchedules(context);
                            }),
                            _buildActionItem(Icons.support_agent, 'WhatsApp CS', () {
                              NahkodaRoutes.navigateToCustomerService(context);
                            }),
                          ],
                          
                          const Spacer(),
                          
                          // Logout Button
                          Padding(
                            padding: const EdgeInsets.only(left: 12, right: 24, bottom: 12),
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(
                                maxWidth: 200 - 12 - 24,
                              ),
                              child: Material(
                                color: Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                clipBehavior: Clip.hardEdge,
                                child: Ink(
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: InkWell(
                                    onTap: () async {
                                      print('🖱️ Logout button clicked');
                                      final shouldLogout = await showDialog<bool>(
                                        context: context,
                                        builder: (context) => AlertDialog(
                                          title: const Text('Konfirmasi Logout'),
                                          content: const Text('Apakah Anda yakin ingin keluar?'),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(context, false),
                                              child: const Text('Batal'),
                                            ),
                                            TextButton(
                                              onPressed: () => Navigator.pop(context, true),
                                              child: const Text('Keluar'),
                                            ),
                                          ],
                                        ),
                                      );

                                      if (shouldLogout == true && context.mounted) {
                                        navProvider.resetToHome();
                                        await AuthService.logout();
                                        if (context.mounted) {
                                          Navigator.pushAndRemoveUntil(
                                            context,
                                            PageRouteBuilder(
                                              pageBuilder: (context, animation, secondaryAnimation) => const SplashScreen(),
                                              transitionDuration: Duration.zero,
                                              reverseTransitionDuration: Duration.zero,
                                            ),
                                            (route) => false,
                                          );
                                        }
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(
                                            Icons.logout,
                                            color: Colors.white,
                                            size: 14,
                                          ),
                                          const SizedBox(width: 8),
                                          const Text(
                                            'Logout',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
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
              
              // Main Content with Header
              Expanded(
                child: Stack(
                  children: [
                    // Header at the back
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: _buildTabletHeader(userProvider, headerHeight),
                    ),
                    if (trackingProvider.isMinimized && trackingProvider.isTrackingActive)
                      TrackingMinimizedOverlay(),
                  ],
                ),
              ),
            ],
          ),
          // Body content overlaying navbar
          Positioned(
            top: bodyTopOffset,
            left: sidebarWidth - 15,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFFF5F5F5),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                ),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(24),
                ),
                child: _screens[selectedIndex],
              ),
            ),
          ),
          // Emergency FAB (untuk semua role)
          Positioned(
            right: ResponsiveHelper.width(context, mobile: 20, tablet: 30),
            bottom: ResponsiveHelper.height(context, mobile: 100, tablet: 120),
            child: _buildEmergencyFAB(),
          ),
          // FAB floating kanan bawah dengan animasi
          if (isABK) Positioned(
            right: ResponsiveHelper.width(context, mobile: 20, tablet: 30),
            bottom: ResponsiveHelper.height(context, mobile: 35, tablet: 50),
            child: _buildAnimatedFAB(
              onTap: () => _handleCreateCatch(context),
              icon: Icons.add,
            ),
          ),
          // FAB untuk Nahkoda
          if (!isABK) Positioned(
            right: ResponsiveHelper.width(context, mobile: 20, tablet: 30),
            bottom: ResponsiveHelper.height(context, mobile: 35, tablet: 50),
            child: _buildAnimatedFAB(
              onTap: () => _handleTripPreparation(context),
              isLottie: true,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildTabletHeader(UserProvider userProvider, double headerHeight) {
    final screenWidth = MediaQuery.of(context).size.width;
    final searchBarWidth = screenWidth < 800 ? 240.0 : 280.0;
    final avatarRadius = screenWidth < 800 ? 16.0 : 18.0;
    
    return Container(
      height: headerHeight,
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      padding: const EdgeInsets.only(left: 0, right: 12, top: 14, bottom: 0),
      child: Row(
        children: [
          // Search Bar - Simple, full rounded, compact, fixed width
          SizedBox(
            width: searchBarWidth,
            child: Container(
              height: ResponsiveHelper.height(context, mobile: 32, tablet: 36),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: const Color(0xFF1B4F9C),
                  width: 1.5,
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Icon(Icons.search, color: const Color(0xFF1B4F9C), size: ResponsiveHelper.width(context, mobile: 16, tablet: 18)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Cari...',
                        hintStyle: TextStyle(
                          color: Colors.grey[400],
                          fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 12),
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      style: TextStyle(fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 12)),
                      onSubmitted: (value) {
                        // Handle search
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 5),
          
          // Geolocation - Compact
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.location_on,
                size: ResponsiveHelper.width(context, mobile: 12, tablet: 14),
                color: Colors.redAccent,
              ),
              const SizedBox(width: 4),
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: screenWidth < 800 ? 80 : 100),
                child: Text(
                  _currentAddress,
                  style: TextStyle(
                    fontSize: ResponsiveHelper.font(context, mobile: 9, tablet: 10),
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          
          const Spacer(),
          
          // Notification Icon
          Consumer<NotificationProvider>(
            builder: (context, notifProvider, child) {
              return IconButton(
                icon: Stack(
                  children: [
                    Icon(
                      Icons.notifications_outlined,
                      size: ResponsiveHelper.width(context, mobile: 20, tablet: 22),
                      color: const Color(0xFF1B4F9C),
                    ),
                    // Badge untuk unread notifications
                    if (notifProvider.unreadCount > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          constraints: BoxConstraints(
                            minWidth: ResponsiveHelper.width(context, mobile: 14, tablet: 16),
                            minHeight: ResponsiveHelper.height(context, mobile: 14, tablet: 16),
                          ),
                          child: Center(
                            child: Text(
                              notifProvider.unreadCount > 99 ? '99+' : '${notifProvider.unreadCount}',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: ResponsiveHelper.font(context, mobile: 7, tablet: 8),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                onPressed: () {
                  Navigator.pushNamed(context, '/notification');
                },
                tooltip: 'Notifikasi',
              );
            },
          ),
          const SizedBox(width: 8),
          
          // User Info - Compact
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Halo, Selamat Datang',
                style: TextStyle(
                  fontSize: ResponsiveHelper.font(context, mobile: 8, tablet: 9),
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 1),
              Text(
                userProvider.user?.name ?? 'User',
                style: TextStyle(
                  fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 12),
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1B4F9C),
                ),
              ),
              const SizedBox(height: 2),
              // Points - Compact
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: ResponsiveHelper.width(context, mobile: 5, tablet: 6),
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(1.5),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.star,
                        size: ResponsiveHelper.width(context, mobile: 7, tablet: 8),
                        color: const Color(0xFF1B4F9C),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Point: 28',
                      style: TextStyle(
                        fontSize: ResponsiveHelper.font(context, mobile: 8, tablet: 9),
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          
          // Avatar - Compact with click functionality
          GestureDetector(
            onTap: () {
              // Navigate to profile screen
              final navProvider = Provider.of<NavigationProvider>(context, listen: false);
              navProvider.setIndex(3); // Profile screen index
            },
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF1B4F9C), width: 1.5),
              ),
              child: Consumer<UserProvider>(
                builder: (context, userProvider, child) {
                  final profilePicture = userProvider.user?.profilePicture;
                  ImageProvider? imageProvider;
                  
                  if (profilePicture != null && profilePicture.isNotEmpty) {
                    imageProvider = NetworkImage(profilePicture);
                  } else if (_cachedImageProvider != null) {
                    imageProvider = _cachedImageProvider;
                  }
                  
                  return CircleAvatar(
                    radius: avatarRadius,
                    backgroundColor: Colors.grey[200],
                    backgroundImage: imageProvider,
                    child: imageProvider == null
                        ? Icon(
                            Icons.person_rounded,
                            color: const Color(0xFF1B4F9C),
                            size: avatarRadius * 1.2,
                          )
                        : null,
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildSidebarItem(IconData icon, String label, int index, int selectedIndex, NavigationProvider navProvider) {
    final isSelected = selectedIndex == index;
    final screenWidth = MediaQuery.of(context).size.width;
    final rightMargin = screenWidth < 800 ? 20.0 : 24.0;
    final iconSize = screenWidth < 800 ? 13.0 : 14.0;
    final fontSize = screenWidth < 800 ? 10.0 : 11.0;
    
    return Padding(
      padding: EdgeInsets.only(
        left: 12,
        right: rightMargin,
        top: 3,
        bottom: 3,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 200 - 12 - rightMargin,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          clipBehavior: Clip.hardEdge,
          child: Ink(
            decoration: BoxDecoration(
              gradient: isSelected
                  ? const LinearGradient(
                      colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              borderRadius: BorderRadius.circular(8),
            ),
            child: InkWell(
              onTap: () => navProvider.setIndex(index),
              splashColor: const Color(0xFF1B4F9C).withOpacity(0.1),
              highlightColor: const Color(0xFF1B4F9C).withOpacity(0.05),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                child: Row(
                  children: [
                    Icon(
                      icon,
                      color: isSelected ? Colors.white : const Color(0xFF1B4F9C),
                      size: iconSize,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: TextStyle(
                        color: isSelected ? Colors.white : const Color(0xFF1B4F9C),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        fontSize: fontSize,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  
  Widget _buildActionItem(IconData icon, String label, VoidCallback onTap, {bool isEmergency = false}) {
    final screenWidth = MediaQuery.of(context).size.width;
    final rightMargin = screenWidth < 800 ? 20.0 : 24.0;
    final iconSize = screenWidth < 800 ? 13.0 : 14.0;
    final fontSize = screenWidth < 800 ? 10.0 : 11.0;
    return Padding(
      padding: EdgeInsets.only(
        left: 12,
        right: rightMargin,
        top: 3,
        bottom: 3,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 200 - 12 - rightMargin,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          clipBehavior: Clip.hardEdge,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
            ),
            child: InkWell(
              onTap: onTap,
              splashColor: isEmergency ? Colors.red.withOpacity(0.2) : const Color(0xFF1B4F9C).withOpacity(0.1),
              highlightColor: isEmergency ? Colors.red.withOpacity(0.1) : const Color(0xFF1B4F9C).withOpacity(0.05),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                child: Row(
                  children: [
                    Icon(
                      icon,
                      color: isEmergency ? Colors.red : const Color(0xFF1B4F9C),
                      size: iconSize,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: TextStyle(
                        color: isEmergency ? Colors.red : const Color(0xFF1B4F9C),
                        fontSize: fontSize,
                        fontWeight: isEmergency ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAnimatedFAB({
    required VoidCallback onTap,
    IconData? icon,
    bool isLottie = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: ResponsiveHelper.width(context, mobile: 60, tablet: 70),
        height: ResponsiveHelper.height(context, mobile: 60, tablet: 70),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1B4F9C).withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: isLottie
            ? Lottie.asset(
                'assets/animations/PreTrip.json',
                fit: BoxFit.contain,
                repeat: true,
                animate: true,
              )
            : Icon(
                icon ?? Icons.add,
                color: Colors.white,
                size: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
              ),
      ),
    );
  }
  
  Widget _buildEmergencyFAB() {
    return GestureDetector(
      onTap: () async {
        final success = await showSosAlertDialog(context);
        if (success == true && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 12),
                  Expanded(child: Text('🚨 Sinyal Darurat Terkirim!')),
                ],
              ),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 3),
            ),
          );
        }
      },
      child: Container(
        width: ResponsiveHelper.width(context, mobile: 56, tablet: 64),
        height: ResponsiveHelper.height(context, mobile: 56, tablet: 64),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Colors.red, Colors.redAccent],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          Icons.warning_rounded,
          color: Colors.white,
          size: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
        ),
      ),
    );
  }
  void _handleTripPreparation(BuildContext context) async {
    // Selalu redirect ke MySchedules untuk handle trip dengan benar
    NahkodaRoutes.navigateToMySchedules(context);
  }

  void _handleCreateCatch(BuildContext context) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userDataString = prefs.getString('user_data');
      int? currentUserId;
      
      if (userDataString != null) {
        final userData = json.decode(userDataString);
        currentUserId = userData['id'];
      }
      
      if (currentUserId == null) return;
      
      debugPrint('\n🔍 [CREATE_CATCH] Searching trips for user: $currentUserId');
      
      final response = await TripService.getAllTrips();
      if (response['success'] == true && response['data'] != null) {
        final allTrips = List<Map<String, dynamic>>.from(response['data']);
        
        debugPrint('📋 [CREATE_CATCH] Total trips: ${allTrips.length}');
        
        // Filter trip milik user - TERMASUK DARURAT!
        final myTrips = allTrips.where((trip) {
          final nahkodaId = trip['nahkodaId'];
          final awakKapal = trip['awakKapal'] as List?;
          final status = trip['status']?.toLowerCase();
          
          final isMyTrip = (nahkodaId == currentUserId) ||
                           (awakKapal != null && awakKapal.contains(currentUserId));
          
          debugPrint('   Trip ${trip['id']}: status=$status, isMyTrip=$isMyTrip');
          
          // Izinkan: sedang_melaut, berlayar, darurat, emergency, selesai
          return isMyTrip && (status == 'sedang_melaut' || status == 'berlayar' || status == 'darurat' || status == 'emergency' || status == 'selesai');
        }).toList();
        
        debugPrint('✅ [CREATE_CATCH] Found ${myTrips.length} eligible trips');
        
        if (myTrips.isEmpty) {
          if (mounted) {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                title: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.sailing, color: Colors.orange.shade700, size: 24),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Trip Belum Dimulai',
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
                      'Anda belum bisa mencatat tangkapan karena:',
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                    SizedBox(height: 12),
                    _buildInfoRow(Icons.close, 'Belum ada trip aktif', Colors.red),
                    SizedBox(height: 8),
                    _buildInfoRow(Icons.info_outline, 'Status trip harus "Sedang Melaut", "Berlayar", "Darurat", atau "Selesai"', Colors.orange),
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
                          Icon(Icons.lightbulb_outline, color: Colors.blue.shade700, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Mulai trip terlebih dahulu untuk mencatat hasil tangkapan',
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
                    onPressed: () => Navigator.pop(context),
                    child: Text('Mengerti', style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            );
          }
          return;
        }
        
        // Prioritas: 1. Sedang Melaut, 2. Berlayar, 3. Darurat, 4. Selesai, 5. Terbaru
        myTrips.sort((a, b) {
          final statusA = a['status']?.toLowerCase() ?? '';
          final statusB = b['status']?.toLowerCase() ?? '';
          
          // Prioritas tertinggi: sedang_melaut
          if (statusA == 'sedang_melaut') return -1;
          if (statusB == 'sedang_melaut') return 1;
          
          if (statusA == 'berlayar') return -1;
          if (statusB == 'berlayar') return 1;
          if (statusA == 'darurat' || statusA == 'emergency') return -1;
          if (statusB == 'darurat' || statusB == 'emergency') return 1;
          if (statusA == 'selesai') return -1;
          if (statusB == 'selesai') return 1;
          
          return (b['id'] ?? 0).compareTo(a['id'] ?? 0);
        });
        
        final selectedTrip = myTrips.first;
        final tripId = selectedTrip['id'];
        final tripStatus = selectedTrip['status'];
        final kapalData = selectedTrip['kapal'];
        final kapalNama = kapalData != null ? (kapalData['namaKapal'] ?? kapalData['nama'] ?? 'Unknown') : 'Unknown';
        
        debugPrint('🎯 [CREATE_CATCH] Selected trip:');
        debugPrint('   Trip ID: $tripId');
        debugPrint('   Status: $tripStatus');
        debugPrint('   Kapal: $kapalNama');
        
        if (mounted) {
          // Gunakan named route dengan tripId
          Navigator.pushNamed(
            context,
            AppRoutes.createCatch,
            arguments: {'tripId': tripId},
          );
        }
      }
    } catch (e) {
      print('❌ Error handling create catch: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memeriksa status trip'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildInfoRow(IconData icon, String text, Color color) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 13, color: Colors.grey[800]),
          ),
        ),
      ],
    );
  }
}