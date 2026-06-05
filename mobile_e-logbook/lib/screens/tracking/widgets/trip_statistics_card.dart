import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:e_logbook/utils/trip_duration_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// Widget untuk menampilkan statistik trip
class TripStatisticsCard extends StatelessWidget {
  final DateTime departureDate;
  final DateTime? estimatedReturnDate; // Dari BE (prioritas)
  final int? estimatedDurationDays; // Fallback
  final double? currentDistance;
  final bool isViolating;
  final String zoneStatus; // 'inside', 'approaching', 'outside', 'unknown'

  const TripStatisticsCard({
    super.key,
    required this.departureDate,
    this.estimatedReturnDate,
    this.estimatedDurationDays,
    this.currentDistance,
    this.isViolating = false,
    this.zoneStatus = 'unknown',
  });

  @override
  Widget build(BuildContext context) {
    final helper = TripDurationHelper(
      departureDate: departureDate,
      estimatedReturnDate: estimatedReturnDate,
      estimatedDurationDays: estimatedDurationDays,
    );
    
    // Tentukan warna dan label berdasarkan zone status
    Color zoneColor;
    String zoneLabel;
    
    if (isViolating) {
      // Jika di zona terlarang, prioritaskan warna merah
      zoneColor = Colors.red;
      zoneLabel = 'Melewati Batas';
    } else {
      // Gunakan zone status untuk menentukan warna
      switch (zoneStatus) {
        case 'inside':
          zoneColor = Colors.green;
          zoneLabel = 'Dalam Zona';
          break;
        case 'approaching':
          zoneColor = Colors.orange;
          zoneLabel = 'Menuju Zona';
          break;
        case 'outside':
          zoneColor = Colors.red;
          zoneLabel = 'Melewati Batas';
          break;
        default:
          zoneColor = Colors.grey;
          zoneLabel = 'Jarak dari Zona';
      }
    }
    
    return Container(
      margin: EdgeInsets.symmetric(
        horizontal: ResponsiveHelper.width(context, mobile: 16, tablet: 20),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              lottieAsset: 'assets/animations/clock.json',
              label: helper.getStatusLabel(),
              value: helper.formatRemainingTime(),
              color: helper.getStatusColor(),
            ),
          ),
          SizedBox(width: ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
          Expanded(
            child: _buildStatCard(
              lottieAsset: isViolating
                  ? 'assets/animations/GPSRED.json'
                  : (zoneStatus == 'inside' 
                      ? 'assets/animations/GPSBLUE.json'
                      : zoneStatus == 'approaching'
                          ? 'assets/animations/GPSBLUE.json'
                          : 'assets/animations/GPSRED.json'),
              label: zoneLabel,
              value: currentDistance != null
                  ? '${currentDistance!.toStringAsFixed(1)} km'
                  : '-',
              color: zoneColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String lottieAsset,
    required String label,
    required String value,
    required Color color,
  }) {
    return Builder(
      builder: (context) => Container(
        constraints: BoxConstraints(
          minHeight: ResponsiveHelper.height(context, mobile: 170, tablet: 200),
        ),
        padding: EdgeInsets.symmetric(
          vertical: ResponsiveHelper.height(context, mobile: 20, tablet: 24),
          horizontal: ResponsiveHelper.width(context, mobile: 16, tablet: 20),
        ),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(
            ResponsiveHelper.width(context, mobile: 12, tablet: 16),
          ),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: ResponsiveHelper.width(context, mobile: 36, tablet: 44),
              height: ResponsiveHelper.height(context, mobile: 36, tablet: 44),
              child: Transform.scale(
                scale: lottieAsset.contains('GPS') ? 3.5 : 2.0,
                child: Lottie.asset(
                  lottieAsset,
                  fit: BoxFit.contain,
                  repeat: true,
                ),
              ),
            ),

            SizedBox(height: ResponsiveHelper.height(context, mobile: 25, tablet: 30)),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                color: Colors.grey[700],
              ),
            ),
            SizedBox(height: ResponsiveHelper.height(context, mobile: 4, tablet: 6)),
            Text(
              value,
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 18),
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}