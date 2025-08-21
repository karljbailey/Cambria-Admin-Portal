import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/auth/login/route';

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

jest.mock('@/lib/auth', () => ({
  verifyPassword: jest.fn(),
  createSessionToken: jest.fn()
}));

jest.mock('@/lib/audit', () => ({
  auditHelpers: {
    userLoggedIn: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      data,
      options,
      cookies: {
        set: jest.fn()
      }
    }))
  }
}));

describe('Login API E2E Tests', () => {
  let mockUsersService: any;
  let mockVerifyPassword: any;
  let mockCreateSessionToken: any;
  let mockAuditHelpers: any;
  let mockNextResponse: any;
  let mockIsFirebaseConfigured: any;
  let consoleErrors: string[] = [];
  let consoleLogs: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions
    mockUsersService = require('@/lib/collections').usersService;
    mockVerifyPassword = require('@/lib/auth').verifyPassword;
    mockCreateSessionToken = require('@/lib/auth').createSessionToken;
    mockAuditHelpers = require('@/lib/audit').auditHelpers;
    mockNextResponse = require('next/server').NextResponse;
    mockIsFirebaseConfigured = require('@/lib/init').isFirebaseConfigured;

    // Setup default mock implementations
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockNextResponse.json.mockImplementation((data, options) => ({
      data,
      options,
      cookies: {
        set: jest.fn()
      }
    }));
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSessionToken.mockReturnValue('mock-session-token');
    mockAuditHelpers.userLoggedIn.mockResolvedValue(undefined);

    // Capture console output
    consoleErrors = [];
    consoleLogs = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = jest.fn((...args) => {
      consoleErrors.push(args.join(' '));
      originalError(...args);
    });
    console.log = jest.fn((...args) => {
      consoleLogs.push(args.join(' '));
      originalLog(...args);
    });
  });

  afterEach(() => {
    console.error = console.error;
    console.log = console.log;
  });

  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'basic',
    passwordHash: 'hashedpassword',
    passwordSalt: 'salt123',
    status: 'active',
    lastLogin: null,
    created_at: new Date(),
    updated_at: new Date()
  };

  describe('POST /api/auth/login - Input Validation', () => {
    it('should return 400 error when email is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ password: 'somepassword' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when password is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when both email and password are missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when email is null', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: null, password: 'somepassword' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error when password is null', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: null })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    });

    it('should return 400 error for invalid email format', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'invalid-email', password: 'validpassword123' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    });

    it('should return 400 error for password too short', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'short' })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    });

    it('should handle malformed JSON in request body', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token } in JSON'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(consoleErrors).toContain('Login error: SyntaxError: Unexpected token } in JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/auth/login - Firebase Not Configured', () => {
    it('should return 503 error when Firebase is not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).not.toHaveBeenCalled();
      expect(consoleErrors).toContain('Firebase not configured for login request');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication service not configured' },
        { status: 503 }
      );
    });
  });

  describe('POST /api/auth/login - Firebase Configured', () => {
    it('should handle user not found in Firebase', async () => {
      mockUsersService.getByEmail.mockResolvedValue(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'nonexistent@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(consoleLogs).toContain('🔍 User lookup for nonexistent@example.com: Not found');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    });

    it('should handle inactive user', async () => {
      const inactiveUser = { ...validUser, status: 'inactive' };
      mockUsersService.getByEmail.mockResolvedValue(inactiveUser);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    });

    it('should handle Firebase user service error', async () => {
      mockUsersService.getByEmail.mockRejectedValue(new Error('Firebase connection failed'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(consoleErrors).toContain('Error fetching from Firebase: Error: Firebase connection failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      );
    });

    it('should handle user without password hash', async () => {
      const userWithoutHash = { ...validUser, passwordHash: null, passwordSalt: null };
      mockUsersService.getByEmail.mockResolvedValue(userWithoutHash);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(consoleErrors).toContain(`User ${validUser.email} has no password hash configured`);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'User account not properly configured' },
        { status: 500 }
      );
    });

    it('should handle invalid password', async () => {
      mockUsersService.getByEmail.mockResolvedValue(validUser);
      mockVerifyPassword.mockResolvedValue(false);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'wrongpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrongpassword123', validUser.passwordHash, validUser.passwordSalt);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    });

    it('should handle password verification returning false', async () => {
      mockUsersService.getByEmail.mockResolvedValue(validUser);
      mockVerifyPassword.mockResolvedValue(false);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockVerifyPassword).toHaveBeenCalledWith('validpassword123', validUser.passwordHash, validUser.passwordSalt);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    });

    it('should successfully login with valid credentials', async () => {
      mockUsersService.getByEmail.mockResolvedValue(validUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSessionToken.mockReturnValue('valid-session-token');

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      const response = await POST(mockRequest);

      expect(mockUsersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockVerifyPassword).toHaveBeenCalledWith('validpassword123', validUser.passwordHash, validUser.passwordSalt);
      expect(mockCreateSessionToken).toHaveBeenCalledWith(validUser.id, validUser.email);
      expect(mockAuditHelpers.userLoggedIn).toHaveBeenCalledWith(validUser.email, validUser.name, 'Mozilla/5.0 Test Browser');

      expect(response.data).toEqual({
        success: true,
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
          role: validUser.role,
          status: validUser.status
        },
        message: 'Login successful'
      });
    });
  });

  describe('POST /api/auth/login - Security and Privacy', () => {
    it('should not reveal specific error details for invalid credentials', async () => {
      mockUsersService.getByEmail.mockResolvedValue(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'wrongpassword' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      // Should return generic error message, not specific details
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    });
  });

  describe('POST /api/auth/login - Error Handling and Resilience', () => {
    it('should handle general errors gracefully', async () => {
      mockUsersService.getByEmail.mockRejectedValue(new Error('Unexpected error'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ email: 'test@example.com', password: 'validpassword123' }),
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Error fetching from Firebase: Error: Unexpected error');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      );
    });
  });
});
