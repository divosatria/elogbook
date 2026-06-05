import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import '../screens/data_raw_screen.dart';
import '../screens/crew/screens/fish_photo_tips_screen.dart';
import '../screens/schedules/my_schedules_screen.dart';
import '../screens/schedules/trip_info_screen.dart';
import 'common_routes.dart';

class CrewRoutes {
  static void navigateToDataRaw(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const DataRawScreen(),
    );
  }

  static void navigateToMySchedules(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const MySchedulesScreen(),
    );
  }

  static void navigateToTripInfo(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const TripInfoScreen(),
    );
  }
  
  static void navigateToFishPhotoTips(BuildContext context) {
    NavigationHelper.pushNoTransition(
      context,
      const FishPhotoTipsScreen(),
    );
  }

  static void navigateToRegistration(BuildContext context) {
    CommonRoutes.showInfoSnackBar(
      context, 
      'Pendaftaran crew dilakukan melalui web'
    );
  }

  static void showEmergencyDialog(BuildContext context) {
    CommonRoutes.showInfoSnackBar(
      context, 
      'Fitur emergency akan segera tersedia'
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
}