import 'package:shared_preferences/shared_preferences.dart';

class UserActivityService {
  static Future<void> saveLastLogin(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_login_email', email);
    await prefs.setString('last_login_time', DateTime.now().toIso8601String());
  }

  static Future<void> saveActivity(String activity) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> activities = prefs.getStringList('user_activities') ?? [];
    activities.add('${DateTime.now().toIso8601String()}: $activity');
    await prefs.setStringList('user_activities', activities);
  }
}
