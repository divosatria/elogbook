import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Helper untuk manage orientation di seluruh app
class OrientationHelper {
  /// Check apakah device adalah tablet
  static bool isTablet(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final shortestSide = size.shortestSide;
    return shortestSide >= 600;
  }

  /// Lock sesuai device type (Tablet=Landscape, Phone=Portrait)
  static Future<void> lockByDeviceType(BuildContext context) async {
    if (isTablet(context)) {
      await lockLandscape();
    } else {
      await lockPortrait();
    }
  }

  /// Lock ke portrait mode (untuk HP)
  static Future<void> lockPortrait() async {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  }

  /// Lock ke landscape mode (untuk Tablet)
  static Future<void> lockLandscape() async {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  /// Allow all orientations (untuk screen tertentu jika diperlukan)
  static Future<void> unlockOrientation() async {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  /// Reset ke default (sesuai device type)
  static Future<void> resetToDefault(BuildContext context) async {
    await lockByDeviceType(context);
  }
}
