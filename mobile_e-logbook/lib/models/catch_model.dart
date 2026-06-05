import 'package:flutter/foundation.dart';

class CatchModel {
  final int? id;
  final String fishName;
  final String fishType;
  final double weight;
  final int quantity;
  final String condition;
  final String photoPath;
  final String vesselName;
  final String vesselNumber;
  final String captainName;
  final int crewCount;
  final double pricePerKg;
  final double totalRevenue;
  final DateTime departureDate;
  final String departureTime;
  final DateTime arrivalDate;
  final String arrivalTime;
  final int tripDurationHours;
  final int tripDurationMinutes;
  final String fishingZone;
  final String locationName;
  final double latitude;
  final double longitude;
  final double waterDepth;
  final String weatherCondition;
  final double fuelCost;
  final double operationalCost;
  final double tax;
  final double totalCost;
  final double netProfit;
  final String? notes;
  final String syncStatus;
  final DateTime? lastSyncAttempt;
  final String? syncError;
  final DateTime? catchDate; // tanggal aktual scan tangkapan

  CatchModel({
    this.id,
    required this.fishName,
    required this.fishType,
    required this.weight,
    required this.quantity,
    required this.condition,
    required this.photoPath,
    required this.vesselName,
    required this.vesselNumber,
    required this.captainName,
    required this.crewCount,
    required this.pricePerKg,
    required this.totalRevenue,
    required this.departureDate,
    required this.departureTime,
    required this.arrivalDate,
    required this.arrivalTime,
    required this.tripDurationHours,
    required this.tripDurationMinutes,
    required this.fishingZone,
    required this.locationName,
    required this.latitude,
    required this.longitude,
    required this.waterDepth,
    required this.weatherCondition,
    required this.fuelCost,
    required this.operationalCost,
    required this.tax,
    required this.totalCost,
    required this.netProfit,
    this.notes,
    this.syncStatus = 'synced',
    this.lastSyncAttempt,
    this.syncError,
    this.catchDate,
  });

  factory CatchModel.fromJson(Map<String, dynamic> json) {
    // Validasi field kritis
    if (json['fish_name'] == null || json['fish_name'].toString().trim().isEmpty) {
      throw ArgumentError('Fish name is required');
    }
    
    // weight: pakai mobile_data jika weight=0, fallback ke iot_data
    final weightRaw = double.tryParse(json['weight']?.toString() ?? '0') ?? 0.0;
    final mobileData = double.tryParse(json['mobile_data']?.toString() ?? '0') ?? 0.0;
    final iotData = double.tryParse(json['iot_data']?.toString() ?? '0') ?? 0.0;
    final weight = weightRaw > 0 ? weightRaw : (mobileData > 0 ? mobileData : iotData);
    debugPrint('⚖️ [CatchModel] id=${json['id']} weight=$weightRaw mobile=$mobileData iot=$iotData → final=$weight');
    
    final quantity = int.tryParse(json['quantity']?.toString() ?? '0') ?? 0;
    
    // departure_time: jika 00:00 atau kosong, coba ambil dari catch_date
    String departureTime = json['departure_time']?.toString() ?? '';
    if (departureTime.isEmpty || departureTime == '00:00') {
      final catchDate = json['catch_date']?.toString() ?? '';
      if (catchDate.contains('T')) {
        try {
          final dt = DateTime.parse(catchDate);
          departureTime = '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
        } catch (_) {}
      }
    }
    
    // Parse dates dengan fallback
    DateTime departureDate;
    try {
      departureDate = DateTime.parse(json['departure_date']?.toString() ?? '');
    } catch (e) {
      debugPrint('⚠️ [CatchModel] Error parsing departure_date: ${json['departure_date']}, using now()');
      departureDate = DateTime.now();
    }
    
    DateTime arrivalDate;
    try {
      arrivalDate = DateTime.parse(json['arrival_date']?.toString() ?? '');
    } catch (e) {
      debugPrint('⚠️ [CatchModel] Error parsing arrival_date: ${json['arrival_date']}, using now()');
      arrivalDate = DateTime.now();
    }

    // Parse catch_date (tanggal aktual scan)
    DateTime? catchDate;
    try {
      final raw = json['catch_date']?.toString() ?? json['created_at']?.toString() ?? '';
      if (raw.isNotEmpty) catchDate = DateTime.parse(raw);
    } catch (_) {}
    
    return CatchModel(
      id: json['id'],
      fishName: json['fish_name'].toString().trim(),
      fishType: json['fish_type']?.toString() ?? '',
      weight: weight,
      quantity: quantity,
      condition: json['condition']?.toString() ?? '',
      photoPath: json['photo_path']?.toString() ?? '',
      vesselName: json['vessel_name']?.toString() ?? '',
      vesselNumber: json['vessel_number']?.toString() ?? '',
      captainName: json['captain_name']?.toString() ?? '',
      crewCount: int.tryParse(json['crew_count']?.toString() ?? '0') ?? 0,
      pricePerKg: double.tryParse(json['price_per_kg']?.toString() ?? '0') ?? 0.0,
      totalRevenue: double.tryParse(json['total_revenue']?.toString() ?? '0') ?? 0.0,
      departureDate: departureDate,
      departureTime: departureTime,
      arrivalDate: arrivalDate,
      arrivalTime: json['arrival_time']?.toString() ?? '',
      tripDurationHours: int.tryParse(json['trip_duration_hours']?.toString() ?? '0') ?? 0,
      tripDurationMinutes: int.tryParse(json['trip_duration_minutes']?.toString() ?? '0') ?? 0,
      fishingZone: json['fishing_zone']?.toString() ?? '',
      locationName: json['location_name']?.toString() ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      waterDepth: double.tryParse(json['water_depth']?.toString() ?? '0') ?? 0.0,
      weatherCondition: json['weather_condition']?.toString() ?? '',
      fuelCost: double.tryParse(json['fuel_cost']?.toString() ?? '0') ?? 0.0,
      operationalCost: double.tryParse(json['operational_cost']?.toString() ?? '0') ?? 0.0,
      tax: double.tryParse(json['tax']?.toString() ?? '0') ?? 0.0,
      totalCost: double.tryParse(json['total_cost']?.toString() ?? '0') ?? 0.0,
      netProfit: double.tryParse(json['net_profit']?.toString() ?? '0') ?? 0.0,
      notes: json['notes']?.toString(),
      syncStatus: json['sync_status']?.toString() ?? 'synced',
      catchDate: catchDate,
    );
  }

  // Grouping pakai departure_date karena backend belum kirim catch_date
  DateTime get displayDate => departureDate;

  Map<String, dynamic> toJson() {
    return {
      'fish_name': fishName,
      'fish_type': fishType,
      'weight': weight,
      'quantity': quantity,
      'condition': condition,
      'photo_path': photoPath,
      'vessel_name': vesselName,
      'vessel_number': vesselNumber,
      'captain_name': captainName,
      'crew_count': crewCount,
      'price_per_kg': pricePerKg,
      'total_revenue': totalRevenue,
      'departure_date': departureDate.toIso8601String(),
      'departure_time': departureTime,
      'arrival_date': arrivalDate.toIso8601String(),
      'arrival_time': arrivalTime,
      'trip_duration_hours': tripDurationHours,
      'trip_duration_minutes': tripDurationMinutes,
      'fishing_zone': fishingZone,
      'location_name': locationName,
      'latitude': latitude,
      'longitude': longitude,
      'water_depth': waterDepth,
      'weather_condition': weatherCondition,
      'fuel_cost': fuelCost,
      'operational_cost': operationalCost,
      'tax': tax,
      'total_cost': totalCost,
      'net_profit': netProfit,
      'fishing_gear': 'Jaring', // Default value
      'notes': notes ?? '',
    };
  }
}