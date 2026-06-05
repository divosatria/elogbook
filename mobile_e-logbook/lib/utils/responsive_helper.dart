import 'package:flutter/material.dart';

enum DeviceType { mobile, tablet }

class ResponsiveHelper {
  // ======================
  // Breakpoints
  // ======================
  static const double tabletMin = 540; // Tablet mulai dari 540dp (fix landscape detection)
  static const double tabletMedium = 768; // iPad, Galaxy Tab
  static const double tabletLarge = 1024; // iPad Pro, Galaxy Tab S8+

  // ======================
  // Device Type (berdasarkan dimensi terkecil untuk stabilitas orientasi)
  // ======================
  static DeviceType deviceType(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final shortestSide = size.shortestSide;

    final type = shortestSide >= tabletMin ? DeviceType.tablet : DeviceType.mobile;
    
    return type;
  }

  static bool isMobile(BuildContext context) =>
      deviceType(context) == DeviceType.mobile;

  static bool isTablet(BuildContext context) =>
      deviceType(context) == DeviceType.tablet;

  // ======================
  // Tablet Size Detection (small, medium, large)
  // ======================
  static String tabletSize(BuildContext context) {
    if (!isTablet(context)) return 'mobile';
    
    final shortestSide = MediaQuery.sizeOf(context).shortestSide;
    
    String size;
    if (shortestSide >= tabletLarge) {
      size = 'large';   // iPad Pro, Galaxy Tab S8+
    } else if (shortestSide >= tabletMedium) {
      size = 'medium'; // iPad, Galaxy Tab
    } else {
      size = 'small'; // Tablet kecil 7-8 inch
    }
    
    return size;
  }

  // ======================
  // Orientation Detection
  // ======================
  static bool isPortrait(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.portrait;
  }

  static bool isLandscape(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.landscape;
  }

  // ======================
  // Responsive Value Core dengan Orientation Support
  // ======================
  static double value(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    final type = deviceType(context);
    final landscape = isLandscape(context);

    switch (type) {
      case DeviceType.tablet:
        if (landscape && tabletLandscape != null) return tabletLandscape;
        return tablet ?? mobile * 1.4;
      case DeviceType.mobile:
        if (landscape && mobileLandscape != null) return mobileLandscape;
        return mobile; // Gunakan ukuran mobile asli
    }
  }

  // ======================
  // Adaptive Value (otomatis menyesuaikan dengan tablet size)
  // ======================
  static double adaptiveValue(
    BuildContext context, {
    required double mobile,
    double? smallTablet,
    double? mediumTablet,
    double? largeTablet,
    double? mobileLandscape,
  }) {
    final size = tabletSize(context);
    final landscape = isLandscape(context);

    if (size == 'mobile') {
      final result = landscape && mobileLandscape != null ? mobileLandscape : mobile;
      return result;
    }

    // Tablet - pilih ukuran berdasarkan size dan orientasi
    double result;
    switch (size) {
      case 'large':
        if (landscape) {
          result = largeTablet ?? mediumTablet ?? smallTablet ?? mobile * 1.6;
        } else {
          result = mediumTablet ?? smallTablet ?? mobile * 1.3;
        }
        break;
      case 'medium':
        if (landscape) {
          result = mediumTablet ?? smallTablet ?? mobile * 1.4;
        } else {
          result = smallTablet ?? mobile * 1.2;
        }
        break;
      case 'small':
        result = smallTablet ?? mobile * 1.1;
        break;
      default:
        result = mobile;
    }
    
    return result;
  }

  // ======================
  // Size Helpers - Menggunakan shortestSide untuk konsistensi
  // ======================
  static double width(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    return value(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
  }

  static double height(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    return value(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
  }

  static double font(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
    double min = 10,
    double max = 40,
  }) {
    final val = value(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
    return val.clamp(min, max);
  }

  // ======================
  // Image/Widget Size Helper (proporsi terhadap screen)
  // ======================
  static double imageSize(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    final val = value(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
    
    final size = MediaQuery.sizeOf(context);
    final baseSize = size.shortestSide;
    return (val / 375.0) * baseSize;
  }

  // ======================
  // Login Screen Specific - Logo & Animation Size
  // ======================
  static double loginLogoSize(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: tablet ?? mobile * 1.2,
      mediumTablet: tablet ?? mobile * 1.3,
      largeTablet: tablet ?? mobile * 1.4,
      mobileLandscape: mobileLandscape ?? mobile * 0.6,
    );
  }

  // ======================
  // Padding Helpers
  // ======================
  static EdgeInsets padding(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    final v = width(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
    return EdgeInsets.all(v);
  }

  static EdgeInsets paddingHorizontal(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    final v = width(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
    return EdgeInsets.symmetric(horizontal: v);
  }

  static EdgeInsets paddingVertical(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    final v = height(
      context,
      mobile: mobile,
      tablet: tablet,
      mobileLandscape: mobileLandscape,
      tabletLandscape: tabletLandscape,
    );
    return EdgeInsets.symmetric(vertical: v);
  }

  // ======================
  // Content Constraints
  // ======================
  static BoxConstraints contentConstraints(BuildContext context) {
    if (isTablet(context)) {
      return const BoxConstraints(maxWidth: 800);
    }
    return const BoxConstraints();
  }

  // ======================
  // Spacing Helper (lebih natural untuk spacing antar widget)
  // ======================
  static double spacing(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? mobileLandscape,
    double? tabletLandscape,
  }) {
    return height(
      context,
      mobile: mobile,
      tablet: tablet ?? mobile * 1.3,
      mobileLandscape: mobileLandscape ?? mobile * 0.6,
      tabletLandscape: tabletLandscape ?? (tablet ?? mobile * 1.3) * 0.7,
    );
  }
  
  static double buttonWidth(BuildContext context) {
    final size = MediaQuery.sizeOf(context);

    if (isTablet(context)) {
      return isLandscape(context)
          ? size.shortestSide * 0.7
          : size.shortestSide * 0.6;
    }

    return isLandscape(context)
        ? size.shortestSide * 0.8
        : double.infinity;
  }

  // ======================
  // AppBar Helper (untuk konsistensi header di semua screen)
  // ======================
  static double appBarHeight(
    BuildContext context, {
    double mobile = 56,
    double smallTablet = 36,
    double mediumTablet = 40,
    double largeTablet = 44,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double appBarPadding(
    BuildContext context, {
    double mobile = 20,
    double smallTablet = 12,
    double mediumTablet = 14,
    double largeTablet = 16,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double appBarTitleSize(
    BuildContext context, {
    double mobile = 20,
    double smallTablet = 18,
    double mediumTablet = 20,
    double largeTablet = 22,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double appBarIconSize(
    BuildContext context, {
    double mobile = 24,
    double smallTablet = 18,
    double mediumTablet = 20,
    double largeTablet = 22,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  // ======================
  // Content Helper (untuk animasi, icon, dll di dalam form)
  // ======================
  static double animationSize(
    BuildContext context, {
    double mobile = 100,
    double smallTablet = 80,
    double mediumTablet = 90,
    double largeTablet = 100,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double contentPadding(
    BuildContext context, {
    double mobile = 24,
    double smallTablet = 20,
    double mediumTablet = 22,
    double largeTablet = 24,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double borderRadius(
    BuildContext context, {
    double mobile = 30,
    double smallTablet = 24,
    double mediumTablet = 26,
    double largeTablet = 28,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  // ======================
  // Popup/Dialog Helper
  // ======================
  static double popupHeight(
    BuildContext context, {
    double mobile = 600,
    double smallTablet = 500,
    double mediumTablet = 550,
    double largeTablet = 600,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupMaxWidth(
    BuildContext context, {
    double mobile = 450,
    double smallTablet = 400,
    double mediumTablet = 450,
    double largeTablet = 500,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupTitleSize(
    BuildContext context, {
    double mobile = 28,
    double smallTablet = 22,
    double mediumTablet = 24,
    double largeTablet = 26,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupSubtitleSize(
    BuildContext context, {
    double mobile = 15,
    double smallTablet = 13,
    double mediumTablet = 14,
    double largeTablet = 15,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupIllustrationSize(
    BuildContext context, {
    double mobile = 160,
    double smallTablet = 120,
    double mediumTablet = 140,
    double largeTablet = 160,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupLottieSize(
    BuildContext context, {
    double mobile = 100,
    double smallTablet = 80,
    double mediumTablet = 90,
    double largeTablet = 100,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupPadding(
    BuildContext context, {
    double mobile = 24,
    double smallTablet = 20,
    double mediumTablet = 22,
    double largeTablet = 24,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupBorderRadius(
    BuildContext context, {
    double mobile = 32,
    double smallTablet = 24,
    double mediumTablet = 28,
    double largeTablet = 32,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }

  static double popupButtonHeight(
    BuildContext context, {
    double mobile = 56,
    double smallTablet = 48,
    double mediumTablet = 52,
    double largeTablet = 56,
  }) {
    return adaptiveValue(
      context,
      mobile: mobile,
      smallTablet: smallTablet,
      mediumTablet: mediumTablet,
      largeTablet: largeTablet,
    );
  }
}