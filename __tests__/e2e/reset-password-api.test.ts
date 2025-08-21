// @ts-nocheck
import { POST } from '../../app/api/auth/reset-password/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn()
}));

// Remove audit mock since we're using logSecurityEvent directly

jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn(),
  initializeApp: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  usersService: {
    getById: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('@/lib/reset-codes', () => ({
  verifyResetCode: jest.fn(),
  getUserIdForResetCode: jest.fn(),
  removeResetCode: jest.fn()
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import mocked modules
import { hashPassword } from '@/lib/auth';
import { isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { verifyResetCode, getUserIdForResetCode, removeResetCode } from '@/lib/reset-codes';
import { NextResponse } from 'next/server';

describe('Reset Password API E2E Tests', () => {
  let mockHashPassword: jest.MockedFunction<typeof hashPassword>;
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;
  let mockUsersServiceGetById: jest.MockedFunction<typeof usersService.getById>;
  let mockUsersServiceUpdate: jest.MockedFunction<typeof usersService.update>;
  let mockVerifyResetCode: jest.MockedFunction<typeof verifyResetCode>;
  let mockGetUserIdForResetCode: jest.MockedFunction<typeof getUserIdForResetCode>;
  let mockRemoveResetCode: jest.MockedFunction<typeof removeResetCode>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mocks
    mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
    mockUsersServiceGetById = usersService.getById as jest.MockedFunction<typeof usersService.getById>;
    mockUsersServiceUpdate = usersService.update as jest.MockedFunction<typeof usersService.update>;
    mockVerifyResetCode = verifyResetCode as jest.MockedFunction<typeof verifyResetCode>;
    mockGetUserIdForResetCode = getUserIdForResetCode as jest.MockedFunction<typeof getUserIdForResetCode>;
    mockRemoveResetCode = removeResetCode as jest.MockedFunction<typeof removeResetCode>;
    mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;
    
    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock NextResponse.json to return a mock response
    mockNextResponse.json.mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      ok: !options?.status || options.status < 400
    }));

    // Mock hashPassword to return predictable values
    mockHashPassword.mockResolvedValue({
      hash: 'hashed-password-123',
      salt: 'salt-123'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const validEmail = 'test@example.com';
  const validCode = '123456';
  const validPassword = 'newpassword123';
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    status: 'active'
  };

  describe('POST /api/auth/reset-password - Input Validation', () => {
    it('should return 400 error when email is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(consoleLogs.some(log => log.includes('Missing required fields:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when code is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, newPassword: validPassword })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when newPassword is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when all fields are missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error for password too short', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: 'short' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    });

    it('should handle malformed JSON in request body', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token } in JSON'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(consoleErrors).toContain('Reset password error: SyntaxError: Unexpected token } in JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/auth/reset-password - Reset Code Validation', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should return 400 error for invalid reset code', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: 'invalid-code', newPassword: validPassword })
      } as unknown as NextRequest;

      mockVerifyResetCode.mockReturnValue(false);
      mockGetUserIdForResetCode.mockReturnValue('user123');

      await POST(mockRequest);

      expect(mockVerifyResetCode).toHaveBeenCalledWith(validEmail, 'invalid-code');
      expect(consoleLogs.some(log => log.includes('[SECURITY] PASSWORD_RESET_FAILED:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired reset code. Please check the code and try again, or request a new code.' },
        { status: 400 }
      );
    });

    it('should handle missing user ID for reset code', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: 'invalid-code', newPassword: validPassword })
      } as unknown as NextRequest;

      mockVerifyResetCode.mockReturnValue(false);
      mockGetUserIdForResetCode.mockReturnValue(null);

      await POST(mockRequest);

      expect(consoleLogs.some(log => log.includes('[SECURITY] PASSWORD_RESET_FAILED:'))).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password - Firebase Not Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(false);
      mockVerifyResetCode.mockReturnValue(true);
    });

    it('should return 503 error when Firebase is not configured', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockGetUserIdForResetCode.mockReturnValue('user123');

      await POST(mockRequest);

      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockUsersServiceGetById).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Password reset service not configured' },
        { status: 503 }
      );
    });
  });

  describe('POST /api/auth/reset-password - Firebase Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockVerifyResetCode.mockReturnValue(true);
      mockGetUserIdForResetCode.mockReturnValue('user123');
    });

    it('should successfully reset password for valid user', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockUsersServiceUpdate.mockResolvedValue(undefined);

      await POST(mockRequest);

      expect(mockVerifyResetCode).toHaveBeenCalledWith(validEmail, validCode);
      expect(mockUsersServiceGetById).toHaveBeenCalledWith('user123');
      expect(mockHashPassword).toHaveBeenCalledWith(validPassword);
      expect(mockUsersServiceUpdate).toHaveBeenCalledWith(validUser.id, {
        passwordHash: 'hashed-password-123',
        passwordSalt: 'salt-123',
        updated_at: expect.any(Date)
      });
      expect(mockRemoveResetCode).toHaveBeenCalledWith(validEmail);
      expect(consoleLogs.some(log => log.includes('[SECURITY] PASSWORD_RESET_SUCCESSFUL:'))).toBe(true);
      
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });
    });

    it('should handle user not found in Firebase', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(null);

      await POST(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith('user123');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'User not found or inactive' },
        { status: 400 }
      );
    });

    it('should handle inactive user', async () => {
      const inactiveUser = {
        ...validUser,
        status: 'inactive'
      };
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(inactiveUser);

      await POST(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith('user123');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'User not found or inactive' },
        { status: 400 }
      );
    });

    it('should handle Firebase user service error', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockRejectedValue(new Error('Firebase connection failed'));

      await POST(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith('user123');
      expect(consoleErrors).toContain('Error fetching user from Firebase: Error: Firebase connection failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      );
    });

    it('should handle password update error', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockUsersServiceUpdate.mockRejectedValue(new Error('Update failed'));

      await POST(mockRequest);

      expect(mockUsersServiceUpdate).toHaveBeenCalledWith(validUser.id, {
        passwordHash: 'hashed-password-123',
        passwordSalt: 'salt-123',
        updated_at: expect.any(Date)
      });
      expect(consoleErrors).toContain('Error updating user password in Firebase: Error: Update failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    });

    it('should handle password hashing error', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

      await POST(mockRequest);

      expect(mockHashPassword).toHaveBeenCalledWith(validPassword);
      expect(consoleErrors).toContain('Error hashing password: Error: Hashing failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to process password. Please try again.' },
        { status: 500 }
      );
    });

    it('should handle missing user ID for reset code', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockGetUserIdForResetCode.mockReturnValue(null);

      await POST(mockRequest);

      expect(mockGetUserIdForResetCode).toHaveBeenCalledWith(validEmail);
      expect(mockUsersServiceGetById).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid reset code' },
        { status: 400 }
      );
    });
  });

  describe('POST /api/auth/reset-password - Security and Privacy', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockVerifyResetCode.mockReturnValue(true);
      mockGetUserIdForResetCode.mockReturnValue('user123');
    });

    it('should not reveal specific error details for invalid codes', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: 'wrong-code', newPassword: validPassword })
      } as unknown as NextRequest;

      mockVerifyResetCode.mockReturnValue(false);

      await POST(mockRequest);

      // Should return generic error message, not specific details
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or expired reset code. Please check the code and try again, or request a new code.' },
        { status: 400 }
      );
    });

    it('should log security events for all attempts', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockUsersServiceUpdate.mockResolvedValue(undefined);

      await POST(mockRequest);

      expect(consoleLogs.some(log => log.includes('[SECURITY] PASSWORD_RESET_SUCCESSFUL:'))).toBe(true);
    });

    it('should remove reset code after successful use', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockUsersServiceUpdate.mockResolvedValue(undefined);

      await POST(mockRequest);

      expect(mockRemoveResetCode).toHaveBeenCalledWith(validEmail);
    });
  });

  describe('POST /api/auth/reset-password - Error Handling and Resilience', () => {
    it('should handle general errors gracefully', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Reset password error: Error: Unexpected error');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });

    it('should handle concurrent password reset requests', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockVerifyResetCode.mockReturnValue(true);
      mockGetUserIdForResetCode.mockReturnValue('user123');
      mockUsersServiceGetById.mockResolvedValue(validUser);
      mockUsersServiceUpdate.mockResolvedValue(undefined);

      const mockRequest1 = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      const mockRequest2 = {
        json: jest.fn().mockResolvedValue({ email: validEmail, code: validCode, newPassword: validPassword })
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        POST(mockRequest1),
        POST(mockRequest2)
      ]);

      expect(mockVerifyResetCode).toHaveBeenCalledTimes(2);
      expect(mockUsersServiceGetById).toHaveBeenCalledTimes(2);
      expect(mockHashPassword).toHaveBeenCalledTimes(2);
      expect(mockUsersServiceUpdate).toHaveBeenCalledTimes(2);
      expect(mockRemoveResetCode).toHaveBeenCalledTimes(2);
    });
  });
});
