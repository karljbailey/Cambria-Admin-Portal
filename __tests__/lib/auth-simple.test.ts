import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Auth Functions - Current Implementation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env.PASSWORD_PEPPER = 'test-pepper';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hashPassword', () => {
    it('should hash password with fixed salt and pepper', async () => {
      const password = 'testPassword123';
      const result = await hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result.salt).toBe('12'); // Fixed salt value
      expect(typeof result.hash).toBe('string');
      expect(result.hash.length).toBeGreaterThan(0);
    });

    it('should generate consistent results for same password', async () => {
      const password = 'testPassword123';
      const result1 = await hashPassword(password);
      const result2 = await hashPassword(password);

      // Salt should always be the same (fixed)
      expect(result1.salt).toBe('12');
      expect(result2.salt).toBe('12');
      expect(result1.salt).toBe(result2.salt);
      
      // Hash might be different due to bcrypt's internal salt, but both should be valid
      expect(result1.hash).toBeDefined();
      expect(result2.hash).toBeDefined();
    });

    it('should handle empty password', async () => {
      const result = await hashPassword('');
      expect(result.salt).toBe('12');
      expect(result.hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'testPassword123';
      const { hash, salt } = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const { hash, salt } = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash, salt);
      expect(isValid).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const password = '';
      const { hash, salt } = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });
  });

  describe('integration', () => {
    it('should work end-to-end with pepper', async () => {
      const password = 'mySecurePassword!@#123';
      
      // Hash the password
      const { hash, salt } = await hashPassword(password);
      
      // Verify correct password
      const isValidCorrect = await verifyPassword(password, hash, salt);
      expect(isValidCorrect).toBe(true);
      
      // Verify incorrect password
      const isValidIncorrect = await verifyPassword('wrongPassword', hash, salt);
      expect(isValidIncorrect).toBe(false);
    });

    it('should use default pepper when not set', async () => {
      delete process.env.PASSWORD_PEPPER;
      
      const password = 'testPassword123';
      const { hash, salt } = await hashPassword(password);
      
      expect(salt).toBe('12');
      expect(hash).toBeDefined();
      
      const isValid = await verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });
  });
});
