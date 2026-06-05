import 'package:shared_preferences/shared_preferences.dart';

class CacheCleaner {
  static Future<void> clearAllCache() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Clear specific keys that might have corrupted data
    await prefs.remove('user_data');
    await prefs.remove('user_profile');
    
    print('Cache cleared successfully');
  }
  
  static Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_data');
    print('User data cleared');
  }
}
