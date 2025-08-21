// @ts-nocheck
import { POST } from '../../app/api/auth/forgot-password/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn(),
  initializeApp: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  usersService: {
    getByEmail: jest.fn()
  }
}));

jest.mock('@/lib/email', () => ({
  sendForgotPasswordEmail: jest.fn()
}));

jest.mock('@/lib/reset-codes', () => ({
  storeResetCode: jest.fn()
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import mocked modules
import { isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { sendForgotPasswordEmail } from '@/lib/email';
import { storeResetCode } from '@/lib/reset-codes';
import { NextResponse } from 'next/server';

describe('Forgot Password API E2E Tests', () => {
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;
  let mockUsersServiceGetByEmail: jest.MockedFunction<typeof usersService.getByEmail>;
  let mockSendForgotPasswordEmail: jest.MockedFunction<typeof sendForgotPasswordEmail>;
  let mockStoreResetCode: jest.MockedFunction<typeof storeResetCode>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mocks
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
    mockUsersServiceGetByEmail = usersService.getByEmail as jest.MockedFunction<typeof usersService.getByEmail>;
    mockSendForgotPasswordEmail = sendForgotPasswordEmail as jest.MockedFunction<typeof sendForgotPasswordEmail>;
    mockStoreResetCode = storeResetCode as jest.MockedFunction<typeof storeResetCode>;
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
    jest.spyOn(console, 'warn').mockImplementation((...args) => {
      consoleLogs.push(args.join(' '));
    });

    // Mock NextResponse.json to return a mock response
    mockNextResponse.json.mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      ok: !options?.status || options.status < 400
    }));

    // Mock Math.random for consistent reset codes
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);
    jest.spyOn(Math, 'floor').mockImplementation((num) => Math.floor(num));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const validEmail = 'test@example.com';
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    status: 'active'
  };

  describe('POST /api/auth/forgot-password - Input Validation', () => {
    it('should return 400 error when email is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email is required' },
        { status: 400 }
      );
    });

    it('should return 400 error when email is null', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: null })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email is required' },
        { status: 400 }
      );
    });

    it('should return 400 error when email is undefined', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: undefined })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email is required' },
        { status: 400 }
      );
    });

    it('should return 400 error when email is empty string', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: '' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email is required' },
        { status: 400 }
      );
    });

    it('should return 400 error when email is whitespace only', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: '   ' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email is required' },
        { status: 400 }
      );
    });

    it('should handle malformed JSON in request body', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token } in JSON'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(consoleErrors).toContain('Forgot password error: SyntaxError: Unexpected token } in JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/auth/forgot-password - Firebase Not Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(false);
    });

    it('should handle any email when Firebase is not configured', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'any@example.com' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockUsersServiceGetByEmail).not.toHaveBeenCalled();
      expect(mockStoreResetCode).not.toHaveBeenCalled();
      expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled();
      expect(consoleLogs).toContain('Firebase not configured for forgot password request');
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });
  });

  describe('POST /api/auth/forgot-password - Firebase Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should handle inactive user', async () => {
      const inactiveUser = {
        ...validUser,
        status: 'inactive'
      };
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockResolvedValue(inactiveUser);

      await POST(mockRequest);

      expect(mockUsersServiceGetByEmail).toHaveBeenCalledWith(validEmail);
      expect(mockStoreResetCode).not.toHaveBeenCalled();
      expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled();
      expect(consoleLogs.some(log => log.includes('[SECURITY] FORGOT_PASSWORD_ATTEMPT:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });

    it('should handle user not found in Firebase', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'nonexistent@example.com' })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockResolvedValue(null);

      await POST(mockRequest);

      expect(mockUsersServiceGetByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(mockStoreResetCode).not.toHaveBeenCalled();
      expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled();
      expect(consoleLogs.some(log => log.includes('[SECURITY] FORGOT_PASSWORD_ATTEMPT:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });

    it('should handle Firebase user service error', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockRejectedValue(new Error('Firebase connection failed'));

      await POST(mockRequest);

      expect(mockUsersServiceGetByEmail).toHaveBeenCalledWith(validEmail);
      expect(consoleErrors).toContain('Error fetching user from Firebase: Error: Firebase connection failed');
      expect(mockStoreResetCode).not.toHaveBeenCalled();
      expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled();
      expect(consoleLogs.some(log => log.includes('[SECURITY] FORGOT_PASSWORD_ATTEMPT:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });
  });

  describe('POST /api/auth/forgot-password - Security and Privacy', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should not reveal if user exists or not (user not found)', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'nonexistent@example.com' })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockResolvedValue(null);

      await POST(mockRequest);

      // Should return success message even when user doesn't exist
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });

    it('should not reveal if user exists or not (inactive user)', async () => {
      const inactiveUser = {
        ...validUser,
        status: 'inactive'
      };
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: validEmail })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockResolvedValue(inactiveUser);

      await POST(mockRequest);

      // Should return success message even when user is inactive
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    });

    it('should log security events for all attempts', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com' })
      } as unknown as NextRequest;

      mockUsersServiceGetByEmail.mockResolvedValue(null);

      await POST(mockRequest);

      expect(consoleLogs.some(log => log.includes('[SECURITY] FORGOT_PASSWORD_ATTEMPT:'))).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password - Error Handling and Resilience', () => {
    it('should handle general errors gracefully', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Forgot password error: Error: Unexpected error');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });
});
