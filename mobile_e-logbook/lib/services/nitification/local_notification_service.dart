import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class LocalNotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(settings);
    
    // Request permissions
    await requestPermissions();
    
    _initialized = true;
  }

  /// Request notification permissions (Android 13+ & iOS)
  static Future<bool> requestPermissions() async {
    // Android 13+ permission
    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      final granted = await androidPlugin.requestNotificationsPermission();
      print('Android notification permission: ${granted ?? false}');
    }

    // iOS permission
    final iosPlugin = _notifications.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    
    if (iosPlugin != null) {
      final granted = await iosPlugin.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      print('iOS notification permission: ${granted ?? false}');
      return granted ?? false;
    }

    return true;
  }

  static Future<void> showTripApprovedNotification({
    required String vesselName,
    required DateTime departureTime,
  }) async {
    await initialize();

    final duration = departureTime.difference(DateTime.now());
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);

    String timeText;
    if (hours > 24) {
      final days = duration.inDays;
      timeText = '$days hari lagi';
    } else if (hours > 0) {
      timeText = '$hours jam $minutes menit lagi';
    } else {
      timeText = '$minutes menit lagi';
    }

    const androidDetails = AndroidNotificationDetails(
      'trip_approval',
      'Trip Approval',
      channelDescription: 'Notifikasi persetujuan trip',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      0,
      '✅ Trip Aktif!',
      'Kapal $vesselName akan berangkat $timeText. Bersiaplah!',
      details,
    );
  }

  static Future<void> showTripStartingSoonNotification({
    required String vesselName,
    required int minutesLeft,
  }) async {
    await initialize();

    // Format waktu yang lebih friendly
    String timeText;
    if (minutesLeft >= 1440) {
      final days = (minutesLeft / 1440).floor();
      timeText = '$days hari';
    } else if (minutesLeft >= 60) {
      final hours = (minutesLeft / 60).floor();
      timeText = '$hours jam';
    } else {
      timeText = '$minutesLeft menit';
    }

    const androidDetails = AndroidNotificationDetails(
      'trip_starting',
      'Trip Starting',
      channelDescription: 'Notifikasi trip akan dimulai',
      importance: Importance.max,
      priority: Priority.max,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      1,
      '⏰ Persiapan Trip',
      'Kapal $vesselName akan berangkat dalam $timeText. Lakukan persiapan sekarang!',
      details,
      payload: 'check_weather_waiting', // Payload untuk trigger weather check
    );
  }

  static Future<void> showTripStartingNowNotification({
    required String vesselName,
  }) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'trip_start_now',
      'Trip Start Now',
      channelDescription: 'Notifikasi trip dimulai sekarang',
      importance: Importance.max,
      priority: Priority.max,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      2,
      '🚢 Waktunya Berangkat!',
      'Kapal $vesselName siap berangkat. Tap untuk memulai tracking.',
      details,
      payload: 'start_tracking',
    );
  }

  static Future<void> showNewTaskNotification({
    required String title,
    required String message,
  }) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'new_task',
      'New Task',
      channelDescription: 'Notifikasi tugas trip baru',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      3,
      title,
      message,
      details,
    );
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'trip_notifications',
      'Trip Notifications',
      channelDescription: 'Notifikasi jadwal dan reminder trip',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      id,
      title,
      body,
      details,
      payload: payload,
    );
  }
}
