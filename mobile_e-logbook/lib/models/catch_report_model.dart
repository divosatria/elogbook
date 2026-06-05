class CatchReportModel {
  final double latitude;
  final double longitude;
  final double depth;
  final String gearStatus;
  final String gearType;
  final int totalCatch;
  final String fishTypes;
  final DateTime timestamp;

  CatchReportModel({
    required this.latitude,
    required this.longitude,
    required this.depth,
    required this.gearStatus,
    required this.gearType,
    required this.totalCatch,
    required this.fishTypes,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'depth': depth,
      'gearStatus': gearStatus,
      'gearType': gearType,
      'totalCatch': totalCatch,
      'fishTypes': fishTypes,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory CatchReportModel.fromJson(Map<String, dynamic> json) {
    return CatchReportModel(
      latitude: json['latitude']?.toDouble() ?? 0.0,
      longitude: json['longitude']?.toDouble() ?? 0.0,
      depth: json['depth']?.toDouble() ?? 0.0,
      gearStatus: json['gearStatus'] ?? '',
      gearType: json['gearType'] ?? '',
      totalCatch: json['totalCatch'] ?? 0,
      fishTypes: json['fishTypes'] ?? '',
      timestamp: json['timestamp'] != null ? DateTime.parse(json['timestamp']) : DateTime.now(),
    );
  }
}
