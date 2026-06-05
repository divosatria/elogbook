import 'package:latlong2/latlong.dart';

class CatchPolygonModel {
  final int id;
  final String name;
  final String description;
  final List<LatLng> coordinates;
  final String zoneType; // fishing, conservation, special
  final List<String> fishTypes;
  final int? maxVessels;
  final String color;
  final Map<String, dynamic>? regulations;
  final Map<String, dynamic>? seasonalRestrictions;
  final bool isActive;

  CatchPolygonModel({
    required this.id,
    required this.name,
    required this.description,
    required this.coordinates,
    required this.zoneType,
    required this.fishTypes,
    this.maxVessels,
    required this.color,
    this.regulations,
    this.seasonalRestrictions,
    required this.isActive,
  });

  factory CatchPolygonModel.fromJson(Map<String, dynamic> json) {
    List<LatLng> parseCoordinates(dynamic coords) {
      if (coords is List) {
        return coords.map((coord) {
          if (coord is Map) {
            return LatLng(
              (coord['lat'] as num).toDouble(),
              (coord['lng'] as num).toDouble(),
            );
          } else if (coord is List && coord.length >= 2) {
            // coord[0] = longitude, coord[1] = latitude (GeoJSON format)
            // But LatLng expects (latitude, longitude)
            return LatLng(
              (coord[1] as num).toDouble(), // latitude
              (coord[0] as num).toDouble(), // longitude
            );
          }
          return LatLng(0, 0);
        }).toList();
      }
      return [];
    }

    return CatchPolygonModel(
      id: json['id'],
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      coordinates: parseCoordinates(json['coordinates']),
      zoneType: json['zoneType'] ?? json['zone_type'] ?? 'fishing',
      fishTypes: (json['fishTypes'] ?? json['fish_types'] ?? []).cast<String>(),
      maxVessels: json['maxVessels'] ?? json['max_vessels'],
      color: json['color'] ?? '#3b82f6',
      regulations: json['regulations'],
      seasonalRestrictions: json['seasonalRestrictions'] ?? json['seasonal_restrictions'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
    );
  }
}
