import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../widgets/account_inactive_dialog.dart';

class AccountStatusInterceptor extends Interceptor {
  final BuildContext context;

  AccountStatusInterceptor(this.context);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final message = err.response?.data['message'] ?? '';
      
      if (message.toLowerCase().contains('tidak aktif')) {
        await _handleAccountInactive(message);
        return;
      }
    }
    
    handler.next(err);
  }

  Future<void> _handleAccountInactive(String message) async {
    if (!context.mounted) return;

    AccountInactiveDialog.show(
      context,
      message,
      isFromLogin: false,
    );
  }
}
