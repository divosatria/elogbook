import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

class DataEncryption {
  // Generate hash for data integrity check
  static String generateHash(String data) {
    final bytes = utf8.encode(data);
    final hash = sha256.convert(bytes);
    return hash.toString();
  }

  // Verify data integrity
  static bool verifyHash(String data, String expectedHash) {
    final actualHash = generateHash(data);
    return actualHash == expectedHash;
  }

  // Simple obfuscation for non-critical data
  static String obfuscate(String data) {
    final bytes = utf8.encode(data);
    final encoded = base64Encode(bytes);
    return encoded.split('').reversed.join();
  }

  static String deobfuscate(String obfuscated) {
    try {
      final reversed = obfuscated.split('').reversed.join();
      final bytes = base64Decode(reversed);
      return utf8.decode(bytes);
    } catch (e) {
      debugPrint('❌ Deobfuscation error: $e');
      return '';
    }
  }

  // Generate secure random token
  static String generateToken({int length = 32}) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = '$timestamp${DateTime.now().microsecond}';
    return generateHash(random).substring(0, length);
  }

  // Mask sensitive data for logging
  static String maskSensitiveData(String data, {int visibleChars = 4}) {
    if (data.length <= visibleChars) return '***';
    final visible = data.substring(0, visibleChars);
    return '$visible${'*' * (data.length - visibleChars)}';
  }

  // Mask email for display
  static String maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;
    
    final username = parts[0];
    final domain = parts[1];
    
    if (username.length <= 2) return email;
    
    final visibleStart = username.substring(0, 2);
    final masked = '$visibleStart***@$domain';
    return masked;
  }

  // Mask phone number
  static String maskPhone(String phone) {
    if (phone.length <= 4) return phone;
    final visible = phone.substring(phone.length - 4);
    return '***$visible';
  }
}
