import 'package:flutter/material.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import '../screens/history_screen.dart';
import '../screens/statistics_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/notification_screen.dart';
import '../screens/home_screen.dart';
import '../screens/map_piker_screen.dart';

class CommonRoutes {
  // Main navigation screens
  static void navigateToHome(BuildContext context) {
    NavigationHelper.pushReplacementNoTransition(
      context,
      const HomeScreen(),
    );
  }

  static void navigateToHistory(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const HistoryScreen(),
    );
  }

  static void navigateToStatistics(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const StatisticsScreen(),
    );
  }

  static void navigateToProfile(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const ProfileScreen(),
    );
  }

  static void navigateToNotifications(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      NotificationScreen(),
    );
  }

  // Utility screens
  static void navigateToMapPicker(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      MapPickerScreen(),
    );
  }

  // Common dialogs
  static void showInfoDialog(BuildContext context, {
    required String title,
    required String message,
    String buttonText = 'OK',
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(buttonText),
          ),
        ],
      ),
    );
  }

  static void showConfirmDialog(BuildContext context, {
    required String title,
    required String message,
    required VoidCallback onConfirm,
    String confirmText = 'Ya',
    String cancelText = 'Batal',
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(cancelText),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              onConfirm();
            },
            child: Text(confirmText),
          ),
        ],
      ),
    );
  }

  // Common snackbars
  static void showSuccessSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static void showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static void showInfoSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.blue,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}