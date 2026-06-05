import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:math' show cos, sqrt, asin;

class HarborZone {
  final String id;
  final String name;
  final String province;
  final LatLng centerPoint;
  final double radiusKm;
  final String harborType;
  final String description;
  final List<String> allowedFishTypes;

  const HarborZone({
    required this.id,
    required this.name,
    required this.province,
    required this.centerPoint,
    required this.radiusKm,
    required this.harborType,
    required this.description,
    required this.allowedFishTypes,
  });

  /// Nama lengkap pelabuhan (untuk display)
  String get fullName => name;

  /// Hitung jarak dari koordinat ke pusat pelabuhan (dalam km)
  double getDistanceFromCenter(double lat, double lng) {
    return _calculateDistance(
      centerPoint.latitude,
      centerPoint.longitude,
      lat,
      lng,
    );
  }

  /// Cek apakah lokasi berada dalam zona pelabuhan
  bool isLocationInZone(double lat, double lng) {
    final distance = getDistanceFromCenter(lat, lng);
    return distance <= radiusKm;
  }

  /// Hitung jarak antara dua koordinat menggunakan Haversine formula
  static double _calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) *
            cos(lat2 * p) *
            (1 - cos((lon2 - lon1) * p)) /
            2;

    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  /// Konversi ke Map untuk serialization
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'province': province,
      'latitude': centerPoint.latitude,
      'longitude': centerPoint.longitude,
      'radiusKm': radiusKm,
      'harborType': harborType,
      'description': description,
      'allowedFishTypes': allowedFishTypes,
    };
  }

  /// Buat dari Map
  factory HarborZone.fromJson(Map<String, dynamic> json) {
    return HarborZone(
      id: json['id'],
      name: json['name'],
      province: json['province'],
      centerPoint: LatLng(json['latitude'], json['longitude']),
      radiusKm: json['radiusKm'].toDouble(),
      harborType: json['harborType'],
      description: json['description'],
      allowedFishTypes: List<String>.from(json['allowedFishTypes']),
    );
  }

  @override
  String toString() {
    return 'HarborZone(name: $name, province: $province, radius: ${radiusKm}km)';
  }
}