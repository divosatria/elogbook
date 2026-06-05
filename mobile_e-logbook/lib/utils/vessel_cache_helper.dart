import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

/// Utility untuk clear cache vessel data
class VesselCacheHelper {
  /// Clear semua cache vessel data
  static Future<void> clearVesselCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Clear vessel data cache
      await prefs.remove('vessel_data');
      await prefs.remove('vessel_data_timestamp');
      
      debugPrint('🧹 [VesselCache] Cleared vessel cache successfully');
    } catch (e) {
      debugPrint('❌ [VesselCache] Error clearing cache: $e');
    }
  }
  
  /// Clear cache dan force refresh
  static Future<void> clearAndRefresh() async {
    await clearVesselCache();
    debugPrint('🔄 [VesselCache] Cache cleared, next fetch will be fresh');
  }
  
  /// Check apakah cache ada
  static Future<bool> hasCachedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.containsKey('vessel_data');
    } catch (e) {
      return false;
    }
  }
  
  /// Get cache age dalam jam
  static Future<double?> getCacheAgeInHours() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt('vessel_data_timestamp');
      
      if (timestamp == null) return null;
      
      final now = DateTime.now().millisecondsSinceEpoch;
      final ageInMs = now - timestamp;
      final ageInHours = ageInMs / (60 * 60 * 1000);
      
      return ageInHours;
    } catch (e) {
      return null;
    }
  }
}
