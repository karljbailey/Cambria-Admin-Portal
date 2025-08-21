import fs from 'fs';
import path from 'path';

interface ResetCodeData {
  code: string;
  expiresAt: number;
  userId: string;
  email: string;
}

// File-based storage for reset codes (works in serverless environments)
const STORAGE_FILE = path.join(process.cwd(), '.reset-codes.json');

// In-memory cache for performance
let resetCodesCache: Map<string, ResetCodeData> | null = null;

// Load reset codes from file
const loadResetCodes = (): Map<string, ResetCodeData> => {
  if (resetCodesCache) {
    return resetCodesCache;
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const codes = JSON.parse(data);
      resetCodesCache = new Map(Object.entries(codes));
    } else {
      resetCodesCache = new Map();
    }
  } catch (error) {
    console.error('Error loading reset codes:', error);
    resetCodesCache = new Map();
  }

  return resetCodesCache;
};

// Save reset codes to file
const saveResetCodes = (codes: Map<string, ResetCodeData>) => {
  try {
    const data = Object.fromEntries(codes);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving reset codes:', error);
  }
};

// Clean up expired codes
const cleanupExpiredCodes = () => {
  const codes = loadResetCodes();
  let hasChanges = false;

  for (const [email, data] of codes.entries()) {
    if (data.expiresAt < Date.now()) {
      codes.delete(email);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    saveResetCodes(codes);
  }
};

// Store a reset code
export const storeResetCode = (email: string, code: string, userId: string): void => {
  const codes = loadResetCodes();
  
  codes.set(email, {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    userId,
    email
  });

  saveResetCodes(codes);
  resetCodesCache = codes;
};

// Get a reset code
export const getResetCode = (email: string): ResetCodeData | null => {
  cleanupExpiredCodes();
  const codes = loadResetCodes();
  return codes.get(email) || null;
};

// Remove a reset code (after successful use)
export const removeResetCode = (email: string): void => {
  const codes = loadResetCodes();
  codes.delete(email);
  saveResetCodes(codes);
  resetCodesCache = codes;
};

// Verify a reset code
export const verifyResetCode = (email: string, code: string): boolean => {
  const resetData = getResetCode(email);
  
  if (!resetData) {
    return false;
  }

  if (resetData.expiresAt < Date.now()) {
    removeResetCode(email);
    return false;
  }

  return resetData.code === code;
};

// Get user ID for a reset code
export const getUserIdForResetCode = (email: string): string | null => {
  const resetData = getResetCode(email);
  return resetData ? resetData.userId : null;
};

// Debug function to list all reset codes (for development only)
export const listResetCodes = (): void => {
  const codes = loadResetCodes();
  console.log('Current reset codes:');
  for (const [email, data] of codes.entries()) {
    console.log(`  ${email}: ${data.code} (expires: ${new Date(data.expiresAt).toISOString()})`);
  }
};
