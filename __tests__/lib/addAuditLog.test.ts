// @ts-nocheck
import { addAuditLog } from '../../lib/audit-utils';

// Mock dependencies
jest.mock('@/lib/init', () => ({
  isFirebaseConfigured: jest.fn()
}));

jest.mock('@/lib/collections', () => ({
  auditLogsService: {
    add: jest.fn()
  }
}));

// Import mocked modules
import { isFirebaseConfigured } from '@/lib/init';
import { auditLogsService } from '@/lib/collections';

describe('addAuditLog', () => {
  let mockIsFirebaseConfigured: jest.MockedFunction<typeof isFirebaseConfigured>;
  let mockAuditLogsServiceAdd: jest.MockedFunction<typeof auditLogsService.add>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mocks
    mockIsFirebaseConfigured = isFirebaseConfigured as jest.MockedFunction<typeof isFirebaseConfigured>;
    mockAuditLogsServiceAdd = auditLogsService.add as jest.MockedFunction<typeof auditLogsService.add>;
    
    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock Date for consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const validLogData = {
    userId: 'user123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: 'auth123',
    resourceName: 'Authentication',
    details: 'User logged in successfully'
  };

  describe('Successful Audit Log Creation', () => {
    it('should successfully add audit log with all required fields', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const mockResponse = { id: 'log123', ...validLogData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(validLogData);

      expect(mockIsFirebaseConfigured).toHaveBeenCalledTimes(1);
      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...validLogData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(result).toEqual(mockResponse);
      expect(consoleLogs).toContain('📝 Added audit log for user user123 - LOGIN on auth');
    });

    it('should add audit log with provided ipAddress and userAgent', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const logDataWithIP = {
        ...validLogData,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      const mockResponse = { id: 'log124', ...logDataWithIP, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(logDataWithIP);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...logDataWithIP,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle different action types', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      const fileUploadData = {
        ...validLogData,
        action: 'FILE_UPLOAD',
        resource: 'files',
        resourceId: 'file456',
        resourceName: 'Document.pdf',
        details: 'User uploaded document'
      };
      const mockResponse = { id: 'log125', ...fileUploadData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(fileUploadData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...fileUploadData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(result).toEqual(mockResponse);
      expect(consoleLogs).toContain('📝 Added audit log for user user123 - FILE_UPLOAD on files');
    });
  });

  describe('Input Validation', () => {
    it('should throw error for missing userId', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.userId;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing userName', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.userName;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing userEmail', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.userEmail;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing action', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.action;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing resource', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.resource;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing resourceId', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.resourceId;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing resourceName', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.resourceName;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for missing details', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.details;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for empty string values', async () => {
      const invalidData = {
        ...validLogData,
        userId: '',
        userName: '',
        userEmail: '',
        action: '',
        resource: '',
        resourceId: '',
        resourceName: '',
        details: ''
      };

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for null values', async () => {
      const invalidData = {
        ...validLogData,
        userId: null,
        userName: null,
        userEmail: null,
        action: null,
        resource: null,
        resourceId: null,
        resourceName: null,
        details: null
      };

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should throw error for undefined values', async () => {
      const invalidData = {
        ...validLogData,
        userId: undefined,
        userName: undefined,
        userEmail: undefined,
        action: undefined,
        resource: undefined,
        resourceId: undefined,
        resourceName: undefined,
        details: undefined
      };

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });
  });

  describe('Firebase Configuration Errors', () => {
    it('should throw error when Firebase is not configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Firebase is not configured. Cannot add audit log.');
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase is not configured. Cannot add audit log.');
    });
  });

  describe('Firebase Service Errors', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should handle Firebase connection errors', async () => {
      mockAuditLogsServiceAdd.mockRejectedValue(new Error('Firebase connection failed'));

      await expect(addAuditLog(validLogData)).rejects.toThrow('Firebase connection failed');
      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...validLogData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase connection failed');
    });

    it('should handle Firebase permission errors', async () => {
      const permissionError = new Error('Insufficient permissions to write to audit logs');
      permissionError.name = 'PermissionError';
      mockAuditLogsServiceAdd.mockRejectedValue(permissionError);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Insufficient permissions to write to audit logs');
      expect(consoleErrors).toContain('Error adding audit log: PermissionError: Insufficient permissions to write to audit logs');
    });

    it('should handle Firebase quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded for audit logs collection');
      quotaError.name = 'QuotaExceededError';
      mockAuditLogsServiceAdd.mockRejectedValue(quotaError);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Quota exceeded for audit logs collection');
      expect(consoleErrors).toContain('Error adding audit log: QuotaExceededError: Quota exceeded for audit logs collection');
    });

    it('should handle Firebase authentication errors', async () => {
      const authError = new Error('Authentication failed - invalid service account');
      authError.name = 'AuthenticationError';
      mockAuditLogsServiceAdd.mockRejectedValue(authError);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Authentication failed - invalid service account');
      expect(consoleErrors).toContain('Error adding audit log: AuthenticationError: Authentication failed - invalid service account');
    });

    it('should handle Firebase timeout errors', async () => {
      const timeoutError = new Error('Request timeout after 30 seconds');
      timeoutError.name = 'TimeoutError';
      mockAuditLogsServiceAdd.mockRejectedValue(timeoutError);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Request timeout after 30 seconds');
      expect(consoleErrors).toContain('Error adding audit log: TimeoutError: Request timeout after 30 seconds');
    });

    it('should handle Firebase service unavailable errors', async () => {
      const serviceError = new Error('Firebase service temporarily unavailable');
      serviceError.name = 'ServiceUnavailableError';
      mockAuditLogsServiceAdd.mockRejectedValue(serviceError);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Firebase service temporarily unavailable');
      expect(consoleErrors).toContain('Error adding audit log: ServiceUnavailableError: Firebase service temporarily unavailable');
    });

    it('should handle Firebase returning null response', async () => {
      mockAuditLogsServiceAdd.mockResolvedValue(null);

      const result = await addAuditLog(validLogData);
      expect(result).toBeNull();
      expect(consoleLogs).toContain('📝 Added audit log for user user123 - LOGIN on auth');
    });

    it('should handle Firebase returning undefined response', async () => {
      mockAuditLogsServiceAdd.mockResolvedValue(undefined);

      const result = await addAuditLog(validLogData);
      expect(result).toBeUndefined();
      expect(consoleLogs).toContain('📝 Added audit log for user user123 - LOGIN on auth');
    });
  });

  describe('Data Format and Edge Cases', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should handle very long field values', async () => {
      const longData = {
        ...validLogData,
        userId: 'a'.repeat(1000),
        userName: 'b'.repeat(1000),
        userEmail: 'c'.repeat(1000),
        details: 'd'.repeat(10000),
        ipAddress: 'e'.repeat(500),
        userAgent: 'f'.repeat(2000)
      };
      const mockResponse = { id: 'log126', ...longData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(longData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...longData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'e'.repeat(500),
        userAgent: 'f'.repeat(2000)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle special characters in fields', async () => {
      const specialCharData = {
        ...validLogData,
        userName: 'José María O\'Connor-Smith',
        userEmail: 'test+tag@example.com',
        details: 'User performed action with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      const mockResponse = { id: 'log127', ...specialCharData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(specialCharData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...specialCharData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle unicode characters in fields', async () => {
      const unicodeData = {
        ...validLogData,
        userName: '张三李四王五',
        userEmail: 'test@测试.com',
        details: 'User performed action with unicode: 🚀🌟🎉',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      };
      const mockResponse = { id: 'log128', ...unicodeData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(unicodeData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...unicodeData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty ipAddress and userAgent with N/A fallback', async () => {
      const dataWithoutIP = {
        ...validLogData,
        ipAddress: '',
        userAgent: ''
      };
      const mockResponse = { id: 'log129', ...dataWithoutIP, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(dataWithoutIP);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...dataWithoutIP,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle whitespace-only ipAddress and userAgent with N/A fallback', async () => {
      const dataWithWhitespace = {
        ...validLogData,
        ipAddress: '   ',
        userAgent: '\t\n\r'
      };
      const mockResponse = { id: 'log130', ...dataWithWhitespace, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      const result = await addAuditLog(dataWithWhitespace);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...dataWithWhitespace,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Timestamp Generation', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should generate consistent timestamps', async () => {
      const mockResponse = { id: 'log131', ...validLogData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      await addAuditLog(validLogData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...validLogData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
    });

    it('should generate different timestamps for different calls', async () => {
      const mockResponse1 = { id: 'log132', ...validLogData, timestamp: '2024-01-15T10:30:00.000Z' };
      const mockResponse2 = { id: 'log133', ...validLogData, timestamp: '2024-01-15T10:30:01.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValueOnce(mockResponse1);
      mockAuditLogsServiceAdd.mockResolvedValueOnce(mockResponse2);

      await addAuditLog(validLogData);
      
      jest.advanceTimersByTime(1000);
      
      await addAuditLog(validLogData);

      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...validLogData,
        timestamp: '2024-01-15T10:30:00.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
      expect(mockAuditLogsServiceAdd).toHaveBeenCalledWith({
        ...validLogData,
        timestamp: '2024-01-15T10:30:01.000Z',
        ipAddress: 'N/A',
        userAgent: 'N/A'
      });
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      mockIsFirebaseConfigured.mockReturnValue(true);
    });

    it('should log validation errors properly', async () => {
      const invalidData = { ...validLogData };
      delete invalidData.userId;

      await expect(addAuditLog(invalidData)).rejects.toThrow('Missing required fields for audit log');
      expect(consoleErrors).toContain('Error adding audit log: Error: Missing required fields for audit log');
    });

    it('should log Firebase configuration errors properly', async () => {
      mockIsFirebaseConfigured.mockReturnValue(false);

      await expect(addAuditLog(validLogData)).rejects.toThrow('Firebase is not configured. Cannot add audit log.');
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase is not configured. Cannot add audit log.');
    });

    it('should log Firebase service errors properly', async () => {
      mockAuditLogsServiceAdd.mockRejectedValue(new Error('Firebase service error'));

      await expect(addAuditLog(validLogData)).rejects.toThrow('Firebase service error');
      expect(consoleErrors).toContain('Error adding audit log: Error: Firebase service error');
    });

    it('should log success messages properly', async () => {
      const mockResponse = { id: 'log134', ...validLogData, timestamp: '2024-01-15T10:30:00.000Z' };
      mockAuditLogsServiceAdd.mockResolvedValue(mockResponse);

      await addAuditLog(validLogData);

      expect(consoleLogs).toContain('📝 Added audit log for user user123 - LOGIN on auth');
    });
  });
});
