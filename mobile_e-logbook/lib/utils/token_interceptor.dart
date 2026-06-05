import 'package:dio/dio.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/Login/login_screen.dart';

class TokenInterceptor extends Interceptor {
  final BuildContext? context;

  TokenInterceptor({this.context});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final message = err.response?.data is Map 
          ? (err.response?.data['message']?.toString().toLowerCase() ?? '')
          : '';
      
      // Check if token expired or invalid
      if (message.contains('expired') || 
          message.contains('invalid') || 
          message.contains('token') ||
          err.response?.statusCode == 401) {
        debugPrint('🔐 Token expired/invalid (401), logging out...');
        await _handleTokenExpired();
        handler.reject(err); // Reject to prevent further processing
        return;
      }
    }
    
    handler.next(err);
  }

  Future<void> _handleTokenExpired() async {
    // Clear all stored data
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    debugPrint('🧹 Cleared all data due to token expiration');

    // Navigate to login if context available
    if (context != null && context!.mounted) {
      NavigationHelper.pushAndRemoveUntilNoTransition(
        context!,
        const LoginScreen(),
        (route) => false,
      );
      
      // Show snackbar
      ScaffoldMessenger.of(context!).showSnackBar(
        const SnackBar(
          content: Text('Sesi Anda telah berakhir. Silakan login kembali.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
    }
  }
}
