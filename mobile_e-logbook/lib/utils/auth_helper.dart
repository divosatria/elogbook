import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/splash_screen.dart';

class AuthHelper {
  static Future<void> handleTokenExpired(BuildContext context) async {
    if (!context.mounted) return;

    // Clear all data
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    debugPrint('🧹 [AuthHelper] Cleared all data due to token expiration');

    // Show dialog
    if (context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
              SizedBox(width: 12),
              Expanded(child: Text('Sesi Berakhir')),
            ],
          ),
          content: const Text(
            'Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.',
            style: TextStyle(fontSize: 14),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const SplashScreen()),
                    (route) => false,
                  );
                }
              },
              style: TextButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Login Ulang'),
            ),
          ],
        ),
      );
    }
  }

  static bool isTokenExpiredError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('401') ||
        errorString.contains('expired') ||
        errorString.contains('unauthorized') ||
        errorString.contains('tokenexpiredexception');
  }
}
