import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

class TrackingMinimizeProvider extends ChangeNotifier {
  bool _isMinimized = false;
  bool _isTrackingActive = false;
  Map<String, dynamic>? _trackingData;
  Position? _currentPosition;
  bool _isViolating = false;
  String _zoneStatus = 'unknown';
  GlobalKey<NavigatorState>? _navigatorKey;
  
  // UI State
  bool _showCompass = false;
  bool _showSpeedometer = false;

  bool get isMinimized => _isMinimized;
  bool get isTrackingActive => _isTrackingActive;
  bool get isTracking => _isTrackingActive; // Alias untuk konsistensi
  Map<String, dynamic>? get trackingData => _trackingData;
  Position? get currentPosition => _currentPosition;
  bool get isViolating => _isViolating;
  String get zoneStatus => _zoneStatus;
  GlobalKey<NavigatorState>? get navigatorKey => _navigatorKey;
  bool get showCompass => _showCompass;
  bool get showSpeedometer => _showSpeedometer;

  void setNavigatorKey(GlobalKey<NavigatorState> key) {
    _navigatorKey = key;
  }
  
  void toggleCompass(bool value) {
    _showCompass = value;
    notifyListeners();
  }
  
  void toggleSpeedometer(bool value) {
    _showSpeedometer = value;
    notifyListeners();
  }

  void minimize() {
    print('📦 [Provider] minimize() called');
    print('📦 [Provider]   - Before: isMinimized=$_isMinimized');
    _isMinimized = true;
    print('📦 [Provider]   - After: isMinimized=$_isMinimized');
    print('📦 [Provider]   - Calling notifyListeners()');
    notifyListeners();
    print('📦 [Provider]   - notifyListeners() completed');
  }

  void maximize() {
    print('📦 [Provider] maximize() called');
    print('📦 [Provider]   - Before: isMinimized=$_isMinimized');
    _isMinimized = false;
    print('📦 [Provider]   - After: isMinimized=$_isMinimized');
    print('📦 [Provider]   - Calling notifyListeners()');
    notifyListeners();
    print('📦 [Provider]   - notifyListeners() completed');
  }

  void updatePosition(Position position, {bool? isViolating, String? zoneStatus}) {
    _currentPosition = position;
    if (isViolating != null) _isViolating = isViolating;
    if (zoneStatus != null) _zoneStatus = zoneStatus;
    notifyListeners();
  }

  void startTracking({Map<String, dynamic>? data}) {
    _isTrackingActive = true;
    if (data != null) {
      _trackingData = data;
    }
    notifyListeners();
  }

  void stopTracking() {
    _isTrackingActive = false;
    _isMinimized = false;
    _trackingData = null;
    _currentPosition = null;
    _isViolating = false;
    _zoneStatus = 'unknown';
    _showCompass = false;
    _showSpeedometer = false;
    notifyListeners();
  }
}
