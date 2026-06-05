import 'package:e_logbook/constants/zones.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/zone_alert.dart';



class ZoneCheckerService {

  static final AudioPlayer _audioPlayer = AudioPlayer();
  static bool _isAlarmPlaying = false;

  /// Cek apakah lokasi dalam zona terlarang (RESTRICTED ZONE)
  static Map<String, dynamic> checkRestrictedZones({
    required double latitude,
    required double longitude,
    required String vesselName,
  }) {
    for (var zone in restrictedZones) {
      final distance = Geolocator.distanceBetween(
        latitude,
        longitude,
        zone['lat'],
        zone['lng'],
      );

      // Jika dalam radius zona terlarang
      if (distance <= zone['radius']) {
        final alert = ZoneAlert(
          id: 'restricted_${DateTime.now().millisecondsSinceEpoch}',
          timestamp: DateTime.now(),
          harborZoneId: zone['name'],
          harborZoneName: zone['name'],
          currentDistance: distance / 1000, // convert to km
          zoneRadius: zone['radius'] / 1000, // convert to km
          violationLocation: LatLng(latitude, longitude),
          vesselName: vesselName,
          alertType: 'critical',
          isRead: false,
        );

        return {
          'isInRestrictedZone': true,
          'zoneName': zone['name'],
          'distance': distance / 1000,
          'zoneRadius': zone['radius'] / 1000,
          'alert': alert,
        };
      }
    }

    return {
      'isInRestrictedZone': false,
    };
  }




  static Future<void> triggerAlarm() async {
    if (_isAlarmPlaying) return;

    try {
      _isAlarmPlaying = true;

      // Set release mode ke LOOP agar berulang
      await _audioPlayer.setReleaseMode(ReleaseMode.loop);
      
      // Set volume maksimal
      await _audioPlayer.setVolume(1.0);

      // Play alarm sound dari assets
      await _audioPlayer.play(AssetSource('audio/alarm.m4a'));

      print('🚨 Alarm dimulai (looping)');
    } catch (e) {
      print('❌ Error playing alarm: $e');
      _isAlarmPlaying = false;
    }
  }


  /// ⭐ Stop alarm
  static Future<void> stopAlarm() async {
    if (!_isAlarmPlaying) return;

    try {
      await _audioPlayer.stop();
      _isAlarmPlaying = false;
      print('✅ Alarm dihentikan');
    } catch (e) {
      print('❌ Error stopping alarm: $e');
    }
  }

  /// Get alarm status
  static bool get isAlarmPlaying => _isAlarmPlaying;

  /// Dispose audio player (call saat app closed)
  static Future<void> dispose() async {
    await _audioPlayer.dispose();
    _isAlarmPlaying = false;
  }

  /// Vibrate device (optional, bisa dikombinasikan dengan audio)
  static Future<void> vibrateDevice() async {
    try {
      await HapticFeedback.vibrate();
    } catch (e) {
      print('❌ Vibration not supported: $e');
    }
  }
}