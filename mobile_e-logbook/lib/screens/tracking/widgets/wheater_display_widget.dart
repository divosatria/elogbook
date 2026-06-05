import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:e_logbook/services/cuaca/weather_service.dart';
import 'package:intl/intl.dart';

class WeatherDisplayWidget extends StatelessWidget {
  final WeatherData? weatherData;
  final bool isLoading;
  final VoidCallback onTap;
  final DateTime? lastUpdate;

  const WeatherDisplayWidget({
    super.key,
    required this.weatherData,
    required this.isLoading,
    required this.onTap,
    this.lastUpdate,
  });

  String _getWeatherAnimation() {
    if (weatherData == null) return 'assets/animations/cloudy.json';

    final condition = weatherData!.condition.toLowerCase();
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

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: isLoading
            ? const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : Row(
                children: [
                  // Weather Animation
                  SizedBox(
                    width: 60,
                    height: 60,
                    child: Stack(
                      children: [
                        Lottie.asset(
                          _getWeatherAnimation(),
                          fit: BoxFit.contain,
                        ),
                        if (lastUpdate != null)
                          Positioned(
                            right: 0,
                            top: 0,
                            child: Container(
                              padding: const EdgeInsets.all(3),
                              decoration: BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 1.5),
                              ),
                              child: const Icon(
                                Icons.circle,
                                size: 4,
                                color: Colors.white,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Weather Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          weatherData?.condition ?? 'Memuat...',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.thermostat,
                              size: 16,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${weatherData?.temperature.toStringAsFixed(1) ?? '--'}°C',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Icon(
                              Icons.air,
                              size: 16,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${weatherData?.windSpeed.toStringAsFixed(1) ?? '--'} km/h',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.update,
                              size: 12,
                              color: Colors.grey[500],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              lastUpdate != null
                                  ? DateFormat('HH:mm').format(lastUpdate!)
                                  : '--:--',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Safety Indicator
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: weatherData != null &&
                              WeatherService.isWeatherSafe(weatherData!)
                          ? Colors.green.withOpacity(0.1)
                          : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      weatherData != null &&
                              WeatherService.isWeatherSafe(weatherData!)
                          ? Icons.check_circle
                          : Icons.warning_amber,
                      color: weatherData != null &&
                              WeatherService.isWeatherSafe(weatherData!)
                          ? Colors.green
                          : Colors.red,
                      size: 20,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}