import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../models/catch_polygon_model.dart';
import '../api/zone_service.dart';

class ZoneValidationService {
  /// Validasi apakah posisi kapal dalam zona tangkap yang diizinkan
  static Future<ZoneValidationResult> validateCatchZone({
    required double latitude,
    required double longitude,
    required String tripAreaName,
  }) async {
    try {
      // Get zona tangkap untuk trip ini
      final catchZones = await ZoneService.getCatchPolygonsByNames(tripAreaName);
      
      if (catchZones.isEmpty) {
        return ZoneValidationResult(
          isValid: false,
          isInCatchZone: false,
          message: 'Zona tangkap tidak ditemukan untuk trip ini',
          severity: 'warning',
        );
      }

      // Cek apakah posisi dalam salah satu zona tangkap
      for (var zone in catchZones) {
        if (_isPointInPolygon(latitude, longitude, zone.coordinates)) {
          return ZoneValidationResult(
            isValid: true,
            isInCatchZone: true,
            zoneName: zone.name,
            zoneType: zone.zoneType,
            message: 'Kapal berada di zona tangkap yang benar: ${zone.name}',
            severity: 'success',
          );
        }
      }

      // Jika tidak dalam zona, hitung jarak ke zona terdekat
      final nearestZone = _findNearestZone(latitude, longitude, catchZones);
      final distance = _calculateDistanceToZone(latitude, longitude, nearestZone);

      return ZoneValidationResult(
        isValid: false,
        isInCatchZone: false,
        zoneName: nearestZone.name,
        distance: distance,
        message: 'PERINGATAN: Kapal di luar zona tangkap! Jarak ke ${nearestZone.name}: ${distance.toStringAsFixed(2)} km',
        severity: 'error',
      );
    } catch (e) {
      print('❌ Error validating catch zone: $e');
      return ZoneValidationResult(
        isValid: false,
        isInCatchZone: false,
        message: 'Error validasi zona: $e',
        severity: 'error',
      );
    }
  }

  /// Validasi apakah kapal dalam zona terlarang
  static Future<RestrictedZoneCheck> checkRestrictedZones({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final restrictedZones = await ZoneService.getRestrictedZones();
      
      for (var zone in restrictedZones) {
        bool isInZone = false;
        
        if (zone.isCircle && zone.centerPoint != null && zone.radiusMeters != null) {
          final distance = Geolocator.distanceBetween(
            latitude,
            longitude,
            zone.centerPoint!.latitude,
            zone.centerPoint!.longitude,
          );
          isInZone = distance <= zone.radiusMeters!;
        } else if (zone.isPolygon && zone.polygonCoordinates != null) {
          isInZone = _isPointInPolygon(latitude, longitude, zone.polygonCoordinates!);
        }

        if (isInZone) {
          return RestrictedZoneCheck(
            isInRestrictedZone: true,
            zoneName: zone.name,
            zoneType: zone.type,
            message: '🚨 BAHAYA! Kapal memasuki zona terlarang: ${zone.name}',
            severity: 'critical',
          );
        }
      }

      return RestrictedZoneCheck(
        isInRestrictedZone: false,
        message: 'Kapal tidak dalam zona terlarang',
        severity: 'success',
      );
    } catch (e) {
      print('❌ Error checking restricted zones: $e');
      return RestrictedZoneCheck(
        isInRestrictedZone: false,
        message: 'Error cek zona terlarang: $e',
        severity: 'error',
      );
    }
  }

  /// Validasi lengkap (catch zone + restricted zone)
  static Future<CompleteValidation> validatePosition({
    required double latitude,
    required double longitude,
    required String tripAreaName,
  }) async {
    final catchValidation = await validateCatchZone(
      latitude: latitude,
      longitude: longitude,
      tripAreaName: tripAreaName,
    );

    final restrictedCheck = await checkRestrictedZones(
      latitude: latitude,
      longitude: longitude,
    );

    return CompleteValidation(
      catchZoneValidation: catchValidation,
      restrictedZoneCheck: restrictedCheck,
      timestamp: DateTime.now(),
    );
  }

  /// Check if point is inside polygon (Ray Casting Algorithm)
  static bool _isPointInPolygon(double lat, double lng, List<LatLng> polygon) {
    if (polygon.length < 3) return false;

    bool inside = false;
    int j = polygon.length - 1;

    for (int i = 0; i < polygon.length; i++) {
      if ((polygon[i].latitude > lat) != (polygon[j].latitude > lat) &&
          lng < (polygon[j].longitude - polygon[i].longitude) * 
                (lat - polygon[i].latitude) / 
                (polygon[j].latitude - polygon[i].latitude) + 
                polygon[i].longitude) {
        inside = !inside;
      }
      j = i;
    }

    return inside;
  }

  /// Find nearest zone
  static CatchPolygonModel _findNearestZone(
    double lat,
    double lng,
    List<CatchPolygonModel> zones,
  ) {
    CatchPolygonModel nearest = zones[0];
    double minDistance = _calculateDistanceToZone(lat, lng, zones[0]);

    for (var zone in zones.skip(1)) {
      final distance = _calculateDistanceToZone(lat, lng, zone);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = zone;
      }
    }

    return nearest;
  }

  /// Calculate distance to zone (to nearest point)
  static double _calculateDistanceToZone(
    double lat,
    double lng,
    CatchPolygonModel zone,
  ) {
    double minDistance = double.infinity;

    for (var point in zone.coordinates) {
      final distance = Geolocator.distanceBetween(
        lat,
        lng,
        point.latitude,
        point.longitude,
      );
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance / 1000; // Convert to km
  }
}

/// Result model untuk validasi zona tangkap
class ZoneValidationResult {
  final bool isValid;
  final bool isInCatchZone;
  final String? zoneName;
  final String? zoneType;
  final double? distance;
  final String message;
  final String severity; // 'success', 'warning', 'error'

  ZoneValidationResult({
    required this.isValid,
    required this.isInCatchZone,
    this.zoneName,
    this.zoneType,
    this.distance,
    required this.message,
    required this.severity,
  });
}

/// Result model untuk cek zona terlarang
class RestrictedZoneCheck {
  final bool isInRestrictedZone;
  final String? zoneName;
  final String? zoneType;
  final String message;
  final String severity; // 'success', 'critical', 'error'

  RestrictedZoneCheck({
    required this.isInRestrictedZone,
    this.zoneName,
    this.zoneType,
    required this.message,
    required this.severity,
  });
}

/// Complete validation result
class CompleteValidation {
  final ZoneValidationResult catchZoneValidation;
  final RestrictedZoneCheck restrictedZoneCheck;
  final DateTime timestamp;

  CompleteValidation({
    required this.catchZoneValidation,
    required this.restrictedZoneCheck,
    required this.timestamp,
  });

  bool get isAllValid => 
      catchZoneValidation.isInCatchZone && 
      !restrictedZoneCheck.isInRestrictedZone;

  bool get hasCriticalIssue => restrictedZoneCheck.isInRestrictedZone;

  String get summaryMessage {
    if (hasCriticalIssue) {
      return restrictedZoneCheck.message;
    }
    if (!catchZoneValidation.isInCatchZone) {
      return catchZoneValidation.message;
    }
    return 'Posisi kapal valid ✓';
  }
}
