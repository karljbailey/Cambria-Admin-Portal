// @ts-nocheck
import { POST } from '../../app/api/audit/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/audit-utils', () => ({
  addAuditLog: jest.fn()
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import mocked modules
import { addAuditLog } from '@/lib/audit-utils';
import { NextResponse } from 'next/server';

describe('Audit POST API E2E Tests', () => {
  let mockAddAuditLog: jest.MockedFunction<typeof addAuditLog>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mocks
    mockAddAuditLog = addAuditLog as jest.MockedFunction<typeof addAuditLog>;
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

  const validAuditData = {
    userId: 'user123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: 'auth123',
    resourceName: 'Authentication',
    details: 'User logged in successfully',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  };

  describe('POST /api/audit - Successful Audit Creation', () => {
    it('should successfully create audit log with all fields', async () => {
      const expectedResponse = {
        id: 'log123',
        ...validAuditData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should create audit log with minimal required fields', async () => {
      const minimalData = {
        userId: 'user456',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        action: 'FILE_UPLOAD',
        resource: 'files',
        resourceId: 'file789',
        resourceName: 'Document.pdf',
        details: 'User uploaded document'
      };
      const expectedResponse = {
        id: 'log124',
        ...minimalData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(minimalData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(minimalData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle different action types', async () => {
      const updateData = {
        ...validAuditData,
        action: 'UPDATE_CLIENT',
        resource: 'clients',
        resourceId: 'client456',
        resourceName: 'ACME Corporation',
        details: 'Updated client information'
      };
      const expectedResponse = {
        id: 'log125',
        ...updateData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(updateData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(updateData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle Firebase returning null response', async () => {
      mockAddAuditLog.mockResolvedValue(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(null);
    });

    it('should handle Firebase returning undefined response', async () => {
      mockAddAuditLog.mockResolvedValue(undefined);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(undefined);
    });
  });

  describe('POST /api/audit - Input Validation Errors', () => {
    it('should handle missing required fields error', async () => {
      const invalidData = { ...validAuditData };
      delete invalidData.userId;
      
      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(invalidData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle empty string values error', async () => {
      const invalidData = {
        ...validAuditData,
        userId: '',
        userName: '',
        action: ''
      };
      
      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(invalidData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle null values error', async () => {
      const invalidData = {
        ...validAuditData,
        userId: null,
        userName: null,
        userEmail: null
      };
      
      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(invalidData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle undefined values error', async () => {
      const invalidData = {
        ...validAuditData,
        action: undefined,
        resource: undefined,
        details: undefined
      };
      
      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(invalidData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(invalidData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/audit - Firebase Configuration Errors', () => {
    it('should handle Firebase not configured error', async () => {
      mockAddAuditLog.mockRejectedValue(new Error('Firebase is not configured. Cannot add audit log.'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase is not configured. Cannot add audit log.');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/audit - Firebase Service Errors', () => {
    it('should handle Firebase connection errors', async () => {
      const connectionError = new Error('Firebase connection failed');
      mockAddAuditLog.mockRejectedValue(connectionError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase connection failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase permission errors', async () => {
      const permissionError = new Error('Insufficient permissions to write to audit logs');
      permissionError.name = 'PermissionError';
      mockAddAuditLog.mockRejectedValue(permissionError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: PermissionError: Insufficient permissions to write to audit logs');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded for audit logs collection');
      quotaError.name = 'QuotaExceededError';
      mockAddAuditLog.mockRejectedValue(quotaError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: QuotaExceededError: Quota exceeded for audit logs collection');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase authentication errors', async () => {
      const authError = new Error('Authentication failed - invalid service account');
      authError.name = 'AuthenticationError';
      mockAddAuditLog.mockRejectedValue(authError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: AuthenticationError: Authentication failed - invalid service account');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase timeout errors', async () => {
      const timeoutError = new Error('Request timeout after 30 seconds');
      timeoutError.name = 'TimeoutError';
      mockAddAuditLog.mockRejectedValue(timeoutError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: TimeoutError: Request timeout after 30 seconds');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase service unavailable errors', async () => {
      const serviceError = new Error('Firebase service temporarily unavailable');
      serviceError.name = 'ServiceUnavailableError';
      mockAddAuditLog.mockRejectedValue(serviceError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: ServiceUnavailableError: Firebase service temporarily unavailable');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle Firebase initialization errors', async () => {
      const initError = new Error('auditLogsService is not initialized');
      mockAddAuditLog.mockRejectedValue(initError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: Error: auditLogsService is not initialized');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/audit - Request Parsing Errors', () => {
    it('should handle malformed JSON in request body', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token } in JSON at position 25'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockAddAuditLog).not.toHaveBeenCalled();
      expect(consoleErrors).toContain('Error adding audit log: SyntaxError: Unexpected token } in JSON at position 25');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle empty request body', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(null)
      } as unknown as NextRequest;

      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockAddAuditLog).toHaveBeenCalledWith(null);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle undefined request body', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(undefined)
      } as unknown as NextRequest;

      mockAddAuditLog.mockRejectedValue(new Error('Missing required fields for audit log'));

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockAddAuditLog).toHaveBeenCalledWith(undefined);
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle request body parsing timeout', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Request timeout while parsing body'))
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockAddAuditLog).not.toHaveBeenCalled();
      expect(consoleErrors).toContain('Error adding audit log: Error: Request timeout while parsing body');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/audit - Data Format and Edge Cases', () => {
    it('should handle very long field values', async () => {
      const longData = {
        ...validAuditData,
        userId: 'a'.repeat(1000),
        userName: 'b'.repeat(1000),
        userEmail: 'c'.repeat(500) + '@example.com',
        details: 'd'.repeat(10000),
        ipAddress: '192.168.1.100',
        userAgent: 'f'.repeat(2000)
      };
      const expectedResponse = {
        id: 'log126',
        ...longData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(longData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(longData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle special characters in fields', async () => {
      const specialCharData = {
        ...validAuditData,
        userName: 'José María O\'Connor-Smith',
        userEmail: 'test+tag@example.com',
        details: 'User performed action with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      const expectedResponse = {
        id: 'log127',
        ...specialCharData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(specialCharData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(specialCharData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle unicode characters in fields', async () => {
      const unicodeData = {
        ...validAuditData,
        userName: '张三李四王五',
        userEmail: 'test@测试.com',
        details: 'User performed action with unicode: 🚀🌟🎉',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      };
      const expectedResponse = {
        id: 'log128',
        ...unicodeData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(unicodeData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(unicodeData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle extra fields in request body', async () => {
      const dataWithExtraFields = {
        ...validAuditData,
        extraField1: 'should be ignored',
        extraField2: 12345,
        extraField3: { nested: 'object' },
        extraField4: ['array', 'data']
      };
      const expectedResponse = {
        id: 'log129',
        ...dataWithExtraFields,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(dataWithExtraFields)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(dataWithExtraFields);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle numeric values as strings', async () => {
      const numericData = {
        ...validAuditData,
        userId: 123,
        resourceId: 456,
        details: 789
      };
      const expectedResponse = {
        id: 'log130',
        ...numericData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(numericData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(numericData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe('POST /api/audit - Performance and Stress Testing', () => {
    it('should handle extremely large audit log data', async () => {
      const largeData = {
        ...validAuditData,
        details: 'x'.repeat(100000), // 100KB details field
        userAgent: 'u'.repeat(50000) // 50KB user agent
      };
      const expectedResponse = {
        id: 'log131',
        ...largeData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValue(expectedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(largeData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(largeData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle addAuditLog taking a long time to respond', async () => {
      const expectedResponse = {
        id: 'log132',
        ...validAuditData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };

      // Simulate slow Firebase response
      mockAddAuditLog.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(expectedResponse), 100))
      );

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      const startTime = Date.now();
      await POST(mockRequest);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle concurrent audit log creation attempts', async () => {
      const expectedResponse1 = { id: 'log133', ...validAuditData, timestamp: '2024-01-15T10:30:00.000Z' };
      const expectedResponse2 = { id: 'log134', ...validAuditData, timestamp: '2024-01-15T10:30:01.000Z' };
      
      mockAddAuditLog.mockResolvedValueOnce(expectedResponse1);
      mockAddAuditLog.mockResolvedValueOnce(expectedResponse2);

      const mockRequest1 = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;
      
      const mockRequest2 = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        POST(mockRequest1),
        POST(mockRequest2)
      ]);

      expect(mockAddAuditLog).toHaveBeenCalledTimes(2);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse1);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse2);
    });
  });

  describe('POST /api/audit - Error Recovery and Resilience', () => {
    it('should handle intermittent Firebase errors gracefully', async () => {
      // First call fails, second succeeds
      mockAddAuditLog.mockRejectedValueOnce(new Error('Firebase connection temporarily failed'));
      
      const expectedResponse = {
        id: 'log135',
        ...validAuditData,
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      mockAddAuditLog.mockResolvedValueOnce(expectedResponse);

      const mockRequest1 = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;
      
      const mockRequest2 = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      // First call should fail
      await POST(mockRequest1);
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase connection temporarily failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );

      // Second call should succeed
      await POST(mockRequest2);
      expect(mockNextResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle network timeout with proper error response', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockAddAuditLog.mockRejectedValue(timeoutError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: TimeoutError: Network timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });

    it('should handle unexpected error types', async () => {
      const unexpectedError = new TypeError('Cannot read property of undefined');
      mockAddAuditLog.mockRejectedValue(unexpectedError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validAuditData)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockAddAuditLog).toHaveBeenCalledWith(validAuditData);
      expect(consoleErrors).toContain('Error adding audit log: TypeError: Cannot read property of undefined');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add audit log' },
        { status: 500 }
      );
    });
  });
});
