import 'package:flutter/material.dart';
import 'pre_tracking_simple.dart';

// Wrapper class untuk kompatibilitas
class PreTrackingSimple extends StatelessWidget {
  final int tripId;
  final String vesselName;
  final String vesselNumber;
  final String captainName;
  final int crewCount;
  final String departureHarbor;
  final DateTime departureDate;
  final DateTime? estimatedReturnDate;
  final int estimatedDuration;
  final double fuelAmount;
  final double iceStorage;
  final Map<String, dynamic>? harborCoordinates;
  final double zoneRadius;
  final String userRole;
  final String userName;

  const PreTrackingSimple({
    Key? key,
    required this.tripId,
    required this.vesselName,
    required this.vesselNumber,
    required this.captainName,
    required this.crewCount,
    required this.departureHarbor,
    required this.departureDate,
    this.estimatedReturnDate,
    required this.estimatedDuration,
    required this.fuelAmount,
    required this.iceStorage,
    this.harborCoordinates,
    required this.zoneRadius,
    required this.userRole,
    required this.userName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return PreTrackingScreenSimple(
      tripId: tripId,
      tripData: {
        'vesselName': vesselName,
        'vesselNumber': vesselNumber,
        'captainName': captainName,
        'crewCount': crewCount,
        'departureHarbor': departureHarbor,
        'departureDate': departureDate,
        'estimatedReturnDate': estimatedReturnDate,
        'estimatedDuration': estimatedDuration,
        'fuelAmount': fuelAmount,
        'iceStorage': iceStorage,
        'harborCoordinates': harborCoordinates,
        'zoneRadius': zoneRadius,
        'userRole': userRole,
        'userName': userName,
      },
    );
  }
}
