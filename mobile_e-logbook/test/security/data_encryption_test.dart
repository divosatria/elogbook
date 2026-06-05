import 'package:flutter_test/flutter_test.dart';
import 'package:e_logbook/core/utils/data_encryption.dart';

void main() {
  group('DataEncryption Tests', () {
    group('Hash Generation', () {
      test('should generate consistent hash', () {
        const data = 'test data';
        final hash1 = DataEncryption.generateHash(data);
        final hash2 = DataEncryption.generateHash(data);
        expect(hash1, equals(hash2));
      });

      test('should generate different hash for different data', () {
        final hash1 = DataEncryption.generateHash('data1');
        final hash2 = DataEncryption.generateHash('data2');
        expect(hash1, isNot(equals(hash2)));
      });

      test('should verify hash correctly', () {
        const data = 'test data';
        final hash = DataEncryption.generateHash(data);
        expect(DataEncryption.verifyHash(data, hash), true);
        expect(DataEncryption.verifyHash('wrong data', hash), false);
      });
    });

    group('Obfuscation', () {
      test('should obfuscate and deobfuscate correctly', () {
        const original = 'sensitive data';
        final obfuscated = DataEncryption.obfuscate(original);
        final deobfuscated = DataEncryption.deobfuscate(obfuscated);
        
        expect(obfuscated, isNot(equals(original)));
        expect(deobfuscated, equals(original));
      });
    });

    group('Data Masking', () {
      test('should mask email correctly', () {
        expect(DataEncryption.maskEmail('user@example.com'), 'us***@example.com');
        expect(DataEncryption.maskEmail('test@domain.co.id'), 'te***@domain.co.id');
      });

      test('should mask phone correctly', () {
        expect(DataEncryption.maskPhone('081234567890'), '***7890');
        expect(DataEncryption.maskPhone('628123456789'), '***6789');
      });

      test('should mask sensitive data', () {
        final masked = DataEncryption.maskSensitiveData('secret123456', visibleChars: 4);
        expect(masked, 'secr********');
      });
    });

    group('Token Generation', () {
      test('should generate unique tokens', () {
        final token1 = DataEncryption.generateToken();
        final token2 = DataEncryption.generateToken();
        expect(token1, isNot(equals(token2)));
      });

      test('should generate token with correct length', () {
        final token = DataEncryption.generateToken(length: 16);
        expect(token.length, 16);
      });
    });
  });
}
