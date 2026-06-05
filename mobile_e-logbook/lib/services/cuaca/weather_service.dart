import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import '../../config/api_config.dart';

class WeatherData {
  final String condition;
  final double temperature;
  final double windSpeed;
  final int humidity;
  final double waveHeight; // Estimasi tinggi ombak

  WeatherData({
    required this.condition,
    required this.temperature,
    required this.windSpeed,
    required this.humidity,
    required this.waveHeight,
  });
}

class WeatherService {
  // API Key dari .env file untuk keamanan
  static String get _apiKey => ApiConfig.openWeatherApiKey;
  static const String _baseUrl = 'https://api.openweathermap.org/data/2.5';

  /// Mendapatkan data cuaca berdasarkan posisi
  static Future<WeatherData?> getWeatherByPosition(Position position) async {
    try {
      // Validasi API key
      if (_apiKey.isEmpty) {
        print('❌ [Weather] OpenWeather API key tidak ditemukan di .env');
        return null;
      }

      final url = Uri.parse(
        '$_baseUrl/weather?lat=${position.latitude}&lon=${position.longitude}&appid=$_apiKey&units=metric&lang=id',
      );

      print('🌤️ [Weather] Fetching weather data...');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [Weather] Data received successfully');

        return WeatherData(
          condition: data['weather'][0]['description'] ?? 'Tidak diketahui',
          temperature: (data['main']['temp'] as num).toDouble(),
          windSpeed:
              (data['wind']['speed'] as num).toDouble() * 3.6, // m/s ke km/h
          humidity: data['main']['humidity'] as int,
          waveHeight: _estimateWaveHeight(
            (data['wind']['speed'] as num).toDouble(),
          ),
        );
      } else {
        print('❌ [Weather] Error ${response.statusCode}: ${response.body}');
        throw Exception('Failed to load weather data: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [Weather] Error fetching weather: $e');
      return null;
    }
  }

  /// Mendapatkan data cuaca berdasarkan koordinat
  static Future<WeatherData?> getWeatherByCoordinates({
    required double lat,
    required double lon,
  }) async {
    try {
      // Validasi API key
      if (_apiKey.isEmpty) {
        print('❌ [Weather] OpenWeather API key tidak ditemukan di .env');
        return null;
      }

      final url = Uri.parse(
        '$_baseUrl/weather?lat=$lat&lon=$lon&appid=$_apiKey&units=metric&lang=id',
      );

      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        return WeatherData(
          condition: data['weather'][0]['description'] ?? 'Tidak diketahui',
          temperature: (data['main']['temp'] as num).toDouble(),
          windSpeed: (data['wind']['speed'] as num).toDouble() * 3.6,
          humidity: data['main']['humidity'] as int,
          waveHeight: _estimateWaveHeight(
            (data['wind']['speed'] as num).toDouble(),
          ),
        );
      } else {
        print('❌ [Weather] Error ${response.statusCode}');
        throw Exception('Failed to load weather data');
      }
    } catch (e) {
      print('❌ [Weather] Error fetching weather: $e');
      return null;
    }
  }

  /// Estimasi tinggi ombak berdasarkan kecepatan angin
  /// Rumus sederhana: wave_height = wind_speed * 0.05
  static double _estimateWaveHeight(double windSpeedMs) {
    // wind_speed dalam m/s
    // Formula simplified dari Beaufort scale
    if (windSpeedMs < 1) return 0.1;
    if (windSpeedMs < 4) return 0.3;
    if (windSpeedMs < 8) return 0.6;
    if (windSpeedMs < 11) return 1.2;
    if (windSpeedMs < 14) return 2.0;
    if (windSpeedMs < 17) return 3.0;
    return 4.0;
  }

  /// Cek apakah cuaca aman untuk melaut
  static bool isWeatherSafe(WeatherData weather) {
    // Kriteria keamanan untuk nelayan kecil
    return weather.windSpeed <= 25 && weather.waveHeight <= 1.5;
  }

  /// Mendapatkan level peringatan cuaca
  static String getWeatherWarningLevel(WeatherData weather) {
    if (weather.windSpeed > 40 || weather.waveHeight > 2.5) {
      return 'BERBAHAYA';
    } else if (weather.windSpeed > 25 || weather.waveHeight > 1.5) {
      return 'WASPADA';
    }
    return 'AMAN';
  }
}
