import 'dart:async';
import 'dart:io';
import 'package:e_logbook/provider/notification_provider.dart';
import 'package:e_logbook/services/cuaca/weather_service.dart';
import 'package:e_logbook/screens/notification_screen.dart';
import 'package:e_logbook/provider/user_provider.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:intl/intl.dart';
import 'package:lottie/lottie.dart';
import 'package:provider/provider.dart';

class CustomSliverAppBar extends StatefulWidget {
  const CustomSliverAppBar({super.key});

  @override
  State<CustomSliverAppBar> createState() => _CustomSliverAppBarState();
}

class _CustomSliverAppBarState extends State<CustomSliverAppBar>
    with TickerProviderStateMixin {
  String _currentAddress = "Mendeteksi lokasi...";
  Position? _currentPosition;

  // Weather data
  WeatherData? _weatherData;
  bool _isLoadingWeather = true;
  Timer? _weatherTimer;
  Timer? _dialogUpdateTimer;
  DateTime? _lastWeatherUpdate;
  bool _isDialogOpen = false;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _startWeatherUpdates();
  }
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
  }

  @override
  void dispose() {
    _weatherTimer?.cancel();
    _dialogUpdateTimer?.cancel();
    super.dispose();
  }

  void safeSetState(VoidCallback fn) {
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(fn);
      }
    });
  }

  void _startWeatherUpdates() {
    // Update weather setiap 5 menit (lebih cepat untuk real-time)
    _weatherTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      if (_currentPosition != null) {
        _fetchWeatherData();
      }
    });
  }

  void _startDialogAutoUpdate() {
    // Auto-refresh di dalam dialog setiap 30 detik
    _dialogUpdateTimer?.cancel();
    _dialogUpdateTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isDialogOpen && _currentPosition != null) {
        _fetchWeatherData(silent: true); // Silent update tanpa loading
      }
    });
  }

  void _stopDialogAutoUpdate() {
    _dialogUpdateTimer?.cancel();
    _isDialogOpen = false;
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      safeSetState(() {
        _currentAddress = "Lokasi tidak aktif";
      });
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        safeSetState(() {
          _currentAddress = "Izin lokasi ditolak";
        });
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      safeSetState(() {
        _currentAddress = "Izin lokasi ditolak permanen";
      });
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      safeSetState(() {
        _currentPosition = pos;
      });
      await _getAddressFromLatLng(pos);
      await _fetchWeatherData();
    } catch (e) {
      safeSetState(() {
        _currentAddress = "Gagal mendapatkan lokasi";
      });
    }
  }

  Future<void> _getAddressFromLatLng(Position position) async {
    try {
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        safeSetState(() {
          _currentAddress =
              "${p.subLocality ?? p.locality ?? 'Tidak diketahui'}, ${p.administrativeArea ?? ''}";
        });
      } else {
        safeSetState(() {
          _currentAddress = "Alamat tidak ditemukan";
        });
      }
    } catch (e) {
      safeSetState(() {
        _currentAddress = "Gagal mendapatkan alamat";
      });
    }
  }

  Future<void> _fetchWeatherData({bool silent = false}) async {
    if (_currentPosition == null) return;

    if (!silent) {
      safeSetState(() {
        _isLoadingWeather = true;
      });
    }

    try {
      final weather = await WeatherService.getWeatherByPosition(
        _currentPosition!,
      );

      if (mounted) {
        safeSetState(() {
          _weatherData = weather;
          _isLoadingWeather = false;
          _lastWeatherUpdate = DateTime.now();
        });
      }
    } catch (e) {
      if (mounted) {
        safeSetState(() {
          _isLoadingWeather = false;
        });
      }
    }
  }

  // Fungsi untuk mendapatkan animasi Lottie berdasarkan cuaca dan waktu
  String _getWeatherAnimation() {
    if (_weatherData == null)
      return 'assets/animations/cloudy.json'; // Default: Berawan siang

    final condition = _weatherData!.condition.toLowerCase();
    final hour = DateTime.now().hour;
    final isNight = hour >= 18 || hour < 6; // Malam: 18:00 - 05:59

    // Cerah / Sunny
    if (condition.contains('cerah') ||
        condition.contains('clear') ||
        condition.contains('sunny')) {
      if (isNight) {
        return 'assets/animations/night_sky.json'; // Langit malam cerah
      } else {
        return 'assets/animations/sunnynew.json'; // Cerah siang
      }
    }
    // Hujan
    else if (condition.contains('hujan') || condition.contains('rain')) {
      if (isNight) {
        return 'assets/animations/rainynight.json'; // Hujan malam
      } else {
        return 'assets/animations/rain.json'; // Hujan siang
      }
    }
    // Berawan / Cloudy
    else if (condition.contains('berawan') || condition.contains('cloud')) {
      if (isNight) {
        return 'assets/animations/cloudynight.json'; // Berawan malam
      } else {
        return 'assets/animations/cloudy.json'; // Berawan siang
      }
    }
    // Petir / Thunderstorm
    else if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm')) {
      if (isNight) {
        return 'assets/animations/nightthunderstorm.json'; // Petir malam
      } else {
        return 'assets/animations/thunderstorm.json'; // Petir siang
      }
    }
    // Kabut / Fog
    else if (condition.contains('kabut') ||
        condition.contains('fog') ||
        condition.contains('mist')) {
      if (isNight) {
        return 'assets/animations/nightfog.json'; // Kabut malam
      } else {
        return 'assets/animations/mist.json'; // Kabut siang
      }
    }

    // Default berdasarkan waktu
    if (isNight) {
      return 'assets/animations/cloudynight.json'; // Default malam: Berawan malam
    } else {
      return 'assets/animations/cloudy.json'; // Default siang: Berawan siang
    }
  }

  Color _getWeatherColor() {
    if (_weatherData == null) return Colors.white;

    final condition = _weatherData!.condition.toLowerCase();

    if (condition.contains('cerah') ||
        condition.contains('clear') ||
        condition.contains('sunny')) {
      return Colors.amber;
    } else if (condition.contains('hujan') || condition.contains('rain')) {
      return Colors.lightBlue;
    } else if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm')) {
      return Colors.red;
    }

    return Colors.white;
  }

  String _getFormattedUpdateTime() {
    if (_lastWeatherUpdate == null) return 'Belum tersedia';
    return DateFormat('HH:mm').format(_lastWeatherUpdate!);
  }

  // ========================= MODERN WEATHER DIALOG =========================

  void _showWeatherDialog() {
    if (_weatherData == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.white),
              SizedBox(width: 12),
              Text('Data cuaca belum tersedia'),
            ],
          ),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    _isDialogOpen = true;
    _startDialogAutoUpdate(); // Mulai auto-update saat dialog dibuka

    final isWeatherSafe = WeatherService.isWeatherSafe(_weatherData!);

    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.6),
      builder: (context) => PopScope(
        canPop: true,
        onPopInvokedWithResult: (didPop, result) {
          _stopDialogAutoUpdate();
        },
        child: Dialog(
          backgroundColor: Colors.transparent,
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              // Listen to state changes for real-time update in dialog
              return Container(
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF1B4F9C),
                      const Color(0xFF2563EB).withOpacity(0.9),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.4),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header dengan gradient
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(24),
                          topRight: Radius.circular(24),
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Kondisi Cuaca',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Row(
                                children: [
                                  // Live indicator
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.red,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(
                                          Icons.circle,
                                          color: Colors.white,
                                          size: 8,
                                        ),
                                        SizedBox(width: 4),
                                        Text(
                                          'LIVE',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    onPressed: () {
                                      _stopDialogAutoUpdate();
                                      Navigator.pop(context);
                                    },
                                    icon: const Icon(
                                      Icons.close,
                                      color: Colors.white,
                                    ),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(
                                    Icons.location_on,
                                    size: 16,
                                    color: Colors.white70,
                                  ),
                                  const SizedBox(width: 4),
                                  SizedBox(
                                    width: 200,
                                    child: Text(
                                      _currentAddress,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Colors.white70,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              // Auto-update indicator
                              Row(
                                children: [
                                  Icon(
                                    Icons.autorenew,
                                    size: 12,
                                    color: Colors.greenAccent.withOpacity(0.8),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '30s',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.greenAccent.withOpacity(
                                        0.8,
                                      ),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Content
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // Animasi Lottie cuaca besar
                          Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withOpacity(0.1),
                              boxShadow: [
                                BoxShadow(
                                  color: _getWeatherColor().withOpacity(0.2),
                                  blurRadius: 20,
                                  spreadRadius: 5,
                                ),
                              ],
                            ),
                            child: Lottie.asset(
                              _getWeatherAnimation(),
                              fit: BoxFit.contain,
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Kondisi cuaca utama
                          Text(
                            _weatherData!.condition,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),

                          const SizedBox(height: 8),

                          // Suhu besar
                          Text(
                            '${_weatherData!.temperature.toStringAsFixed(1)}°C',
                            style: const TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.w300,
                              color: Colors.white,
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Grid info cuaca dengan card transparan
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    _buildWeatherInfoCard(
                                      Icons.air_rounded,
                                      'Angin',
                                      '${_weatherData!.windSpeed.toStringAsFixed(1)} km/h',
                                    ),
                                    const SizedBox(width: 12),
                                    _buildWeatherInfoCard(
                                      Icons.water_drop_outlined,
                                      'Kelembaban',
                                      '${_weatherData!.humidity}%',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    _buildWeatherInfoCard(
                                      Icons.waves_rounded,
                                      'Tinggi Ombak',
                                      '${_weatherData!.waveHeight.toStringAsFixed(1)} m',
                                    ),
                                    const SizedBox(width: 12),
                                    _buildWeatherInfoCard(
                                      Icons.update,
                                      'Update',
                                      _getFormattedUpdateTime(),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Status keamanan compact
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: isWeatherSafe
                                  ? Colors.green.withOpacity(0.2)
                                  : Colors.red.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isWeatherSafe
                                    ? Colors.greenAccent.withOpacity(0.5)
                                    : Colors.redAccent.withOpacity(0.5),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  isWeatherSafe
                                      ? Icons.check_circle
                                      : Icons.warning_amber,
                                  color: isWeatherSafe
                                      ? Colors.greenAccent
                                      : Colors.redAccent,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isWeatherSafe ? 'Aman Melaut' : 'Tidak Aman',
                                  style: TextStyle(
                                    color: isWeatherSafe
                                        ? Colors.greenAccent
                                        : Colors.redAccent,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
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
            },
          ),
        ),
      ),
    ).then((_) {
      _stopDialogAutoUpdate(); // Stop auto-update saat dialog ditutup
    });
  }

  Widget _buildWeatherInfoCard(IconData icon, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final orientation = MediaQuery.of(context).orientation;
    final isLandscape = orientation == Orientation.landscape;
    
    // Responsive constants based on orientation and screen size
    final double screenWidth = size.width;
    final double expandedHeight = isLandscape ? 120.0 : (screenWidth < 360 ? 210.0 : 230.0);
    const double toolbarHeight = 0.0;
    final double horizontalPadding = screenWidth < 360 ? 16.0 : 20.0;
    final double topPadding = isLandscape ? 10.0 : (screenWidth < 360 ? 30.0 : 35.0);
    final double avatarRadius = screenWidth < 360 ? 24.0 : 28.0;
    final double titleFontSize = screenWidth < 360 ? 20.0 : 22.0;
    final double userNameFontSize = screenWidth < 360 ? 16.0 : 18.0;
    final double searchBarHeight = screenWidth < 360 ? 36.0 : 38.0;
    final double weatherButtonSize = screenWidth < 360 ? 50.0 : 56.0;
    final double bottomPreferredSize = isLandscape ? 56.0 : (screenWidth < 360 ? 68.0 : 74.0);
    final double bottomPadding = isLandscape ? 8.0 : (screenWidth < 360 ? 14.0 : 18.0);

    return SliverAppBar(
      pinned: true,
      expandedHeight: expandedHeight,
      toolbarHeight: toolbarHeight,
      backgroundColor: Colors.transparent,
      elevation: 0,
      forceElevated: false,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
          child: FlexibleSpaceBar(
          titlePadding: EdgeInsets.zero,
          expandedTitleScale: 1.0,
          background: Padding(
            padding: EdgeInsets.fromLTRB(
              horizontalPadding,
              topPadding,
              horizontalPadding,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header (App Name & Location)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "E-Logbook",
                      style: TextStyle(
                        fontSize: titleFontSize,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.location_on,
                              size: 16,
                              color: Colors.redAccent,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                _currentAddress,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // User Profile Section
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF1B4F9C), width: 2),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Consumer<UserProvider>(
                        builder: (context, userProvider, child) {
                          final user = userProvider.user;
                          final photoUrl = user?.profilePicture;
                          final hasValidPhoto = photoUrl != null && photoUrl.isNotEmpty;
                          
                          print('🔍 [UI] Building CircleAvatar with photo: $photoUrl');
                          
                          ImageProvider? imageProvider;
                          if (hasValidPhoto) {
                            if (photoUrl.startsWith('file://') || photoUrl.startsWith('/')) {
                              imageProvider = FileImage(File(photoUrl.replaceFirst('file://', '')));
                            } else if (photoUrl.startsWith('http')) {
                              imageProvider = NetworkImage(photoUrl);
                            }
                          }
                          
                          return CircleAvatar(
                            key: ValueKey(photoUrl ?? 'default'),
                            radius: avatarRadius,
                            backgroundColor: Colors.grey[200],
                            backgroundImage: imageProvider,
                            child: !hasValidPhoto
                                ? Icon(
                                    Icons.person,
                                    size: 32,
                                    color: const Color(0xFF1B4F9C),
                                  )
                                : null,
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Halo, Selamat Datang",
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.8),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Consumer<UserProvider>(
                          builder: (context, userProvider, child) {
                            final user = userProvider.user;
                            return Text(
                              user?.name ?? 'Nelayan IPB',
                              style: TextStyle(
                                fontSize: userNameFontSize,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.star,
                                  size: 10,
                                  color: Color(0xFF1B4F9C),
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                "Total Point: 28",
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    // Notification Bell
                    Consumer2<UserProvider, NotificationProvider>(
                      builder: (context, userProvider, notifProvider, child) {
                        return Stack(
                          children: [
                            Container(
                              height: 48,
                              width: 48,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withOpacity(0.2),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.3),
                                ),
                              ),
                              child: IconButton(
                                onPressed: () {
                                  NavigationHelper.pushNoTransition(
                                    context,
                                    NotificationScreen(),
                                  );
                                },
                                icon: const Icon(
                                  Icons.notifications_outlined,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                            // Badge
                            if (notifProvider.unreadCount > 0)
                              Positioned(
                                right: 0,
                                top: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Center(
                                    child: Text(
                                      notifProvider.unreadCount > 99 ? '99+' : '${notifProvider.unreadCount}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      bottom: PreferredSize(
        preferredSize: Size.fromHeight(bottomPreferredSize),
        child: Transform.translate(
          offset: const Offset(0, 10), // Geser ke bawah 10px agar content bisa overlap
          child: Container(
            padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, bottomPadding),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: searchBarHeight,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: TextField(
                      textAlignVertical: TextAlignVertical.center,
                      decoration: InputDecoration(
                        hintText: "Cari tangkapan...",
                        hintStyle: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 14,
                        ),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey, size: 20),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 9),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Weather Button
                SizedBox(
                  width: weatherButtonSize,
                  height: weatherButtonSize,
                  child: InkWell(
                    onTap: _showWeatherDialog,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      clipBehavior: Clip.hardEdge,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: _isLoadingWeather
                          ? const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : Lottie.asset(
                              _getWeatherAnimation(),
                              fit: BoxFit.contain,
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
