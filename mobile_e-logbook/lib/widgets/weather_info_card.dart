import 'package:flutter/material.dart';

/// Widget untuk menampilkan informasi cuaca real-time
class WeatherInfoCard extends StatelessWidget {
  final String? condition;
  final double? temperature;
  final double? windSpeed;
  final int? humidity;
  final double? waveHeight;
  final bool isLoading;
  final String? errorMessage;

  const WeatherInfoCard({
    super.key,
    this.condition,
    this.temperature,
    this.windSpeed,
    this.humidity,
    this.waveHeight,
    this.isLoading = false,
    this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    double fs(double size) => size * (width / 390);
    double sp(double size) => size * (width / 390);

    if (errorMessage != null) {
      return _buildErrorCard(sp, fs);
    }

    if (isLoading) {
      return _buildLoadingCard(sp, fs);
    }

    return Container(
      margin: EdgeInsets.symmetric(horizontal: sp(16)),
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1B4F9C).withOpacity(0.9),
            const Color(0xFF2563EB).withOpacity(0.9),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(sp(16)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1B4F9C).withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    _getWeatherIcon(condition),
                    color: Colors.white,
                    size: fs(24),
                  ),
                  SizedBox(width: sp(8)),
                  Text(
                    'Kondisi Cuaca',
                    style: TextStyle(
                      fontSize: fs(16),
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: sp(10),
                  vertical: sp(4),
                ),
                decoration: BoxDecoration(
                  color: _getWeatherSafetyColor(windSpeed, waveHeight),
                  borderRadius: BorderRadius.circular(sp(12)),
                ),
                child: Text(
                  _getWeatherSafetyText(windSpeed, waveHeight),
                  style: TextStyle(
                    fontSize: fs(11),
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),

          SizedBox(height: sp(16)),

          // Weather info grid
          Row(
            children: [
              Expanded(
                child: _buildWeatherItem(
                  icon: Icons.thermostat,
                  label: 'Suhu',
                  value: temperature != null 
                    ? '${temperature!.toStringAsFixed(1)}°C'
                    : '-',
                  sp: sp,
                  fs: fs,
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: _buildWeatherItem(
                  icon: Icons.air,
                  label: 'Angin',
                  value: windSpeed != null 
                    ? '${windSpeed!.toStringAsFixed(1)} km/h'
                    : '-',
                  sp: sp,
                  fs: fs,
                ),
              ),
            ],
          ),

          SizedBox(height: sp(12)),

          Row(
            children: [
              Expanded(
                child: _buildWeatherItem(
                  icon: Icons.water_drop,
                  label: 'Kelembaban',
                  value: humidity != null ? '$humidity%' : '-',
                  sp: sp,
                  fs: fs,
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: _buildWeatherItem(
                  icon: Icons.waves,
                  label: 'Tinggi Ombak',
                  value: waveHeight != null 
                    ? '${waveHeight!.toStringAsFixed(1)} m'
                    : '-',
                  sp: sp,
                  fs: fs,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherItem({
    required IconData icon,
    required String label,
    required String value,
    required double Function(double) sp,
    required double Function(double) fs,
  }) {
    return Container(
      padding: EdgeInsets.all(sp(12)),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(sp(10)),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.white, size: fs(20)),
          SizedBox(height: sp(6)),
          Text(
            label,
            style: TextStyle(
              fontSize: fs(11),
              color: Colors.white.withOpacity(0.9),
            ),
          ),
          SizedBox(height: sp(2)),
          Text(
            value,
            style: TextStyle(
              fontSize: fs(14),
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingCard(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: sp(16)),
      padding: EdgeInsets.all(sp(24)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          CircularProgressIndicator(
            color: const Color(0xFF1B4F9C),
          ),
          SizedBox(height: sp(12)),
          Text(
            'Memuat data cuaca...',
            style: TextStyle(
              fontSize: fs(14),
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: sp(16)),
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(sp(16)),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber, color: Colors.orange, size: fs(24)),
          SizedBox(width: sp(12)),
          Expanded(
            child: Text(
              errorMessage ?? 'Gagal memuat data cuaca',
              style: TextStyle(
                fontSize: fs(13),
                color: Colors.orange[900],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getWeatherIcon(String? condition) {
    if (condition == null) return Icons.cloud;
    
    final lower = condition.toLowerCase();
    if (lower.contains('cerah') || lower.contains('sunny')) {
      return Icons.wb_sunny;
    } else if (lower.contains('hujan') || lower.contains('rain')) {
      return Icons.water_drop;
    } else if (lower.contains('berawan') || lower.contains('cloud')) {
      return Icons.cloud;
    } else if (lower.contains('petir') || lower.contains('thunder')) {
      return Icons.thunderstorm;
    }
    return Icons.cloud;
  }

  Color _getWeatherSafetyColor(double? windSpeed, double? waveHeight) {
    if (windSpeed == null || waveHeight == null) {
      return Colors.grey;
    }
    
    // Kriteria cuaca berbahaya untuk nelayan
    if (windSpeed > 40 || waveHeight > 2.5) {
      return Colors.red;
    } else if (windSpeed > 25 || waveHeight > 1.5) {
      return Colors.orange;
    }
    return Colors.green;
  }

  String _getWeatherSafetyText(double? windSpeed, double? waveHeight) {
    if (windSpeed == null || waveHeight == null) {
      return 'Unknown';
    }
    
    if (windSpeed > 40 || waveHeight > 2.5) {
      return 'Berbahaya';
    } else if (windSpeed > 25 || waveHeight > 1.5) {
      return 'Waspada';
    }
    return 'Aman';
  }
}