import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../api/trip_service.dart';
import '../nitification/notification_service.dart';
import '../nitification/local_notification_service.dart';

class ScheduleMonitoringService {
  static const String _lastCheckedTripsKey = 'last_checked_trips';

  /// Check for new schedules and send notifications
  static Future<void> checkForNewSchedules() async {
    try {
      print('🔍 [ScheduleMonitor] Checking for new schedules...');
      
      final prefs = await SharedPreferences.getInstance();
      final userRole = prefs.getString('role')?.toLowerCase();
      final vesselDataString = prefs.getString('vessel_data');
      
      if (vesselDataString == null) {
        print('⚠️ [ScheduleMonitor] No vessel data found');
        return;
      }
      
      final vesselData = json.decode(vesselDataString);
      final userKapalId = vesselData['kapal']?['id'];
      
      // Get current trips
      final response = await TripService.getAllTrips();
      if (response['success'] != true || response['data'] == null) {
        print('❌ [ScheduleMonitor] Failed to get trips');
        return;
      }
      
      final allTrips = List<Map<String, dynamic>>.from(response['data']);
      
      // Filter trips for this vessel
      final myTrips = allTrips.where((trip) {
        final tripKapalId = trip['kapal']?['id'];
        return userKapalId == null || tripKapalId == userKapalId;
      }).toList();
      
      // Get last checked trip IDs
      final lastCheckedIds = await _getLastCheckedTripIds();
      
      // Find new trips
      final newTrips = myTrips.where((trip) {
        final tripId = trip['id'].toString();
        final status = trip['status']?.toLowerCase();
        // Only notify for 'disetujui' status (new schedule assigned)
        return !lastCheckedIds.contains(tripId) && status == 'disetujui';
      }).toList();
      
      print('📊 [ScheduleMonitor] Found ${newTrips.length} new schedules');
      
      // Send notifications for new trips
      for (var trip in newTrips) {
        await _sendNewScheduleNotification(trip, userRole ?? 'crew');
      }
      
      // Update last checked trip IDs
      final currentTripIds = myTrips.map((t) => t['id'].toString()).toList();
      await _saveLastCheckedTripIds(currentTripIds);
      
    } catch (e) {
      print('❌ [ScheduleMonitor] Error: $e');
    }
  }

  static Future<void> _sendNewScheduleNotification(Map<String, dynamic> trip, String userRole) async {
    try {
      final kapal = trip['kapal'] ?? {};
      final vesselName = kapal['namaKapal'] ?? 'Kapal';
      
      DateTime departureTime = DateTime.now();
      if (trip['tanggalBerangkat'] != null) {
        departureTime = DateTime.parse(trip['tanggalBerangkat']);
      }
      
      final duration = departureTime.difference(DateTime.now());
      String timeText;
      if (duration.inDays > 0) {
        timeText = '${duration.inDays} hari lagi';
      } else if (duration.inHours > 0) {
        timeText = '${duration.inHours} jam lagi';
      } else {
        timeText = '${duration.inMinutes} menit lagi';
      }
      
      final roleText = userRole == 'nahkoda' ? 'Nahkoda' : 'ABK';
      
      // Save to notification history
      await NotificationService.addTripNotification(
        tripId: trip['id'].toString(),
        vesselName: vesselName,
        departureTime: departureTime,
        message: 'Anda ditugaskan sebagai $roleText di Kapal $vesselName. Berangkat $timeText.',
        type: 'new_schedule',
      );
      
      // Show local notification
      await LocalNotificationService.showNotification(
        id: trip['id'],
        title: '📅 Jadwal Trip Baru!',
        body: 'Anda ditugaskan sebagai $roleText di Kapal $vesselName. Berangkat $timeText.',
        payload: 'new_schedule_${trip['id']}',
      );
      
      print('📬 [ScheduleMonitor] New schedule notification sent for trip ${trip['id']}');
    } catch (e) {
      print('❌ [ScheduleMonitor] Error sending notification: $e');
    }
  }

  static Future<List<String>> _getLastCheckedTripIds() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_lastCheckedTripsKey);
    if (data == null) return [];
    return List<String>.from(json.decode(data));
  }

  static Future<void> _saveLastCheckedTripIds(List<String> tripIds) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastCheckedTripsKey, json.encode(tripIds));
  }

  /// Initialize monitoring - call this when app starts
  static Future<void> initialize() async {
    print('🚀 [ScheduleMonitor] Initializing...');
    await checkForNewSchedules();
  }
}
