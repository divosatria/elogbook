import 'package:flutter/material.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/local/user_activity_service.dart';
import '../screens/Login/welcome_screen.dart';

class AccountInactiveDialog {
  static void show(BuildContext context, String message, {bool isFromLogin = false}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.block, color: Colors.red[700], size: 28),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Akun Dinonaktifkan',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            if (isFromLogin)
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Silakan hubungi administrator untuk mengaktifkan kembali akun Anda',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: isFromLogin
            ? [
                TextButton.icon(
                  onPressed: () async {
                    final Uri phoneUri = Uri(scheme: 'tel', path: '+6281234567890');
                    if (await canLaunchUrl(phoneUri)) {
                      await launchUrl(phoneUri);
                    }
                  },
                  icon: const Icon(Icons.phone),
                  label: const Text('Hubungi Admin'),
                ),
              ]
            : [
                TextButton.icon(
                  onPressed: () async {
                    final Uri phoneUri = Uri(scheme: 'tel', path: '+6281234567890');
                    if (await canLaunchUrl(phoneUri)) {
                      await launchUrl(phoneUri);
                    }
                  },
                  icon: const Icon(Icons.phone),
                  label: const Text('Hubungi Admin'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    await _logout(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[700],
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Keluar'),
                ),
              ],
      ),
    );
  }

  static Future<void> _logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user_data');
    
    if (userData != null) {
      await UserActivityService.saveActivity(
        userId: userData,
        activityType: 'logout',
        description: 'Akun dinonaktifkan oleh admin',
        data: {'reason': 'account_deactivated'},
      );
    }
    
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    
    if (context.mounted) {
      NavigationHelper.pushAndRemoveUntilNoTransition(
        context,
        const WelcomeScreen(),
        (route) => false,
      );
    }
  }
}

