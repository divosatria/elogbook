// lib/screens/documents/document_popup_helper.dart

import 'package:flutter/material.dart';
import 'nahkoda/nahkoda_document_popup.dart';
import 'crew/crew_document_popup.dart';

class DocumentPopupHelper {
  static ValueNotifier<bool> isPopupVisible = ValueNotifier<bool>(false);

  /// Show appropriate popup based on user role
  static void showDocumentPopup(BuildContext context, String userRole) {
    isPopupVisible.value = true;
    
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.5),
      barrierLabel: 'Document Popup',
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, animation, secondaryAnimation) {
        final role = userRole.toLowerCase();
        
        if (role == 'nahkoda' || role == 'captain') {
          return const NahkodaDocumentPopup();
        } else {
          return const CrewDocumentPopup();
        }
      },
    ).then((_) {
      isPopupVisible.value = false;
    });
  }

  /// Check if user needs to complete documents
  static bool shouldShowDocumentPopup({
    required bool documentsCompleted,
    required bool documentsPending,
    required bool hasSeenPopupToday,
  }) {
    // Don't show if documents are completed
    if (documentsCompleted) return false;

    // Don't show if documents are pending verification
    if (documentsPending) return false;

    // Don't show if user has already seen popup today
    if (hasSeenPopupToday) return false;

    return true;
  }

  /// Mark popup as seen for today
  static Future<void> markPopupAsSeen() async {
    // TODO: Implement with SharedPreferences or your storage solution
    // Example:
    // final prefs = await SharedPreferences.getInstance();
    // final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    // await prefs.setString('last_popup_date', today);
  }

  /// Check if popup was seen today
  static Future<bool> wasPopupSeenToday() async {
    // TODO: Implement with SharedPreferences or your storage solution
    // Example:
    // final prefs = await SharedPreferences.getInstance();
    // final lastDate = prefs.getString('last_popup_date');
    // final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    // return lastDate == today;
    return false;
  }
}