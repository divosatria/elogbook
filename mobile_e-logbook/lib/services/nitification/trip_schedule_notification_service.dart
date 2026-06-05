import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../nitification/local_notification_service.dart';
import '../../models/trip_model.dart';

class TripScheduleNotificationService {
  static Timer? _schedulerTimer;
  static const String _processedNotificationsKey = 'processed_trip_notifications';

  /// Start monitoring trip schedules
  static Future<void> startScheduleMonitoring(List<TripModel> trips) async {
    _schedulerTimer?.cancel();
    
    _schedulerTimer = Timer.periodic(const Duration(minutes: 1), (timer) async {
      await _checkUpcomingTrips(trips);
    });
    
    print('✅ Trip schedule monitoring started');
  }

  /// Stop monitoring
  static void stopScheduleMonitoring() {
    _schedulerTimer?.cancel();
    print('⏹️ Trip schedule monitoring stopped');
  }

  /// Check upcoming trips and send notifications
  static Future<void> _checkUpcomingTrips(List<TripModel> trips) async {
    final now = DateTime.now();
    
    for (var trip in trips) {
      // Skip if trip already started or completed
      if (trip.status != 'menunggu_jadwal' && trip.status != 'disetujui') {
        continue;
      }

      final departureTime = trip.tanggalBerangkat;
      final timeDiff = departureTime.difference(now);

      // Notifikasi 2 jam sebelum keberangkatan (untuk nahkoda & crew)
      if (timeDiff.inMinutes <= 120 && timeDiff.inMinutes > 119) {
        await _send2HourReminderNotification(trip);
      }

      // Notifikasi saat waktu keberangkatan (untuk nahkoda & crew)
      if (timeDiff.inMinutes <= 0 && timeDiff.inMinutes > -1) {
        await _sendDepartureNotification(trip);
      }
    }
  }

  /// Send 2-hour reminder notification
  static Future<void> _send2HourReminderNotification(TripModel trip) async {
    final notificationId = 'trip_${trip.id}_2hour';
    
    if (await _isNotificationProcessed(notificationId)) {
      return; // Already sent
    }

    // Notifikasi untuk Nahkoda (bisa 1 hari sebelum)
    await LocalNotificationService.showNotification(
      id: trip.id * 100 + 1,
      title: '⏰ Persiapan Keberangkatan',
      body: '2 jam lagi trip "${trip.taskTitle}" akan dimulai. Pastikan semua persiapan sudah lengkap!',
      payload: 'trip_reminder_${trip.id}',
    );

    // Crew TIDAK menerima notifikasi 2 jam sebelum - hanya saat berlayar
    print('📢 2-hour reminder sent for nahkoda only - trip ${trip.id}');
    
    await _markNotificationAsProcessed(notificationId);
  }

  /// Send departure notification
  static Future<void> _sendDepartureNotification(TripModel trip) async {
    final notificationId = 'trip_${trip.id}_departure';
    
    if (await _isNotificationProcessed(notificationId)) {
      return; // Already sent
    }

    // Notifikasi untuk Nahkoda
    await LocalNotificationService.showNotification(
      id: trip.id * 100 + 2,
      title: '🚢 Waktu Keberangkatan!',
      body: 'Trip "${trip.taskTitle}" dimulai sekarang! Mulai tracking dan pastikan semua crew sudah siap.',
      payload: 'trip_departure_${trip.id}',
    );

    // Crew TIDAK menerima notifikasi saat departure - hanya saat status berlayar
    print('📢 Departure notification sent for nahkoda only - trip ${trip.id}');
    
    await _markNotificationAsProcessed(notificationId);
  }
  
  /// Send berlayar notification (khusus untuk crew)
  static Future<void> sendBerlayarNotification({
    required TripModel trip,
    required List<int> crewIds,
  }) async {
    final notificationId = 'trip_${trip.id}_berlayar';
    
    if (await _isNotificationProcessed(notificationId)) {
      return; // Already sent
    }
    
    // Notifikasi untuk setiap Crew saat status berlayar
    for (int i = 0; i < crewIds.length; i++) {
      await LocalNotificationService.showNotification(
        id: trip.id * 100 + 50 + i,
        title: '🚢 Trip Sudah Berlayar!',
        body: 'Trip "${trip.taskTitle}" sudah berlayar. Tracking sekarang aktif!',
        payload: 'trip_berlayar_crew_${trip.id}',
      );
    }
    
    await _markNotificationAsProcessed(notificationId);
    print('📢 Berlayar notification sent to ${crewIds.length} crew members - trip ${trip.id}');
  }

  /// Send new trip assignment notification (untuk nahkoda & crew)
  static Future<void> sendNewTripNotification({
    required TripModel trip,
    required int userId,
    required String userRole, // 'nahkoda' or 'crew'
  }) async {
    final isNahkoda = userRole.toLowerCase() == 'nahkoda';
    final isCrew = userRole.toLowerCase() == 'crew' || userRole.toLowerCase() == 'abk';
    
    // Crew hanya menerima notifikasi saat status berlayar
    if (isCrew && trip.status.toLowerCase() != 'berlayar') {
      print('⏭️ Skipping notification for crew $userId - trip not berlayar yet');
      return;
    }
    
    await LocalNotificationService.showNotification(
      id: trip.id * 1000 + userId,
      title: isNahkoda ? '📋 Jadwal Trip Baru' : '🎣 Trip Sudah Berlayar',
      body: isNahkoda
          ? 'Anda ditugaskan sebagai nahkoda untuk trip "${trip.taskTitle}". Berangkat: ${_formatDate(trip.tanggalBerangkat)}'
          : 'Trip "${trip.taskTitle}" sudah berlayar. Tracking sekarang aktif!',
      payload: 'new_trip_${trip.id}_${userId}',
    );

    print('📢 New trip notification sent to user $userId (${userRole})');
  }

  /// Check if notification already processed
  static Future<bool> _isNotificationProcessed(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    final processed = prefs.getStringList(_processedNotificationsKey) ?? [];
    return processed.contains(notificationId);
  }

  /// Mark notification as processed
  static Future<void> _markNotificationAsProcessed(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    final processed = prefs.getStringList(_processedNotificationsKey) ?? [];
    processed.add(notificationId);
    await prefs.setStringList(_processedNotificationsKey, processed);
  }

  /// Clear old processed notifications (older than 7 days)
  static Future<void> clearOldProcessedNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_processedNotificationsKey);
    print('✅ Cleared old processed notifications');
  }

  /// Format date for display
  static String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${date.day} ${months[date.month - 1]} ${date.year}, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
