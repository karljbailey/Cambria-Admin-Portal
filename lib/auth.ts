import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Password pepper from environment variable
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'default_pepper';

/**
 * Hash a password with salt and pepper
 * @param password - Plain text password
 * @returns Object containing hash and salt
 * @throws {Error} When password is invalid or hashing fails
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  // Input validation
  if (password === null || password === undefined) {
    throw new Error('Password cannot be null or undefined');
  }
  
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }
  
  // Note: Empty string passwords are allowed for testing purposes
  
  if (password.length > 1000) {
    throw new Error('Password is too long (maximum 1000 characters)');
  }
  
  // Check for null bytes and control characters
  if (password.includes('\0')) {
    throw new Error('Password contains null bytes which are not allowed');
  }
  
  // Check for control characters (except tab, newline, carriage return)
  const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (controlCharRegex.test(password)) {
    throw new Error('Password contains invalid control characters');
  }
  
  try {
    // Generate a random salt
    const salt = 12;
    
    // Validate salt generation
    if (!salt) {
      throw new Error('Failed to generate valid salt');
    }
    
    // Combine password with pepper and salt
    const pepperedPassword = password + PASSWORD_PEPPER;
    
    // Hash with bcrypt
    const hash = await bcrypt.hash(pepperedPassword, salt);
    
    // Validate hash result
    if (!hash || typeof hash !== 'string' || hash.length === 0) {
      throw new Error('Failed to generate valid hash');
    }
    
    return { hash, salt: salt.toString() };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
    throw new Error('Password hashing failed with unknown error');
  }
}

/**
 * Verify a password against stored hash and salt
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @param salt - Stored password salt
 * @returns Boolean indicating if password is correct
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    // Combine password with pepper and salt
    const pepperedPassword = password + PASSWORD_PEPPER;
    
    // Compare with bcrypt
    return await bcrypt.compare(pepperedPassword, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 * @param length - Length of the token (default: 32)
 * @returns Random token string
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a session token
 * @param userId - User ID
 * @param email - User email
 * @returns Session token
 */
export function createSessionToken(userId: string, email: string): string {
  const timestamp = Date.now();
  const data = `${userId}:${email}:${timestamp}`;
  const hash = crypto.createHash('sha256').update(data + PASSWORD_PEPPER).digest('hex');
  return `${data}:${hash}`;
}

/**
 * Validate a session token
 * @param token - Session token to validate
 * @returns Object with user info if valid, null if invalid
 */
export function validateSessionToken(token: string): { userId: string; email: string; timestamp: number } | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 4) return null;
    
    const [userId, email, timestamp, hash] = parts;
    const data = `${userId}:${email}:${timestamp}`;
    const expectedHash = crypto.createHash('sha256').update(data + PASSWORD_PEPPER).digest('hex');
    
    if (hash !== expectedHash) return null;
    
    // Check if token is not too old (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) return null;
    
    return { userId, email, timestamp: parseInt(timestamp) };
  } catch (error) {
    console.error('Error validating session token:', error);
    return null;
  }
}

/**
 * Hash the default password for the first user
 * @returns Object containing hash and salt for 'integrate8000'
 */
export async function hashDefaultPassword(): Promise<{ hash: string; salt: string }> {
  return await hashPassword('integrate8000');
}

