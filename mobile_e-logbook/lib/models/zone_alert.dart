import 'package:google_maps_flutter/google_maps_flutter.dart';

class ZoneAlert {
  final String id;
  final DateTime timestamp;
  final String harborZoneId;
  final String harborZoneName;
  final double currentDistance;
  final double zoneRadius;
  final LatLng violationLocation;
  final String vesselName;
  final String alertType; // 'warning', 'critical', 'info'
  final bool isRead;

  ZoneAlert({
    required this.id,
    required this.timestamp,
    required this.harborZoneId,
    required this.harborZoneName,
    required this.currentDistance,
    required this.zoneRadius,
    required this.violationLocation,
    required this.vesselName,
    required this.alertType,
    this.isRead = false,
  });

  String get message {
    final excess = (currentDistance - zoneRadius).toStringAsFixed(2);
    return 'Kapal "$vesselName" melewati batas zona $harborZoneName sejauh $excess km';
  }

  String get shortMessage {
    return 'Pelanggaran zona penangkapan terdeteksi!';
  }

  double get excessDistance => currentDistance - zoneRadius;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp.toIso8601String(),
      'harborZoneId': harborZoneId,
      'harborZoneName': harborZoneName,
      'currentDistance': currentDistance,
      'zoneRadius': zoneRadius,
      'violationLat': violationLocation.latitude,
      'violationLng': violationLocation.longitude,
      'vesselName': vesselName,
      'alertType': alertType,
      'isRead': isRead,
    };
  }

  factory ZoneAlert.fromJson(Map<String, dynamic> json) {
    return ZoneAlert(
      id: json['id'],
      timestamp: DateTime.parse(json['timestamp']),
      harborZoneId: json['harborZoneId'],
      harborZoneName: json['harborZoneName'],
      currentDistance: json['currentDistance'].toDouble(),
      zoneRadius: json['zoneRadius'].toDouble(),
      violationLocation: LatLng(
        json['violationLat'].toDouble(),
        json['violationLng'].toDouble(),
      ),
      vesselName: json['vesselName'],
      alertType: json['alertType'],
      isRead: json['isRead'] ?? false,
    );
  }

  ZoneAlert copyWith({bool? isRead}) {
    return ZoneAlert(
      id: id,
      timestamp: timestamp,
      harborZoneId: harborZoneId,
      harborZoneName: harborZoneName,
      currentDistance: currentDistance,
      zoneRadius: zoneRadius,
      violationLocation: violationLocation,
      vesselName: vesselName,
      alertType: alertType,
      isRead: isRead ?? this.isRead,
    );
  }
}