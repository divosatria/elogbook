import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:e_logbook/services/cuaca/weather_service.dart';
import 'package:intl/intl.dart';
import 'dart:async';

class WeatherDetailDialog extends StatefulWidget {
  final WeatherData weatherData;
  final String locationAddress;
  final DateTime lastUpdate;
  final Function() onRefresh;

  const WeatherDetailDialog({
    super.key,
    required this.weatherData,
    required this.locationAddress,
    required this.lastUpdate,
    required this.onRefresh,
  });

  @override
  State<WeatherDetailDialog> createState() => _WeatherDetailDialogState();
}

class _WeatherDetailDialogState extends State<WeatherDetailDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startAutoRefresh();
  }

  void _setupAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _scaleAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    );

    _animationController.forward();
  }

  void _startAutoRefresh() {
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        widget.onRefresh();
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  String _getWeatherAnimation() {
    final condition = widget.weatherData.condition.toLowerCase();
    final hour = DateTime.now().hour;
    final isNight = hour >= 18 || hour < 6;

    if (condition.contains('cerah') ||
        condition.contains('clear') ||
        condition.contains('sunny')) {
      return isNight
          ? 'assets/animations/night_sky.json'
          : 'assets/animations/sunnynew.json';
    } else if (condition.contains('hujan') || condition.contains('rain')) {
      return isNight
          ? 'assets/animations/rainynight.json'
          : 'assets/animations/rain.json';
    } else if (condition.contains('berawan') || condition.contains('cloud')) {
      return isNight
          ? 'assets/animations/cloudynight.json'
          : 'assets/animations/cloudy.json';
    } else if (condition.contains('petir') ||
        condition.contains('thunder') ||
        condition.contains('storm')) {
      return isNight
          ? 'assets/animations/nightthunderstorm.json'
          : 'assets/animations/thunderstorm.json';
    } else if (condition.contains('kabut') ||
        condition.contains('fog') ||
        condition.contains('mist')) {
      return isNight
          ? 'assets/animations/nightfog.json'
          : 'assets/animations/mist.json';
    }

    return isNight
        ? 'assets/animations/cloudynight.json'
        : 'assets/animations/cloudy.json';
  }

  Color _getWeatherColor() {
    final condition = widget.weatherData.condition.toLowerCase();

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

    return Colors.blue;
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
              style: const TextStyle(
                fontSize: 11,
                color: Colors.white70,
              ),
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
    final isWeatherSafe = WeatherService.isWeatherSafe(widget.weatherData);

    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
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
            child: SingleChildScrollView(
              child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
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
                            'Kondisi Cuaca Real-Time',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          Row(
                            children: [
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
                                onPressed: () => Navigator.pop(context),
                                icon: const Icon(Icons.close, color: Colors.white),
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
                                width: 180,
                                child: Text(
                                  widget.locationAddress,
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
                                  color: Colors.greenAccent.withOpacity(0.8),
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
                      // Weather Animation
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

                      Text(
                        widget.weatherData.condition,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 8),

                      Text(
                        '${widget.weatherData.temperature.toStringAsFixed(1)}°C',
                        style: const TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.w300,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Weather Info Grid
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
                                  '${widget.weatherData.windSpeed.toStringAsFixed(1)} km/h',
                                ),
                                const SizedBox(width: 12),
                                _buildWeatherInfoCard(
                                  Icons.water_drop_outlined,
                                  'Kelembaban',
                                  '${widget.weatherData.humidity}%',
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                _buildWeatherInfoCard(
                                  Icons.waves_rounded,
                                  'Tinggi Ombak',
                                  '${widget.weatherData.waveHeight.toStringAsFixed(1)} m',
                                ),
                                const SizedBox(width: 12),
                                _buildWeatherInfoCard(
                                  Icons.update,
                                  'Update',
                                  DateFormat('HH:mm').format(widget.lastUpdate),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Safety Status
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
                              isWeatherSafe ? 'Aman Melaut' : 'Tidak Aman Melaut',
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
            ),
          ),
        ),
      ),
    );
  }
}