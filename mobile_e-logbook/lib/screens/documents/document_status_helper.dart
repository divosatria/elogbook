// lib/screens/documents/document_status_helper.dart

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'nahkoda/nahkoda_document_status_screen.dart';
import 'crew/crew_document_status_screen.dart';

class DocumentStatusHelper {
  /// Navigate to document status screen based on user role from SharedPreferences
  static Future<void> navigateToStatus(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    
    Widget screen;
    
    if (userDataString != null) {
      final userData = json.decode(userDataString);
      final userRole = userData['role']?.toString().toLowerCase() ?? 'crew';
      
      if (userRole == 'nahkoda' || userRole == 'captain') {
        screen = const NahkodaDocumentStatusScreen();
      } else {
        screen = const CrewDocumentStatusScreen();
      }
    } else {
      screen = const CrewDocumentStatusScreen();
    }

    if (!context.mounted) return;
    NavigationHelper.pushNoTransition(context, screen);
  }

  /// Get screen widget based on user role (for direct use)
  static Future<Widget> getScreenByRole() async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('user_data');
    
    if (userDataString != null) {
      final userData = json.decode(userDataString);
      final userRole = userData['role']?.toString().toLowerCase() ?? 'crew';
      
      if (userRole == 'nahkoda' || userRole == 'captain') {
        return const NahkodaDocumentStatusScreen();
      } else {
        return const CrewDocumentStatusScreen();
      }
    }
    return const CrewDocumentStatusScreen();
  }
}

/// Router widget for named routes
class DocumentStatusRoutes extends StatelessWidget {
  const DocumentStatusRoutes({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Widget>(
      future: DocumentStatusHelper.getScreenByRole(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return snapshot.data!;
        }
        return const SizedBox.shrink();
      },
    );
  }
}
