import 'package:flutter_test/flutter_test.dart';
import 'package:e_logbook/utils/input_validator.dart';

void main() {
  group('InputValidator Tests', () {
    group('Email Validation', () {
      test('should validate correct email', () {
        expect(InputValidator.isValidEmail('test@example.com'), true);
        expect(InputValidator.isValidEmail('user.name@domain.co.id'), true);
      });

      test('should reject invalid email', () {
        expect(InputValidator.isValidEmail('invalid'), false);
        expect(InputValidator.isValidEmail('test@'), false);
        expect(InputValidator.isValidEmail('@example.com'), false);
      });
    });

    group('SQL Injection Detection', () {
      test('should detect SQL injection patterns', () {
        expect(InputValidator.hasSQLInjection("' OR 1=1--"), true);
        expect(InputValidator.hasSQLInjection("admin' AND 1=1"), true);
        expect(InputValidator.hasSQLInjection("DROP TABLE users"), true);
      });

      test('should allow safe input', () {
        expect(InputValidator.hasSQLInjection("John Doe"), false);
        expect(InputValidator.hasSQLInjection("test@example.com"), false);
      });
    });

    group('Password Strength', () {
      test('should validate strong password', () {
        expect(InputValidator.isStrongPassword('Test123!@#'), true);
        expect(InputValidator.isStrongPassword('MyP@ssw0rd'), true);
      });

      test('should reject weak password', () {
        expect(InputValidator.isStrongPassword('password'), false);
        expect(InputValidator.isStrongPassword('12345678'), false);
        expect(InputValidator.isStrongPassword('Test123'), false);
      });
    });

    group('Coordinate Validation', () {
      test('should validate correct coordinates', () {
        expect(InputValidator.isValidLatitude(-6.2088), true);
        expect(InputValidator.isValidLongitude(106.8456), true);
      });

      test('should reject invalid coordinates', () {
        expect(InputValidator.isValidLatitude(91), false);
        expect(InputValidator.isValidLatitude(-91), false);
        expect(InputValidator.isValidLongitude(181), false);
        expect(InputValidator.isValidLongitude(-181), false);
      });
    });

    group('File Validation', () {
      test('should validate image extensions', () {
        expect(InputValidator.isValidImageExtension('photo.jpg'), true);
        expect(InputValidator.isValidImageExtension('image.png'), true);
      });

      test('should reject invalid image extensions', () {
        expect(InputValidator.isValidImageExtension('file.exe'), false);
        expect(InputValidator.isValidImageExtension('doc.pdf'), false);
      });

      test('should validate file size', () {
        expect(InputValidator.isValidFileSize(5 * 1024 * 1024), true); // 5MB
        expect(InputValidator.isValidFileSize(15 * 1024 * 1024), false); // 15MB
      });
    });

    group('NIK Validation', () {
      test('should validate correct NIK', () {
        expect(InputValidator.isValidNIK('3201234567890123'), true);
      });

      test('should reject invalid NIK', () {
        expect(InputValidator.isValidNIK('123'), false);
        expect(InputValidator.isValidNIK('abcd1234567890123'), false);
      });
    });
  });
}
