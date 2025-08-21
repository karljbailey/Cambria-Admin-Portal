// @ts-nocheck
import { GET } from '../../app/api/auth/session/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/auth', () => ({
  validateSessionToken: jest.fn()
}));

jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn(),
  initializeApp: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  usersService: {
    getById: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import mocked modules
import { validateSessionToken } from '@/lib/auth';
import { isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { NextResponse } from 'next/server';

describe('Session API E2E Tests', () => {
  let mockValidateSessionToken: jest.MockedFunction<typeof validateSessionToken>;
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;
  let mockUsersServiceGetById: jest.MockedFunction<typeof usersService.getById>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mocks
    mockValidateSessionToken = validateSessionToken as jest.MockedFunction<typeof validateSessionToken>;
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
    mockUsersServiceGetById = usersService.getById as jest.MockedFunction<typeof usersService.getById>;
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const validSessionToken = 'user123:test@example.com:1640995200000:abcd1234';
  const validSessionData = {
    userId: 'user123',
    email: 'test@example.com',
    timestamp: 1640995200000
  };
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    status: 'active'
  };

  describe('GET /api/auth/session - No Session Token', () => {
    it('should return 401 when session token is missing', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should return 401 when session token is null', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: null })
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should return 401 when session token is empty string', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: '' })
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });

  describe('GET /api/auth/session - Invalid Session Token', () => {
    it('should return 401 when session token validation fails', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'invalid-token' })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null);

      await GET(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).toHaveBeenCalledWith('invalid-token');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should return 401 when session token validation throws error', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockImplementation(() => {
        throw new Error('Token validation failed');
      });

      await GET(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith(validSessionToken);
      expect(consoleErrors).toContain('Session validation error: Error: Token validation failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });

  describe('GET /api/auth/session - Firebase Not Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(false);
      mockValidateSessionToken.mockReturnValue(validSessionData);
    });

    it('should return 401 when Firebase is not configured', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockUsersServiceGetById).not.toHaveBeenCalled();
      expect(consoleErrors).toContain('Firebase not configured for session validation');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });

  describe('GET /api/auth/session - Firebase Configured', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockValidateSessionToken.mockReturnValue(validSessionData);
    });

    it('should return authenticated user for valid session', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(validUser);

      await GET(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).toHaveBeenCalledWith(validSessionToken);
      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockUsersServiceGetById).toHaveBeenCalledWith(validSessionData.userId);
      
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        authenticated: true,
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
          role: validUser.role,
          status: validUser.status
        }
      });
    });

    it('should return 401 when user not found in Firebase', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(null);

      await GET(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith(validSessionData.userId);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should return 401 when user is inactive', async () => {
      const inactiveUser = {
        ...validUser,
        status: 'inactive'
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(inactiveUser);

      await GET(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith(validSessionData.userId);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should return 401 when Firebase user service fails', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockRejectedValue(new Error('Firebase connection failed'));

      await GET(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith(validSessionData.userId);
      expect(consoleErrors).toContain('Error fetching user from Firebase: Error: Firebase connection failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should handle user with admin role', async () => {
      const adminUser = {
        ...validUser,
        role: 'admin'
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(adminUser);

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        authenticated: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: 'admin',
          status: adminUser.status
        }
      });
    });

    it('should handle user without name', async () => {
      const userWithoutName = {
        ...validUser,
        name: null
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockUsersServiceGetById.mockResolvedValue(userWithoutName);

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        authenticated: true,
        user: {
          id: userWithoutName.id,
          email: userWithoutName.email,
          name: null,
          role: userWithoutName.role,
          status: userWithoutName.status
        }
      });
    });
  });

  describe('GET /api/auth/session - Edge Cases', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should handle session data with missing userId', async () => {
      const incompleteSessionData = {
        email: 'test@example.com',
        timestamp: 1640995200000
        // userId is missing
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(incompleteSessionData as any);

      await GET(mockRequest);

      expect(consoleErrors).toContain('Session data missing userId');
      expect(mockUsersServiceGetById).not.toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should handle session data with missing email', async () => {
      const incompleteSessionData = {
        userId: 'user123',
        timestamp: 1640995200000
        // email is missing
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(incompleteSessionData as any);
      mockUsersServiceGetById.mockResolvedValue(validUser);

      await GET(mockRequest);

      expect(mockUsersServiceGetById).toHaveBeenCalledWith(incompleteSessionData.userId);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        authenticated: true,
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
          role: validUser.role,
          status: validUser.status
        }
      });
    });

    it('should handle expired session token', async () => {
      const expiredSessionData = {
        ...validSessionData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null); // Expired tokens return null

      await GET(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith(validSessionToken);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });

  describe('GET /api/auth/session - Error Handling and Resilience', () => {
    it('should handle general errors gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Cookie access failed');
          })
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Session validation error: Error: Cookie access failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should handle concurrent session validation requests', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockValidateSessionToken.mockReturnValue(validSessionData);
      mockUsersServiceGetById.mockResolvedValue(validUser);

      const mockRequest1 = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      const mockRequest2 = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        GET(mockRequest1),
        GET(mockRequest2)
      ]);

      expect(mockValidateSessionToken).toHaveBeenCalledTimes(2);
      expect(mockUsersServiceGetById).toHaveBeenCalledTimes(2);
      expect(mockNextResponse.json).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed session token gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'malformed:token:data' })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null);

      await GET(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith('malformed:token:data');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });

  describe('GET /api/auth/session - Security', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should not expose sensitive user data', async () => {
      const userWithSensitiveData = {
        ...validUser,
        passwordHash: 'secret-hash',
        passwordSalt: 'secret-salt',
        internalNotes: 'sensitive information'
      };
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);
      mockUsersServiceGetById.mockResolvedValue(userWithSensitiveData);

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        authenticated: true,
        user: {
          id: validUser.id,
          email: validUser.email,
          name: validUser.name,
          role: validUser.role,
          status: validUser.status
          // Should not include passwordHash, passwordSalt, or internalNotes
        }
      });
    });

    it('should always return consistent response format for unauthenticated requests', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        }
      } as unknown as NextRequest;

      await GET(mockRequest);

      // Should always return the same format for security
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });

    it('should handle very long session tokens', async () => {
      const longToken = 'a'.repeat(10000);
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: longToken })
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null);

      await GET(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith(longToken);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { authenticated: false, user: null },
        { status: 401 }
      );
    });
  });
});
