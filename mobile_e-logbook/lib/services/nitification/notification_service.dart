import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class NotificationService {
  static const String _registrationReadKey = 'registration_read_';
  static const String _systemReadKey = 'system_read_';
  static const String _tripNotificationsKey = 'trip_notifications';

  // Mark registration notification as read
  static Future<void> markRegistrationAsRead(String registrationId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_registrationReadKey$registrationId', true);
  }

  // Mark system notification as read
  static Future<void> markSystemAsRead(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_systemReadKey$notificationId', true);
  }

  // Check if registration notification is read
  static Future<bool> isRegistrationRead(String registrationId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('$_registrationReadKey$registrationId') ?? false;
  }

  // Check if system notification is read
  static Future<bool> isSystemRead(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('$_systemReadKey$notificationId') ?? false;
  }

  // Get unread registration count
  static Future<int> getUnreadRegistrationCount(List<String> registrationIds) async {
    int count = 0;
    for (String id in registrationIds) {
      if (!(await isRegistrationRead(id))) {
        count++;
      }
    }
    return count;
  }

  // Get unread system count
  static Future<int> getUnreadSystemCount(List<String> systemIds) async {
    int count = 0;
    for (String id in systemIds) {
      if (!(await isSystemRead(id))) {
        count++;
      }
    }
    return count;
  }

  // ==================== TRIP NOTIFICATIONS ====================

  static Future<void> addTripNotification({
    required String tripId,
    required String vesselName,
    required DateTime departureTime,
    required String message,
    String type = 'trip_active',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final notifications = await getTripNotifications();

    notifications.insert(0, {
      'id': 'trip_$tripId',
      'tripId': tripId,
      'vesselName': vesselName,
      'departureTime': departureTime.toIso8601String(),
      'message': message,
      'type': type,
      'timestamp': DateTime.now().toIso8601String(),
      'read': false,
    });

    await prefs.setString(_tripNotificationsKey, jsonEncode(notifications));
  }

  static Future<List<Map<String, dynamic>>> getTripNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_tripNotificationsKey);
    if (data == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(data));
  }

  static Future<void> markTripNotificationAsRead(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    final notifications = await getTripNotifications();

    for (var notif in notifications) {
      if (notif['id'] == notificationId) {
        notif['read'] = true;
        break;
      }
    }

    await prefs.setString(_tripNotificationsKey, jsonEncode(notifications));
  }

  static Future<int> getUnreadTripCount() async {
    final notifications = await getTripNotifications();
    return notifications.where((n) => n['read'] == false).length;
  }
}