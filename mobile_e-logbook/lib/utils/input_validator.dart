import 'dart:convert';

class InputValidator {
  // Email validation
  static bool isValidEmail(String email) {
    final regex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return regex.hasMatch(email);
  }

  // Phone number validation (Indonesia)
  static bool isValidPhone(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[^\d+]'), '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  // Sanitize string input (prevent XSS)
  static String sanitizeString(String input) {
    return input
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;')
        .replaceAll('/', '&#x2F;');
  }

  // Check for SQL injection patterns
  static bool hasSQLInjection(String input) {
    final patterns = [
      r"(\bOR\b|\bAND\b).*=.*",
      r"';.*--",
      r"1=1",
      r"DROP\s+TABLE",
      r"UNION\s+SELECT",
    ];
    
    for (var pattern in patterns) {
      if (RegExp(pattern, caseSensitive: false).hasMatch(input)) {
        return true;
      }
    }
    return false;
  }

  // Validate coordinate values
  static bool isValidLatitude(double lat) {
    return lat >= -90 && lat <= 90;
  }

  static bool isValidLongitude(double lng) {
    return lng >= -180 && lng <= 180;
  }

  // Validate file size (in bytes)
  static bool isValidFileSize(int bytes, {int maxMB = 10}) {
    return bytes <= (maxMB * 1024 * 1024);
  }

  // Validate image file extension
  static bool isValidImageExtension(String filename) {
    final ext = filename.toLowerCase().split('.').last;
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext);
  }

  // Validate document file extension
  static bool isValidDocumentExtension(String filename) {
    final ext = filename.toLowerCase().split('.').last;
    return ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].contains(ext);
  }

  // Check if string is valid JSON
  static bool isValidJson(String str) {
    try {
      jsonDecode(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Validate password strength
  static bool isStrongPassword(String password) {
    if (password.length < 8) return false;
    
    final hasUppercase = password.contains(RegExp(r'[A-Z]'));
    final hasLowercase = password.contains(RegExp(r'[a-z]'));
    final hasDigits = password.contains(RegExp(r'[0-9]'));
    final hasSpecialChar = password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'));
    
    return hasUppercase && hasLowercase && hasDigits && hasSpecialChar;
  }

  // Validate vessel registration number format
  static bool isValidVesselNumber(String number) {
    // Example: ABC-1234 or ABC1234
    return RegExp(r'^[A-Z]{2,4}-?\d{3,6}$').hasMatch(number.toUpperCase());
  }

  // Validate NIK (Indonesian ID number)
  static bool isValidNIK(String nik) {
    return nik.length == 16 && RegExp(r'^\d{16}$').hasMatch(nik);
  }
}
