// @ts-nocheck
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { addAuditLog } from '../../lib/audit';

// Mock fetch globally
const mockFetch = jest.fn() as any;
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe('addAuditLog', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();
    
    // Note: getClientIP and getUserAgent are local functions in audit.ts
    // They return: '192.168.1.100' and 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('successful audit log creation', () => {
    it('should successfully add audit log with provided user data', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-123' }) } as any;
      (mockFetch as any).mockResolvedValue(mockResponse);

      const logData = {
        action: 'CREATE',
        resource: 'USER',
        resourceId: 'user-123',
        resourceName: 'John Doe',
        details: 'User created successfully'
      };

      const currentUser = {
        id: 'current-user-123',
        name: 'Current User',
        email: 'current@example.com'
      };

      const result = await addAuditLog(logData, currentUser);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user-123',
          userName: 'Current User',
          userEmail: 'current@example.com',
          action: 'CREATE',
          resource: 'USER',
          resourceId: 'user-123',
          resourceName: 'John Doe',
          details: 'User created successfully',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
      });
      expect(console.log).toHaveBeenCalledWith('✅ Audit log added successfully:', 'audit-123');
    });

    it('should fetch session data when currentUser is not provided', async () => {
      const mockSessionResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({
          authenticated: true,
          user: {
            id: 'session-user-123',
            name: 'Session User',
            email: 'session@example.com'
          }
        })
      };
      
      const mockAuditResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ id: 'audit-456' }) 
      };
      
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse) // First call for session
        .mockResolvedValueOnce(mockAuditResponse);  // Second call for audit

      const logData = {
        action: 'UPDATE',
        resource: 'PERMISSION',
        resourceId: 'perm-123',
        resourceName: 'Admin Permission',
        details: 'Permission updated'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/auth/session');
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/audit', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('session-user-123')
      }));
    });
  });

  describe('error handling - session fetching', () => {
    it('should handle session fetch network error gracefully', async () => {
      const mockAuditResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ id: 'audit-789' }) 
      };
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error')) // Session fetch fails
        .mockResolvedValueOnce(mockAuditResponse);        // Audit fetch succeeds

      const logData = {
        action: 'DELETE',
        resource: 'FILE',
        resourceId: 'file-123',
        resourceName: 'document.pdf',
        details: 'File deleted'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Error fetching session for audit log:', expect.any(Error));
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('unknown') // Should use fallback values
      }));
    });

    it('should handle session fetch with non-ok response', async () => {
      const mockSessionResponse = { 
        ok: false, 
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      const mockAuditResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ id: 'audit-101' }) 
      };
      
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockAuditResponse);

      const logData = {
        action: 'VIEW',
        resource: 'DASHBOARD',
        resourceId: 'dashboard-123',
        resourceName: 'Main Dashboard',
        details: 'Dashboard accessed'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('unknown') // Should use fallback values
      }));
    });

    it('should handle session data without user information', async () => {
      const mockSessionResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({
          authenticated: true,
          user: null // No user data
        })
      };
      
      const mockAuditResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ id: 'audit-202' }) 
      };
      
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockAuditResponse);

      const logData = {
        action: 'EXPORT',
        resource: 'DATA',
        resourceId: 'data-123',
        resourceName: 'User Data Export',
        details: 'Data exported to CSV'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('unknown') // Should use fallback values
      }));
    });
  });

  describe('error handling - audit API', () => {
    it('should handle audit API network error', async () => {
      mockFetch.mockRejectedValue(new Error('API connection failed'));

      const logData = {
        action: 'LOGIN',
        resource: 'AUTH',
        resourceId: 'auth-123',
        resourceName: 'User Login',
        details: 'User logged in successfully'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error adding audit log:', expect.any(Error));
    });

    it('should handle audit API non-ok response', async () => {
      const mockResponse = { 
        ok: false, 
        status: 400,
        statusText: 'Bad Request'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const logData = {
        action: 'UPLOAD',
        resource: 'FILE',
        resourceId: 'file-456',
        resourceName: 'image.jpg',
        details: 'File uploaded'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Failed to add audit log:', 'Bad Request');
    });

    it('should handle audit API response parsing error', async () => {
      const mockResponse = { 
        ok: true, 
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      mockFetch.mockResolvedValue(mockResponse);

      const logData = {
        action: 'DOWNLOAD',
        resource: 'FILE',
        resourceId: 'file-789',
        resourceName: 'document.docx',
        details: 'File downloaded'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error adding audit log:', expect.any(Error));
    });
  });

  describe('fallback values and edge cases', () => {
    it('should use fallback values when user data is incomplete', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-303' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const logData = {
        action: 'SEARCH',
        resource: 'USERS',
        resourceId: 'search-123',
        resourceName: 'User Search',
        details: 'Search performed'
      };

      const incompleteUser = {
        id: '', // Empty ID
        name: '', // Empty name
        email: '' // Empty email
      };

      const result = await addAuditLog(logData, incompleteUser);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('unknown') // Should use fallback values
      }));
    });

    it('should handle missing required log data fields', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-404' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const incompleteLogData = {
        action: 'TEST',
        resource: 'TEST',
        // Missing resourceId, resourceName, details
      };

      const result = await addAuditLog(incompleteLogData as any);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('unknown') // Should use fallback values for missing fields
      }));
    });

    it('should handle null and undefined values gracefully', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-505' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const logDataWithNulls = {
        action: 'TEST',
        resource: 'TEST',
        resourceId: null,
        resourceName: undefined,
        details: null
      };

      const result = await addAuditLog(logDataWithNulls as any);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('null') // Should handle null values
      }));
    });
  });

  describe('IP address and user agent handling', () => {
    it('should use provided IP address and user agent when available', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-606' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const logData = {
        action: 'API_CALL',
        resource: 'ENDPOINT',
        resourceId: 'api-123',
        resourceName: 'User API',
        details: 'API endpoint called',
        ipAddress: '192.168.1.100',
        userAgent: 'Custom User Agent String'
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('192.168.1.100')
      }));
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('Custom User Agent String')
      }));
    });

    it('should fallback to getClientIP and getUserAgent when not provided', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 'audit-707' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const logData = {
        action: 'PAGE_VIEW',
        resource: 'PAGE',
        resourceId: 'page-123',
        resourceName: 'Home Page',
        details: 'Page viewed'
        // No ipAddress or userAgent provided
      };

      const result = await addAuditLog(logData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('192.168.1.100')
      }));
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', expect.objectContaining({
        body: expect.stringContaining('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
      }));
    });
  });
});
