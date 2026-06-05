// lib/screens/documents/pending_popup_helper.dart

import 'package:e_logbook/screens/documents/crew/crew_pending_popup.dart';
import 'package:e_logbook/screens/documents/nahkoda/nahkoda_pending_popup.dart';
import 'package:flutter/material.dart';


class PendingPopupHelper {
  /// Show pending popup based on user role
  static void showPendingPopup({
    required BuildContext context,
    required String userRole,
    int pendingCount = 0,
    int approvedCount = 0,
    int rejectedCount = 0,
    int totalCount = 8,
  }) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.5),
      barrierLabel: 'Pending Popup',
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, animation, secondaryAnimation) {
        final role = userRole.toLowerCase();
        
        if (role == 'nahkoda' || role == 'captain') {
          return NahkodaPendingPopup(
            pendingCount: pendingCount,
            approvedCount: approvedCount,
            rejectedCount: rejectedCount,
            totalCount: totalCount,
          );
        } else {
          return CrewPendingPopup(
            pendingCount: pendingCount,
            approvedCount: approvedCount,
            rejectedCount: rejectedCount,
            totalCount: totalCount,
          );
        }
      },
    );
  }

  /// Calculate pending count from documents list
  static int getPendingCount(List<dynamic> documents) {
    return documents.where((doc) => doc['status'] == 'pending').length;
  }

  /// Calculate approved count from documents list
  static int getApprovedCount(List<dynamic> documents) {
    return documents.where((doc) => doc['status'] == 'approved').length;
  }

  /// Check if should show pending popup
  static bool shouldShowPendingPopup({
    required List<dynamic> documents,
    required bool hasSeenPendingPopupToday,
  }) {
    final pendingCount = getPendingCount(documents);
    
    // Show popup if:
    // 1. Ada dokumen pending
    // 2. Belum dilihat hari ini
    return pendingCount > 0 && !hasSeenPendingPopupToday;
  }
}
