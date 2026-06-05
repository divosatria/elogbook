import 'package:e_logbook/screens/tracking/pre_trip_form.dart';
import 'package:flutter/material.dart';
import 'package:e_logbook/routes/app_routes.dart';
import 'package:e_logbook/screens/main_screen.dart';
import 'package:e_logbook/screens/profile_screen.dart';
import 'package:e_logbook/screens/tracking/active_tracking_screen.dart';
import 'package:e_logbook/screens/vessel/vessel_info_screen.dart';
import 'package:e_logbook/screens/documents/document_status_helper.dart';
import 'package:e_logbook/screens/documents/document_upload_stepper.dart';
import 'package:e_logbook/screens/documents/nahkoda/nahkoda_document_status_screen.dart';
import 'package:e_logbook/screens/documents/crew/crew_document_status_screen.dart';
import 'package:e_logbook/screens/crew/screens/create_catch_screen.dart';
import 'package:e_logbook/screens/crew/screens/catch_detail_screen.dart';
import 'package:e_logbook/screens/notification_detail_screen.dart';
import 'package:e_logbook/screens/page/edit_profile_screen.dart';
import 'package:e_logbook/screens/history_screen.dart';

class RouteGenerator {
  static Route<dynamic>? generateRoute(RouteSettings settings) {
    Route<T> _noTransitionRoute<T>(Widget page) {
      return PageRouteBuilder<T>(
        settings: settings,
        pageBuilder: (context, animation, secondaryAnimation) => page,
        transitionDuration: Duration.zero,
        reverseTransitionDuration: Duration.zero,
      );
    }

    switch (settings.name) {
      case AppRoutes.home:
        return _noTransitionRoute(const MainScreen());

      case AppRoutes.profile:
        return _noTransitionRoute(const ProfileScreen());

      case AppRoutes.preTripForm:
        final tripData = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          PreTripForm(
            tripId: tripData?['id'],
            tripData: tripData,
          ),
        );
      
      case AppRoutes.vesselInfo:
        final arguments = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          VesselInfoScreen(arguments: arguments),
        );

      case AppRoutes.activeTracking:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          ActiveTrackingScreen(
            vesselName: args?['vesselName'] ?? '',
            vesselNumber: args?['vesselNumber'] ?? '',
            captainName: args?['captainName'] ?? '',
            crewCount: args?['crewCount'] ?? 0,
            selectedHarbor: args?['selectedHarbor'] ?? '',
            departureTime: args?['departureTime'] ?? DateTime.now(),
            estimatedReturnDate: args?['estimatedReturnDate'],
            estimatedDuration: args?['estimatedDuration'] ?? 1,
            emergencyContact: args?['emergencyContact'] ?? '',
            fuelAmount: (args?['fuelAmount'] ?? 0.0).toDouble(),
            iceStorage: (args?['iceStorage'] ?? 0.0).toDouble(),
            notes: args?['notes'],
            harborCoordinates: args?['harborCoordinates'],
            zoneRadius: (args?['zoneRadius'] ?? 50.0).toDouble(),
            userRole: args?['userRole'] ?? 'Nahkoda',
            userName: args?['userName'] ?? '',
          ),
        );

      case AppRoutes.documentCompletion:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          DocumentUploadStepper(rejectedDocType: args?['rejectedDocType']),
        );

      case AppRoutes.nahkodaDocumentUpload:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          DocumentUploadStepper(
            rejectedDocType: args?['rejectedDocType'],
            fromVesselDocs: args?['fromVesselDocs'] ?? false,
          ),
        );

      case AppRoutes.crewDocumentUpload:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          DocumentUploadStepper(rejectedDocType: args?['rejectedDocType']),
        );

      case AppRoutes.createCatch:
        final args = settings.arguments as Map<String, dynamic>?;
        final tripId = args?['tripId'];
        final isNetRetrieval = args?['isNetRetrieval'] ?? false;

        if (tripId == null) {
          return _noTransitionRoute(const MainScreen());
        }

        return _noTransitionRoute(CreateCatchScreen(
          tripId: tripId, 
          isNetRetrieval: isNetRetrieval,
        ));

      case AppRoutes.documentStatus:
        return _noTransitionRoute(const DocumentStatusRoutes());

      case AppRoutes.nahkodaDocumentStatus:
        return _noTransitionRoute(const NahkodaDocumentStatusScreen());

      case AppRoutes.crewDocumentStatus:
        return _noTransitionRoute(const CrewDocumentStatusScreen());

      case AppRoutes.catchDetail:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          CatchDetailScreen(catchData: args?['catchData']),
        );

      case AppRoutes.notificationDetail:
        final args = settings.arguments as Map<String, dynamic>?;
        return _noTransitionRoute(
          NotificationDetailScreen(
            title: args?['title'] ?? '',
            message: args?['message'] ?? '',
            timestamp: args?['timestamp'] ?? DateTime.now(),
          ),
        );

      case AppRoutes.editProfile:
        return _noTransitionRoute(const EditProfileScreen());

      case AppRoutes.history:
        return _noTransitionRoute(const HistoryScreen());

      default:
        return _errorRoute();
    }
  }

  static Route<dynamic> _errorRoute() {
    return PageRouteBuilder(
      pageBuilder: (context, animation, secondaryAnimation) => Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: const Center(child: Text('Halaman tidak ditemukan')),
      ),
      transitionDuration: Duration.zero,
      reverseTransitionDuration: Duration.zero,
    );
  }
}
