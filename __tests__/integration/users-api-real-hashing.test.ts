import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Users API Real Password Hashing Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.PASSWORD_PEPPER = 'test_pepper_real_123';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Real Password Hashing with Pepper', () => {
    it('should hash and verify passwords with pepper correctly', async () => {
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
      const isInvalid = await verifyPassword('WrongPassword', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should generate consistent hashes for same password', async () => {
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

  describe('Password Security Features', () => {
    it('should handle special characters in passwords', async () => {
      const specialPassword = 'P@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?🔐🚀✨';
      
      const { hash, salt } = await hashPassword(specialPassword);
      const isValid = await verifyPassword(specialPassword, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      
      const { hash, salt } = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should handle empty passwords (for testing)', async () => {
      const emptyPassword = '';
      
      const { hash, salt } = await hashPassword(emptyPassword);
      const isValid = await verifyPassword(emptyPassword, hash, salt);
      expect(isValid).toBe(true);
    });
  });

  describe('Pepper Security', () => {
    it('should use different pepper for different environments', async () => {
      const password = 'TestPassword123';
      
      // Test with different pepper values
      const peppers = ['pepper_a', 'pepper_b', 'pepper_c'];
      
      for (const pepper of peppers) {
        process.env.PASSWORD_PEPPER = pepper;
        const { hash, salt } = await hashPassword(password);
        const isValid = await verifyPassword(password, hash, salt);
        expect(isValid).toBe(true);
      }
    });

    it('should use default pepper when PASSWORD_PEPPER is not set', async () => {
      const password = 'DefaultPepperTest123';
      
      // Remove pepper
      delete process.env.PASSWORD_PEPPER;
      
      const { hash, salt } = await hashPassword(password);
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });
  });
});
