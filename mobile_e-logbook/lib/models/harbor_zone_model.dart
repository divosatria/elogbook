import 'package:latlong2/latlong.dart';

class HarborZoneModel {
  final int id;
  final String name;
  final String shapeType; // 'circle' or 'polygon'
  final String type; // 'harbor', 'port', 'anchorage', 'conservation', 'restricted'
  final String? description;
  final int? capacity;
  final List<String>? facilities;
  final String color;
  final bool isActive;
  
  // For circle
  final LatLng? centerPoint;
  final double? radiusMeters;
  
  // For polygon
  final List<LatLng>? polygonCoordinates;

  HarborZoneModel({
    required this.id,
    required this.name,
    required this.shapeType,
    required this.type,
    this.description,
    this.capacity,
    this.facilities,
    required this.color,
    required this.isActive,
    this.centerPoint,
    this.radiusMeters,
    this.polygonCoordinates,
  });

  factory HarborZoneModel.fromJson(Map<String, dynamic> json) {
    final shapeType = json['shapeType'] ?? json['shape_type'] ?? 'circle';
    
    LatLng? centerPoint;
    double? radiusMeters;
    List<LatLng>? polygonCoordinates;

    if (shapeType == 'circle') {
      final coords = json['coordinates'];
      if (coords is Map) {
        double lat = (coords['lat'] as num).toDouble();
        double lng = (coords['lng'] as num).toDouble();
        
        // Validasi dan swap jika koordinat terbalik
        if (lat.abs() > 90) {
          print('⚠️ [HarborZone Circle] Swapping coordinates - lat=$lat, lng=$lng');
          final temp = lat;
          lat = lng;
          lng = temp;
          print('✅ [HarborZone Circle] After swap - lat=$lat, lng=$lng');
        }
        
        centerPoint = LatLng(lat, lng);
      }
      radiusMeters = (json['radius'] as num?)?.toDouble();
    } else if (shapeType == 'polygon') {
      final coords = json['coordinates'];
      if (coords is List) {
        polygonCoordinates = coords.map((coord) {
          if (coord is Map) {
            double lat = (coord['lat'] as num).toDouble();
            double lng = (coord['lng'] as num).toDouble();
            
            // Validasi dan swap jika koordinat terbalik
            if (lat.abs() > 90) {
              print('⚠️ [HarborZone Polygon] Swapping coordinates - lat=$lat, lng=$lng');
              final temp = lat;
              lat = lng;
              lng = temp;
              print('✅ [HarborZone Polygon] After swap - lat=$lat, lng=$lng');
            }
            
            return LatLng(lat, lng);
          }
          return LatLng(0, 0);
        }).toList();
      }
    }

    return HarborZoneModel(
      id: json['id'],
      name: json['name'] ?? '',
      shapeType: shapeType,
      type: json['type'] ?? 'harbor',
      description: json['description'],
      capacity: json['capacity'],
      facilities: json['facilities'] != null 
          ? List<String>.from(json['facilities']) 
          : null,
      color: json['color'] ?? '#10b981',
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      centerPoint: centerPoint,
      radiusMeters: radiusMeters,
      polygonCoordinates: polygonCoordinates,
    );
  }

  bool get isCircle => shapeType == 'circle';
  bool get isPolygon => shapeType == 'polygon';
  bool get isRestricted => type == 'restricted';
  bool get isConservation => type == 'conservation';
}
