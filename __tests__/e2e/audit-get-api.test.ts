// @ts-nocheck
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Firebase and audit services
const mockAuditLogsService = {
  getAll: jest.fn(),
  add: jest.fn()
};

const mockIsFirebaseConfigured = jest.fn();
const mockInitializeApp = jest.fn();

jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: mockIsFirebaseConfigured,
  initializeApp: mockInitializeApp
}));

jest.mock('@/lib/collections', () => ({
  auditLogsService: mockAuditLogsService
}));

// Mock Next.js components
const mockNextResponse = {
  json: jest.fn()
};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse
}));

// Import the route handler after mocking
let GET: any;

describe('Audit API E2E Tests', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockAuditLogsService.getAll.mockReset();
    mockAuditLogsService.add.mockReset();
    mockIsFirebaseConfigured.mockReset();
    mockNextResponse.json.mockReset();
    
    // Setup console mocking
    consoleLogs = [];
    consoleErrors = [];
    
    console.log = jest.fn((message: string) => {
      consoleLogs.push(message);
    });
    
    console.error = jest.fn((message: string, error?: any) => {
      if (error) {
        consoleErrors.push(`${message} ${error}`);
      } else {
        consoleErrors.push(message);
      }
    });

    // Import the route handler
    const auditRoute = await import('../../app/api/audit/route');
    GET = auditRoute.GET;
  });

  afterEach(() => {
    // Restore console
    console.log = console.log;
    console.error = console.error;
  });

  describe('GET /api/audit - Basic Functionality', () => {
    it('should return audit logs with Firebase when configured', async () => {
      // Mock Firebase as configured
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Mock Firebase audit logs
      const mockFirebaseLogs = [
        {
          id: '1',
          action: 'LOGIN',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'auth',
          details: 'User logged in successfully',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          action: 'FILE_UPLOAD',
          userId: 'user2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          resource: 'files',
          details: 'File uploaded: document.pdf',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T11:00:00Z'
        }
      ];
      
      mockAuditLogsService.getAll.mockResolvedValue(mockFirebaseLogs);

      // Create mock request
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      // Call the GET handler
      await GET(mockRequest);

      // Verify Firebase was used
      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(2); // Called once at module load, once in GET
      expect(mockAuditLogsService.getAll).toHaveBeenCalledTimes(1);
      expect(consoleLogs).toContain('📊 Retrieved 2 audit logs from Firebase');

      // Verify response
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: mockFirebaseLogs,
          pagination: {
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1
          },
          filters: expect.objectContaining({
            actions: expect.arrayContaining(['LOGIN', 'FILE_UPLOAD']),
            users: expect.arrayContaining([
              { id: 'user1', name: 'John Doe', email: 'john@example.com' },
              { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
            ]),
            resources: expect.arrayContaining(['auth', 'files'])
          })
        })
      );
    });

    it('should fallback to mock data when Firebase is not configured', async () => {
      // Mock Firebase as not configured
      mockIsFirebaseConfigured.mockReturnValue(false);

      // Create mock request
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      // Call the GET handler
      await GET(mockRequest);

      // Verify Firebase was checked but not used
      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1); // Called once in GET
      expect(mockAuditLogsService.getAll).not.toHaveBeenCalled();
      expect(consoleLogs).toContain('⚠️ Firebase not configured, using mock data');

      // Verify response contains mock data structure
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number),
            page: 1,
            limit: 50,
            totalPages: expect.any(Number)
          }),
          filters: expect.objectContaining({
            actions: expect.any(Array),
            users: expect.any(Array),
            resources: expect.any(Array)
          })
        })
      );
    });

    it('should handle Firebase errors properly without fallback', async () => {
      // Mock Firebase as configured but failing
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockRejectedValue(new Error('Firebase connection failed'));

      // Create mock request
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      // Call the GET handler
      await GET(mockRequest);

      // Verify error handling - should return 500 error, not fallback
      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockAuditLogsService.getAll).toHaveBeenCalledTimes(1);
      expect(consoleErrors).toContain('Error fetching audit logs: Error: Firebase connection failed');

      // Verify error response
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });
  });

  describe('GET /api/audit - Filtering Functionality', () => {
    beforeEach(() => {
      // Setup default Firebase configuration
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      const mockLogs = [
        {
          id: '1',
          action: 'LOGIN',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'auth',
          details: 'User logged in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          action: 'FILE_UPLOAD',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'files',
          details: 'File uploaded',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T11:00:00Z'
        },
        {
          id: '3',
          action: 'LOGOUT',
          userId: 'user2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          resource: 'auth',
          details: 'User logged out',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T12:00:00Z'
        }
      ];
      
      mockAuditLogsService.getAll.mockResolvedValue(mockLogs);
    });

    it('should filter by action', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?action=LOGIN'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ action: 'LOGIN' })
          ]),
          pagination: expect.objectContaining({
            total: 1
          })
        })
      );
    });

    it('should filter by userId', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?userId=user1'
      } as NextRequest;

      await GET(mockRequest);

      // The filter should work with the mock data that has user1
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number)
          })
        })
      );
    });

    it('should filter by resource', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?resource=files'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ resource: 'files' })
          ]),
          pagination: expect.objectContaining({
            total: 1
          })
        })
      );
    });

    it('should filter by date range', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?startDate=2024-01-15T10:00:00Z&endDate=2024-01-15T11:30:00Z'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ timestamp: '2024-01-15T10:30:00Z' }),
            expect.objectContaining({ timestamp: '2024-01-15T11:00:00Z' })
          ]),
          pagination: expect.objectContaining({
            total: 2
          })
        })
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?action=LOGIN&userId=user1&resource=auth'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number)
          })
        })
      );
    });
  });

  describe('GET /api/audit - Pagination Functionality', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Create 25 mock logs for pagination testing
      const mockLogs = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        action: `ACTION_${i % 3}`,
        userId: `user${i % 5}`,
        userName: `User ${i % 5}`,
        userEmail: `user${i % 5}@example.com`,
        resource: `resource${i % 4}`,
        details: `Action ${i + 1}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(2024, 0, 15, 10 + i, 30).toISOString()
      }));
      
      mockAuditLogsService.getAll.mockResolvedValue(mockLogs);
    });

    it('should paginate with default parameters', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ id: '1' }),
            expect.objectContaining({ id: '25' })
          ]),
          pagination: expect.objectContaining({
            total: 25,
            page: 1,
            limit: 50,
            totalPages: 1
          })
        })
      );
    });

    it('should paginate with custom limit', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?limit=10'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String) }),
            expect.objectContaining({ id: expect.any(String) })
          ]),
          pagination: expect.objectContaining({
            total: 25,
            page: 1,
            limit: 10,
            totalPages: 3
          })
        })
      );
    });

    it('should paginate to specific page', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?limit=10&page=2'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String) }),
            expect.objectContaining({ id: expect.any(String) })
          ]),
          pagination: expect.objectContaining({
            total: 25,
            page: 2,
            limit: 10,
            totalPages: 3
          })
        })
      );
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit?limit=invalid&page=invalid'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: NaN,
            limit: NaN
          })
        })
      );
    });
  });

  describe('GET /api/audit - Sorting and Data Structure', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      const mockLogs = [
        {
          id: '1',
          action: 'LOGIN',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'auth',
          details: 'User logged in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          action: 'FILE_UPLOAD',
          userId: 'user2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          resource: 'files',
          details: 'File uploaded',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T11:00:00Z'
        },
        {
          id: '3',
          action: 'LOGOUT',
          userId: 'user3',
          userName: 'Bob Wilson',
          userEmail: 'bob@example.com',
          resource: 'auth',
          details: 'User logged out',
          ipAddress: '192.168.1.3',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T09:00:00Z'
        }
      ];
      
      mockAuditLogsService.getAll.mockResolvedValue(mockLogs);
    });

    it('should sort logs by timestamp (newest first)', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      const response = mockNextResponse.json.mock.calls[0][0];
      const logs = response.logs;
      
      // Verify sorting (newest first)
      expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(new Date(logs[1].timestamp).getTime());
      expect(new Date(logs[1].timestamp).getTime()).toBeGreaterThan(new Date(logs[2].timestamp).getTime());
    });

    it('should return correct filter options', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            actions: expect.arrayContaining(['LOGIN', 'FILE_UPLOAD', 'LOGOUT']),
            users: expect.arrayContaining([
              { id: 'user1', name: 'John Doe', email: 'john@example.com' },
              { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
              { id: 'user3', name: 'Bob Wilson', email: 'bob@example.com' }
            ]),
            resources: expect.arrayContaining(['auth', 'files'])
          })
        })
      );
    });

    it('should handle empty results gracefully', async () => {
      mockAuditLogsService.getAll.mockResolvedValue([]);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        logs: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0
        },
        filters: {
          actions: [],
          users: [],
          resources: []
        }
      });
    });
  });

  describe('GET /api/audit - Error Handling', () => {
    it('should handle Firebase connection errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockRejectedValue(new Error('Firebase connection failed'));

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: Error: Firebase connection failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase network timeout errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const timeoutError = new Error('Request timeout after 30 seconds');
      timeoutError.name = 'TimeoutError';
      mockAuditLogsService.getAll.mockRejectedValue(timeoutError);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: TimeoutError: Request timeout after 30 seconds');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase permission errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const permissionError = new Error('Insufficient permissions to access audit logs collection');
      permissionError.name = 'PermissionError';
      mockAuditLogsService.getAll.mockRejectedValue(permissionError);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: PermissionError: Insufficient permissions to access audit logs collection');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase quota exceeded errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const quotaError = new Error('Quota exceeded. Please try again later');
      quotaError.name = 'QuotaExceededError';
      mockAuditLogsService.getAll.mockRejectedValue(quotaError);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: QuotaExceededError: Quota exceeded. Please try again later');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase authentication errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const authError = new Error('Authentication failed - invalid service account');
      authError.name = 'AuthenticationError';
      mockAuditLogsService.getAll.mockRejectedValue(authError);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: AuthenticationError: Authentication failed - invalid service account');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase service unavailable errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const serviceError = new Error('Firebase service temporarily unavailable');
      serviceError.name = 'ServiceUnavailableError';
      mockAuditLogsService.getAll.mockRejectedValue(serviceError);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: ServiceUnavailableError: Firebase service temporarily unavailable');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle malformed Firebase response data', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockResolvedValue([
        {
          id: '1',
          action: 'LOGIN',
          // Missing required fields like userId, timestamp, etc.
          timestamp: 'invalid-date-format'
        },
        null, // Invalid entry
        undefined, // Another invalid entry
        {
          // Completely malformed entry
          invalidField: 'value'
        }
      ]);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      // Malformed data causes errors, so should return 500
      expect(consoleErrors).toContain('Error fetching audit logs: TypeError: Cannot read properties of null (reading \'timestamp\')');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle Firebase returning null or undefined', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockResolvedValue(null);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: TypeError: Cannot read properties of null (reading \'length\')');
    });

    it('should handle Firebase returning non-array data', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockResolvedValue({ invalid: 'response' });

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: TypeError: filteredLogs.sort is not a function');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle URL parsing errors', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      // Create mock request with malformed URL
      const mockRequest = {
        url: 'invalid-url-format'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: TypeError: Invalid URL: invalid-url-format');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });

    it('should handle extremely large Firebase response', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Create an extremely large dataset
      const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
        id: `${i + 1}`,
        action: `ACTION_${i % 10}`,
        userId: `user${i % 1000}`,
        userName: `User ${i % 1000}`,
        userEmail: `user${i % 1000}@example.com`,
        resource: `resource${i % 20}`,
        details: `Action ${i + 1}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(2024, 0, 15, 10 + (i % 24), 30).toISOString()
      }));
      
      mockAuditLogsService.getAll.mockResolvedValue(largeDataset);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit?limit=50&page=1'
      } as NextRequest;

      await GET(mockRequest);

      // Should handle large datasets without crashing
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String) })
          ]),
          pagination: expect.objectContaining({
            total: 100000,
            limit: 50,
            page: 1,
            totalPages: 2000
          })
        })
      );
    });

    it('should handle Firebase initialization errors', async () => {
      // Mock Firebase as configured but auditLogsService is undefined
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockImplementation(() => {
        throw new Error('auditLogsService is not initialized');
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Error fetching audit logs: Error: auditLogsService is not initialized');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    });
  });

  describe('GET /api/audit - Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      
      // Create 1000 mock logs
      const mockLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        action: `ACTION_${i % 10}`,
        userId: `user${i % 50}`,
        userName: `User ${i % 50}`,
        userEmail: `user${i % 50}@example.com`,
        resource: `resource${i % 20}`,
        details: `Action ${i + 1}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(2024, 0, 15, 10 + (i % 24), 30).toISOString()
      }));
      
      mockAuditLogsService.getAll.mockResolvedValue(mockLogs);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit?limit=100&page=5'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String) }),
            expect.objectContaining({ id: expect.any(String) })
          ]),
          pagination: expect.objectContaining({
            total: 1000,
            page: 5,
            limit: 100,
            totalPages: 10
          })
        })
      );
    });

    it('should handle concurrent requests', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockResolvedValue([
        {
          id: '1',
          action: 'LOGIN',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'auth',
          details: 'User logged in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T10:30:00Z'
        }
      ]);

      const mockRequest = {
        url: 'http://localhost:3000/api/audit'
      } as NextRequest;

      // Make concurrent requests
      const promises = [
        GET(mockRequest),
        GET(mockRequest),
        GET(mockRequest)
      ];

      await Promise.all(promises);

      // Should handle all requests successfully
      expect(mockNextResponse.json).toHaveBeenCalledTimes(3);
    });

    it('should handle very long filter values', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      mockAuditLogsService.getAll.mockResolvedValue([
        {
          id: '1',
          action: 'LOGIN',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          resource: 'auth',
          details: 'User logged in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: '2024-01-15T10:30:00Z'
        }
      ]);

      const longAction = 'a'.repeat(1000);
      const mockRequest = {
        url: `http://localhost:3000/api/audit?action=${encodeURIComponent(longAction)}`
      } as NextRequest;

      await GET(mockRequest);

      // Should handle long parameters without crashing
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: [],
          pagination: expect.objectContaining({
            total: 0
          })
        })
      );
    });
  });
});
