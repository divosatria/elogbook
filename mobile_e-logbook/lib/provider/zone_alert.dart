import 'package:e_logbook/models/zone_alert.dart';
import 'package:flutter/foundation.dart';

class ZoneAlertProvider with ChangeNotifier {
  final List<ZoneAlert> _alerts = [];

  List<ZoneAlert> get alerts => [..._alerts];
  
  List<ZoneAlert> get unreadAlerts => 
      _alerts.where((alert) => !alert.isRead).toList();
  
  int get unreadCount => unreadAlerts.length;
  
  bool get hasUnreadAlerts => unreadCount > 0;

  /// Tambah alert baru
  void addAlert(ZoneAlert alert) {
    _alerts.insert(0, alert); // Insert di awal list
    notifyListeners();
  }

  /// Tandai alert sebagai sudah dibaca
  void markAsRead(String alertId) {
    final index = _alerts.indexWhere((a) => a.id == alertId);
    if (index != -1) {
      _alerts[index] = _alerts[index].copyWith(isRead: true);
      notifyListeners();
    }
  }

  /// Tandai semua alert sebagai sudah dibaca
  void markAllAsRead() {
    for (int i = 0; i < _alerts.length; i++) {
      _alerts[i] = _alerts[i].copyWith(isRead: true);
    }
    notifyListeners();
  }

  /// Hapus alert
  void removeAlert(String alertId) {
    _alerts.removeWhere((a) => a.id == alertId);
    notifyListeners();
  }

  /// Hapus semua alert
  void clearAllAlerts() {
    _alerts.clear();
    notifyListeners();
  }

  /// Hapus alert yang sudah dibaca
  void clearReadAlerts() {
    _alerts.removeWhere((a) => a.isRead);
    notifyListeners();
  }

  /// Get alert berdasarkan tipe
  List<ZoneAlert> getAlertsByType(String type) {
    return _alerts.where((a) => a.alertType == type).toList();
  }

  /// Get alert berdasarkan kapal
  List<ZoneAlert> getAlertsByVessel(String vesselName) {
    return _alerts.where((a) => a.vesselName == vesselName).toList();
  }

  /// Get alert dalam rentang waktu
  List<ZoneAlert> getAlertsByDateRange(DateTime start, DateTime end) {
    return _alerts.where((a) {
      return a.timestamp.isAfter(start) && a.timestamp.isBefore(end);
    }).toList();
  }

  /// Get alert hari ini
  List<ZoneAlert> getTodayAlerts() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    return getAlertsByDateRange(today, tomorrow);
  }

  /// Get statistik alert
  Map<String, dynamic> getAlertStatistics() {
    return {
      'total': _alerts.length,
      'unread': unreadCount,
      'critical': _alerts.where((a) => a.alertType == 'critical').length,
      'warning': _alerts.where((a) => a.alertType == 'warning').length,
      'info': _alerts.where((a) => a.alertType == 'info').length,
      'today': getTodayAlerts().length,
    };
  }

  /// Load alerts dari storage (untuk implementasi persistence)
  Future<void> loadAlerts() async {
    // TODO: Implement loading from local storage atau API
    notifyListeners();
  }

  /// Save alerts ke storage
  Future<void> saveAlerts() async {
    // TODO: Implement saving to local storage atau API
  }
}