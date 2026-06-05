import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ZoneViolationLogger {
  static const String _violationsKey = 'zone_violations';

  /// Log pelanggaran zona
  static Future<void> logViolation({
    required int tripId,
    required String vesselName,
    required String nahkodaName,
    required double latitude,
    required double longitude,
    required String violationType, // 'out_of_catch_zone', 'restricted_zone', 'unauthorized_zone'
    required String zoneName,
    required String message,
    String? severity,
  }) async {
    try {
      final violation = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'tripId': tripId,
        'vesselName': vesselName,
        'nahkodaName': nahkodaName,
        'latitude': latitude,
        'longitude': longitude,
        'violationType': violationType,
        'zoneName': zoneName,
        'message': message,
        'severity': severity ?? 'warning',
        'timestamp': DateTime.now().toIso8601String(),
        'isResolved': false,
      };

      final prefs = await SharedPreferences.getInstance();
      final violations = await getAllViolations();
      violations.add(violation);

      await prefs.setString(_violationsKey, json.encode(violations));
      
      print('🚨 VIOLATION LOGGED: $violationType at ${zoneName}');
      print('   Trip: $tripId | Vessel: $vesselName | Nahkoda: $nahkodaName');
      print('   Location: $latitude, $longitude');
    } catch (e) {
      print('❌ Error logging violation: $e');
    }
  }

  /// Get semua pelanggaran
  static Future<List<Map<String, dynamic>>> getAllViolations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? violationsJson = prefs.getString(_violationsKey);
      
      if (violationsJson == null) return [];
      
      final List<dynamic> violationsList = json.decode(violationsJson);
      return violationsList.cast<Map<String, dynamic>>();
    } catch (e) {
      print('❌ Error getting violations: $e');
      return [];
    }
  }

  /// Get pelanggaran untuk trip tertentu
  static Future<List<Map<String, dynamic>>> getViolationsByTrip(int tripId) async {
    final violations = await getAllViolations();
    return violations.where((v) => v['tripId'] == tripId).toList();
  }

  /// Get pelanggaran yang belum resolved
  static Future<List<Map<String, dynamic>>> getUnresolvedViolations() async {
    final violations = await getAllViolations();
    return violations.where((v) => v['isResolved'] == false).toList();
  }

  /// Mark violation as resolved
  static Future<void> resolveViolation(String violationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final violations = await getAllViolations();
      
      final index = violations.indexWhere((v) => v['id'] == violationId);
      if (index != -1) {
        violations[index]['isResolved'] = true;
        violations[index]['resolvedAt'] = DateTime.now().toIso8601String();
        await prefs.setString(_violationsKey, json.encode(violations));
      }
    } catch (e) {
      print('❌ Error resolving violation: $e');
    }
  }

  /// Get violation count untuk trip
  static Future<int> getViolationCount(int tripId) async {
    final violations = await getViolationsByTrip(tripId);
    return violations.length;
  }

  /// Clear old violations (older than 30 days)
  static Future<void> clearOldViolations() async {
    try {
      final violations = await getAllViolations();
      final cutoffDate = DateTime.now().subtract(const Duration(days: 30));
      
      final recentViolations = violations.where((v) {
        final timestamp = DateTime.parse(v['timestamp']);
        return timestamp.isAfter(cutoffDate);
      }).toList();

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_violationsKey, json.encode(recentViolations));
      
      print('✅ Cleared ${violations.length - recentViolations.length} old violations');
    } catch (e) {
      print('❌ Error clearing old violations: $e');
    }
  }
}
