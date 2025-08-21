// @ts-nocheck
import { POST } from '../../app/api/auth/logout/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/auth', () => ({
  validateSessionToken: jest.fn()
}));

jest.mock('@/lib/audit', () => ({
  auditHelpers: {
    userLoggedOut: jest.fn().mockResolvedValue(true)
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
import { auditHelpers } from '@/lib/audit';
import { NextResponse } from 'next/server';

describe('Logout API E2E Tests', () => {
  let mockValidateSessionToken: jest.MockedFunction<typeof validateSessionToken>;
  let mockAuditHelpersUserLoggedOut: jest.MockedFunction<typeof auditHelpers.userLoggedOut>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mocks
    mockValidateSessionToken = validateSessionToken as jest.MockedFunction<typeof validateSessionToken>;
    mockAuditHelpersUserLoggedOut = auditHelpers.userLoggedOut as jest.MockedFunction<typeof auditHelpers.userLoggedOut>;
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

    // Mock NextResponse.json to return a mock response with cookies.set method
    const mockResponse = {
      json: async () => ({}),
      cookies: {
        set: jest.fn()
      }
    };
    mockNextResponse.json.mockReturnValue(mockResponse as any);
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

  describe('POST /api/auth/logout - Valid Session', () => {
    it('should successfully logout user with valid session token', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);

      await POST(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).toHaveBeenCalledWith(validSessionToken);
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'test@example.com',
        'test', // Username extracted from email
        'Mozilla/5.0 Test Browser'
      );
      
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });

      const response = mockNextResponse.json.mock.results[0].value;
      expect(response.cookies.set).toHaveBeenCalledWith('session_token', '', {
        httpOnly: true,
        secure: false, // NODE_ENV is not production in test
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });
    });

    it('should handle user with complex email format', async () => {
      const complexEmail = 'test.user+tag@example.com';
      const complexSessionData = {
        ...validSessionData,
        email: complexEmail
      };
      
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(complexSessionData);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        complexEmail,
        'test.user+tag', // Username extracted from complex email
        'Mozilla/5.0 Test Browser'
      );
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);

      await POST(mockRequest);

      const response = mockNextResponse.json.mock.results[0].value;
      expect(response.cookies.set).toHaveBeenCalledWith('session_token', '', {
        httpOnly: true,
        secure: true, // Should be true in production
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle missing user agent header', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'test@example.com',
        'test',
        'Unknown'
      );
    });
  });

  describe('POST /api/auth/logout - Invalid/Missing Session', () => {
    it('should successfully logout even without session token', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session_token');
      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
      
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });

      const response = mockNextResponse.json.mock.results[0].value;
      expect(response.cookies.set).toHaveBeenCalledWith('session_token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });
    });

    it('should successfully logout with empty session token', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: '' })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
    });

    it('should handle invalid session token gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'invalid-token' })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null);

      await POST(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith('invalid-token');
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
      
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle session validation throwing error gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockImplementation(() => {
        throw new Error('Token validation failed');
      });

      await POST(mockRequest);

      expect(mockValidateSessionToken).toHaveBeenCalledWith(validSessionToken);
      expect(consoleLogs).toContain('Invalid session token during logout: Token validation failed');
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
      
      // Should still proceed with successful logout
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('POST /api/auth/logout - Audit Logging', () => {
    it('should handle audit logging error gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);
      mockAuditHelpersUserLoggedOut.mockRejectedValue(new Error('Audit logging failed'));

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'test@example.com',
        'test',
        'Mozilla/5.0 Test Browser'
      );
      expect(consoleErrors).toContain('Error logging audit: Error: Audit logging failed');
      
      // Should still proceed with successful logout
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should log logout attempt even for unknown users', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
    });
  });

  describe('POST /api/auth/logout - Edge Cases', () => {
    it('should handle session token with null value', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: null })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockValidateSessionToken).not.toHaveBeenCalled();
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
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
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(incompleteSessionData as any);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'Unknown',
        'Unknown',
        'Mozilla/5.0 Test Browser'
      );
    });

    it('should handle email with no @ symbol', async () => {
      const invalidEmailSessionData = {
        ...validSessionData,
        email: 'invalid-email-format'
      };
      
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(invalidEmailSessionData);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'invalid-email-format',
        'invalid-email-format', // Whole string used as username when no @ found
        'Mozilla/5.0 Test Browser'
      );
    });

    it('should handle email with empty username part', async () => {
      const emptyUsernameSessionData = {
        ...validSessionData,
        email: '@example.com'
      };
      
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(emptyUsernameSessionData);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        '@example.com',
        '', // Empty string when splitting email with empty username
        'Mozilla/5.0 Test Browser'
      );
    });
  });

  describe('POST /api/auth/logout - Error Handling and Resilience', () => {
    it('should handle general errors gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Cookie access failed');
          })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Logout error: Error: Cookie access failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });

    it('should handle concurrent logout requests', async () => {
      const mockRequest1 = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Browser 1')
        }
      } as unknown as NextRequest;

      const mockRequest2 = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue('Browser 2')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);

      const [result1, result2] = await Promise.all([
        POST(mockRequest1),
        POST(mockRequest2)
      ]);

      expect(mockValidateSessionToken).toHaveBeenCalledTimes(2);
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledTimes(2);
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenNthCalledWith(1, 'test@example.com', 'test', 'Browser 1');
      expect(mockAuditHelpersUserLoggedOut).toHaveBeenNthCalledWith(2, 'test@example.com', 'test', 'Browser 2');
    });

    it('should handle undefined headers gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: validSessionToken })
        },
        headers: {
          get: jest.fn().mockReturnValue(undefined)
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(validSessionData);

      await POST(mockRequest);

      expect(mockAuditHelpersUserLoggedOut).toHaveBeenCalledWith(
        'test@example.com',
        'test',
        'Unknown'
      );
    });
  });

  describe('POST /api/auth/logout - Security', () => {
    it('should always clear session cookie regardless of token validity', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'completely-invalid-token' })
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      mockValidateSessionToken.mockReturnValue(null);

      await POST(mockRequest);

      const response = mockNextResponse.json.mock.results[0].value;
      expect(response.cookies.set).toHaveBeenCalledWith('session_token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });
    });

    it('should always return success to prevent information disclosure', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        },
        headers: {
          get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser')
        }
      } as unknown as NextRequest;

      await POST(mockRequest);

      // Should always return success, never reveal if session was valid
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });
});
