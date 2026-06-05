import 'package:flutter/material.dart';
import 'package:e_logbook/utils/responsive_helper.dart';

class AppInfo extends StatelessWidget {
  final String version;
  final String releaseYear;

  const AppInfo({
    super.key,
    required this.version,
    required this.releaseYear,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisSize: MainAxisSize.min, // Penting untuk tidak mengambil ruang berlebih
      children: [
        SizedBox(
          height: ResponsiveHelper.spacing(
            context,
            mobile: 8,
            tablet: 12,
            mobileLandscape: 4,
            tabletLandscape: 6,
          ),
        ),
        Text(
          "V $version",
          style: TextStyle(
            fontSize: ResponsiveHelper.font(
              context,
              mobile: 14,
              tablet: 16,
              mobileLandscape: 12,
              tabletLandscape: 14,
            ),
            color: const Color.fromARGB(255, 129, 129, 129),
          ),
        ),
        SizedBox(
          height: ResponsiveHelper.spacing(
            context,
            mobile: 4,
            tablet: 6,
            mobileLandscape: 2,
            tabletLandscape: 4,
          ),
        ),
        Text(
          "© $releaseYear E-Logbook",
          style: TextStyle(
            fontSize: ResponsiveHelper.font(
              context,
              mobile: 12,
              tablet: 14,
              mobileLandscape: 10,
              tabletLandscape: 12,
            ),
            color: const Color.fromARGB(255, 129, 129, 129),
          ),
        ),
      ],
    );
  }
}