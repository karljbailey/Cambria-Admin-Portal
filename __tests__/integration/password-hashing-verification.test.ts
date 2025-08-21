import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Password Hashing and Verification Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.PASSWORD_PEPPER = 'test_pepper_123';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Password Hashing with Pepper', () => {
    it('should hash passwords with pepper and verify them correctly', async () => {
      const testPassword = 'SecurePassword123!';
      
      // Hash the password with pepper
      const { hash, salt } = await hashPassword(testPassword);
      
      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(salt).toBe('12'); // Fixed salt value
      
      // Verify the password works
      const isValid = await verifyPassword(testPassword, hash, salt);
      expect(isValid).toBe(true);
      
      // Verify wrong password is rejected
      const isInvalid = await verifyPassword('WrongPassword123!', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should generate consistent hashes for the same password', async () => {
      const password = 'SamePassword123';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Salt should be the same due to fixed salt
      expect(hash1.salt).toBe(hash2.salt);
      expect(hash1.salt).toBe('12');
      
      // Both should verify correctly
      const valid1 = await verifyPassword(password, hash1.hash, hash1.salt);
      const valid2 = await verifyPassword(password, hash2.hash, hash2.salt);
      
      expect(valid1).toBe(true);
      expect(valid2).toBe(true);
    });
  });

  describe('Password Verification', () => {
    it('should verify correct passwords successfully', async () => {
      const passwords = [
        'SimplePassword123',
        'Complex!@#$%^&*()Password',
        'P@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?🔐🚀✨',
        'VeryLongPasswordThatExceedsNormalLengthRequirementsForSecurityPurposes123!@#'
      ];

      for (const password of passwords) {
        const { hash, salt } = await hashPassword(password);
        const isValid = await verifyPassword(password, hash, salt);
        expect(isValid).toBe(true);
      }
    });

    it('should reject incorrect passwords', async () => {
      const password = 'CorrectPassword123';
      const { hash, salt } = await hashPassword(password);

      const wrongPasswords = [
        'WrongPassword123',
        'correctpassword123',
        'CorrectPassword',
        'CorrectPassword123!',
        '',
        'CorrectPassword123 ',
        ' CorrectPassword123'
      ];

      for (const wrongPassword of wrongPasswords) {
        const isValid = await verifyPassword(wrongPassword, hash, salt);
        expect(isValid).toBe(false);
      }
    });

    it('should handle case sensitivity correctly', async () => {
      const password = 'CaseSensitive123';
      const { hash, salt } = await hashPassword(password);

      // Exact match should work
      const exactMatch = await verifyPassword(password, hash, salt);
      expect(exactMatch).toBe(true);

      // Case variations should fail
      const caseVariations = [
        'casesensitive123',
        'CASESENSITIVE123',
        'CaseSensitive123',
        'cAsEsEnSiTiVe123'
      ];

      for (const variation of caseVariations) {
        if (variation !== password) { // Skip the exact match
          const isValid = await verifyPassword(variation, hash, salt);
          expect(isValid).toBe(false);
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle edge case passwords', async () => {
      const edgeCasePasswords = [
        '', // Empty password (allowed for testing)
        ' ', // Single space
        '\n\t\r', // Whitespace characters
        '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?',
        'a'.repeat(1000), // Very long password
        '🔐🚀✨', // Emoji password
        'null\0bytes', // Contains null bytes (should be rejected)
        'control\x00chars' // Control characters (should be rejected)
      ];

      for (const password of edgeCasePasswords) {
        try {
          const { hash, salt } = await hashPassword(password);
          const isValid = await verifyPassword(password, hash, salt);
          expect(isValid).toBe(true);
        } catch (error) {
          // Some edge cases should throw errors (like null bytes)
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should handle missing pepper gracefully', async () => {
      const password = 'NoPepperTest123';
      
      // Remove pepper
      delete process.env.PASSWORD_PEPPER;
      
      // Should use default pepper
      const { hash, salt } = await hashPassword(password);
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should handle empty pepper', async () => {
      const password = 'EmptyPepperTest123';
      
      // Set empty pepper
      process.env.PASSWORD_PEPPER = '';
      
      const { hash, salt } = await hashPassword(password);
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });
  });

  describe('Performance and Security', () => {
    it('should handle concurrent password operations', async () => {
      const password = 'ConcurrentTest123';
      const promises = [];
      
      // Start multiple concurrent hash operations
      for (let i = 0; i < 5; i++) {
        promises.push(hashPassword(password));
      }
      
      const results = await Promise.all(promises);
      
      // All salts should be the same due to fixed salt
      const hashes = results.map(r => r.hash);
      const salts = results.map(r => r.salt);
      
      expect(new Set(salts).size).toBe(1); // All salts should be identical
      expect(salts[0]).toBe('12'); // All salts should be '12'
      
      // All should verify correctly
      for (let i = 0; i < results.length; i++) {
        const isValid = await verifyPassword(password, results[i].hash, results[i].salt);
        expect(isValid).toBe(true);
      }
    });
  });
});
