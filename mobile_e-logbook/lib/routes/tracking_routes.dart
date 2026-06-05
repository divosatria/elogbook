import 'package:e_logbook/screens/tracking/active_tracking_screen.dart';
import 'package:flutter/material.dart';
import 'package:e_logbook/utils/navigation_helper.dart';

class TrackingRoutes {
  // Pre-trip and tracking screens


  static void navigateToActiveTracking(BuildContext context, {
    required String vesselName,
    required String vesselNumber,
    required String captainName,
    required int crewCount,
    required String selectedHarbor,
    required DateTime departureTime,
    DateTime? estimatedReturnDate,
    required int estimatedDuration,
    required String emergencyContact,
    required double fuelAmount,
    required double iceStorage,
    String? notes,
    Map<String, dynamic>? harborCoordinates,
    required double zoneRadius,
    String userRole = 'Nahkoda',
    String userName = '',
  }) {
    NavigationHelper.pushReplacementNoTransition(
      context,
      ActiveTrackingScreen(
        vesselName: vesselName,
        vesselNumber: vesselNumber,
        captainName: captainName,
        crewCount: crewCount,
        selectedHarbor: selectedHarbor,
        departureTime: departureTime,
        estimatedReturnDate: estimatedReturnDate,
        estimatedDuration: estimatedDuration,
        emergencyContact: emergencyContact,
        fuelAmount: fuelAmount,
        iceStorage: iceStorage,
        notes: notes,
        harborCoordinates: harborCoordinates,
        zoneRadius: zoneRadius,
        userRole: userRole,
        userName: userName,
      ),
    );
  }

  // Method ini dihapus karena RealtimeZoneMapScreen tidak ada
  // Gunakan RealTimeZoneMapWithCoordinates sebagai widget di dalam screen lain

  // Emergency actions during tracking
  static void showTrackingEmergencyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.red),
            SizedBox(width: 8),
            Text('Emergency Alert'),
          ],
        ),
        content: const Text(
          'Apakah Anda dalam keadaan darurat?\n\n'
          'Sistem akan mengirim sinyal darurat ke pihak berwenang.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _sendEmergencySignal(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Kirim Emergency', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  static void _sendEmergencySignal(BuildContext context) {
    // TODO: Implement actual emergency signal
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Sinyal darurat telah dikirim!'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 3),
      ),
    );
  }

  // Stop tracking confirmation
  static void showStopTrackingDialog(BuildContext context, VoidCallback onConfirm) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hentikan Tracking'),
        content: const Text(
          'Apakah Anda yakin ingin menghentikan tracking?\n\n'
          'Data tracking akan disimpan dan trip akan berakhir.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              onConfirm();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Hentikan', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}