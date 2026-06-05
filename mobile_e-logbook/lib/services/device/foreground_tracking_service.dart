import 'dart:async';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';

class ForegroundTrackingService {
  static bool _isRunning = false;

  static void initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'tracking_channel',
        channelName: 'GPS Tracking',
        channelDescription: 'Tracking lokasi kapal sedang berjalan',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(5000),
        autoRunOnBoot: false,
        autoRunOnMyPackageReplaced: false,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );
  }

  static Future<bool> startService({
    required String vesselName,
    required String harborName,
  }) async {
    if (_isRunning) {
      print('⚠️ [Foreground] Service already running');
      return true;
    }

    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied || 
        permission == LocationPermission.deniedForever) {
      print('❌ [Foreground] Location permission denied');
      return false;
    }

    try {
      await FlutterForegroundTask.startService(
        serviceId: 256,
        notificationTitle: '🚢 Tracking Aktif',
        notificationText: '$vesselName - $harborName',
        callback: startCallback,
      );

      _isRunning = true;
      print('✅ [Foreground] Service started for $vesselName');
      return true;
    } catch (e) {
      print('❌ [Foreground] Failed to start service: $e');
      return false;
    }
  }

  static Future<bool> stopService() async {
    if (!_isRunning) {
      print('⚠️ [Foreground] Service not running');
      return true;
    }

    try {
      await FlutterForegroundTask.stopService();
      _isRunning = false;
      print('🛑 [Foreground] Service stopped');
      return true;
    } catch (e) {
      print('❌ [Foreground] Failed to stop service: $e');
      return false;
    }
  }

  static Future<void> updateNotification({
    required String title,
    required String text,
  }) async {
    if (!_isRunning) return;

    await FlutterForegroundTask.updateService(
      notificationTitle: title,
      notificationText: text,
    );
  }

  static bool get isRunning => _isRunning;
}

@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(TrackingTaskHandler());
}

class TrackingTaskHandler extends TaskHandler {
  int _updateCount = 0;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    print('🚀 [Foreground] Task started at $timestamp');
  }

  @override
  void onRepeatEvent(DateTime timestamp) {
    _updateCount++;
    
    if (_updateCount % 6 == 0) {
      FlutterForegroundTask.updateService(
        notificationTitle: '🚢 Tracking Aktif',
        notificationText: 'Update #$_updateCount - ${timestamp.hour}:${timestamp.minute}',
      );
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    print('🛑 [Foreground] Task destroyed at $timestamp');
  }

  @override
  void onNotificationButtonPressed(String id) {
    print('🔘 [Foreground] Button pressed: $id');
  }

  @override
  void onNotificationPressed() {
    print('🔔 [Foreground] Notification pressed');
    FlutterForegroundTask.launchApp('/');
  }

  @override
  void onNotificationDismissed() {
    print('🔕 [Foreground] Notification dismissed');
  }
}
