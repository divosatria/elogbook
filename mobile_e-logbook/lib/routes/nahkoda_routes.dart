import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import '../screens/schedules/trip_info_screen.dart';
import '../screens/schedules/my_schedules_screen.dart';
import 'tracking_routes.dart';


class NahkodaRoutes {
  static void navigateToTripInfo(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const TripInfoScreen(),
    );
  }

  static void navigateToMySchedules(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const MySchedulesScreen(),
    );
  }

  static void navigateToCustomerService(BuildContext context) async {
    final phoneNumber = '6282116927632';
    final message = Uri.encodeComponent(
      'Halo Admin E-Logbook 👋\n\n'
      'Saya ingin bertanya terkait:\n'
      '"Silakan jelaskan kendala Anda di sini"\n\n'
      'Terima kasih sebelumnya 🙏'
    );
    final whatsappUrl = Uri.parse('https://wa.me/$phoneNumber?text=$message');
    
    try {
      if (await canLaunchUrl(whatsappUrl)) {
        await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tidak dapat membuka WhatsApp'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  static void navigateToActiveTracking(
    BuildContext context, {
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
    TrackingRoutes.navigateToActiveTracking(
      context,
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
    );
  }

  static void showEmergencyDialog(BuildContext context) {
    TrackingRoutes.showTrackingEmergencyDialog(context);
  }
}