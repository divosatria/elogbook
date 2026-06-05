import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class VesselHeaderCard extends StatelessWidget {
  final String vesselName;
  final String vesselNumber;
  final VoidCallback onSummaryTap;

  const VesselHeaderCard({
    super.key,
    required this.vesselName,
    required this.vesselNumber,
    required this.onSummaryTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: ResponsiveHelper.width(context, mobile: 16, tablet: 20),
      ),
      child: Column(
        children: [
          // 🚢 ICON KAPAL (FOCUS UTAMA)
          SizedBox(
            width: ResponsiveHelper.width(context, mobile: 130, tablet: 156),
            height: ResponsiveHelper.height(context, mobile: 130, tablet: 156),
            child: Lottie.asset(
              'assets/animations/PreTrip.json', // pastikan path benar
              fit: BoxFit.contain,
              repeat: true,
            ),
          ),
          // 🚢 NAMA KAPAL (DOMINAN)
          Text(
            vesselName,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 19, tablet: 22),
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1B4F9C),
            ),
          ),
          Text(
            'No. Kapal: $vesselNumber',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
              color: Colors.grey[600],
            ),
          ),
          TextButton.icon(
            onPressed: onSummaryTap,
            icon: Icon(Icons.bar_chart, size: ResponsiveHelper.width(context, mobile: 18, tablet: 22)),
            label: Text('Ringkasan Trip', style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 13, tablet: 15),
            )),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF1B4F9C),
              padding: EdgeInsets.symmetric(
                horizontal: ResponsiveHelper.width(context, mobile: 12, tablet: 16),
                vertical: ResponsiveHelper.height(context, mobile: 6, tablet: 8),
              ),
              textStyle: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 13, tablet: 15),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
