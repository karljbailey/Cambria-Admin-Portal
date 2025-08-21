// @ts-nocheck
import { PATCH } from '../../app/api/clients/route';
import { NextRequest } from 'next/server';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    sheets: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Import mocked modules
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

describe('Clients PATCH API E2E Tests', () => {
  let mockGoogleAuth: jest.MockedClass<any>;
  let mockSheets: jest.MockedFunction<any>;
  let mockSheetsInstance: any;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Store original environment
    originalEnv = { ...process.env };

    // Setup mocks
    mockGoogleAuth = google.auth.GoogleAuth as jest.MockedClass<any>;
    mockSheets = google.sheets as jest.MockedFunction<any>;
    mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;
    
    // Mock sheets instance
    mockSheetsInstance = {
      spreadsheets: {
        values: {
          get: jest.fn(),
          update: jest.fn()
        }
      }
    };
    mockSheets.mockReturnValue(mockSheetsInstance);

    // Mock GoogleAuth to not throw by default
    mockGoogleAuth.mockImplementation(() => ({}));

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

    // Set up default environment variables
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@service-account.com';
    process.env.GOOGLE_PRIVATE_KEY = 'test-private-key\\nwith-newlines';
    process.env.GOOGLE_SHEETS_ID = 'test-sheet-id-123';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original environment
    process.env = originalEnv;
  });

  const mockSheetsData = [
    ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'], // Header row
    ['folder-1', 'CLIENT001', 'Client One', 'Client One Full Name', 'TRUE', '15%', '10%'],
    ['folder-2', 'CLIENT002', 'Client Two', 'Client Two Full Name', 'FALSE', '20%', '12%'],
    ['folder-3', 'CLIENT003', 'Client Three', 'Client Three Full Name', 'true', '', ''],
  ];

  describe('PATCH /api/clients - Input Validation', () => {
    it('should return 400 when clientCode is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid clientCode provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code is required and must be a non-empty string' },
        { status: 400 }
      );
    });

    it('should return 400 when clientCode is empty string', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: '', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid clientCode provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code is required and must be a non-empty string' },
        { status: 400 }
      );
    });

    it('should return 400 when clientCode is null', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: null, active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid clientCode provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code is required and must be a non-empty string' },
        { status: 400 }
      );
    });

    it('should return 400 when active is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001' })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid active value provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Active status must be a boolean value' },
        { status: 400 }
      );
    });

    it('should return 400 when active is not a boolean', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: 'true' })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid active value provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Active status must be a boolean value' },
        { status: 400 }
      );
    });

    it('should return 400 when active is null', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: null })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid active value provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Active status must be a boolean value' },
        { status: 400 }
      );
    });

    it('should return 400 when both clientCode and active are missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors.some(log => log.includes('Invalid clientCode provided:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code is required and must be a non-empty string' },
        { status: 400 }
      );
    });
  });

  describe('PATCH /api/clients - Configuration Validation', () => {
    it('should return 500 when Google Sheets ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets ID not configured or empty');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Sheets ID is empty string', async () => {
      process.env.GOOGLE_SHEETS_ID = '';

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets ID not configured or empty');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Service Account Email is missing', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Service Account Email not configured');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Private Key is missing', async () => {
      delete process.env.GOOGLE_PRIVATE_KEY;

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Private Key not configured');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });
  });

  describe('PATCH /api/clients - Google Sheets Data Retrieval', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});
    });

    it('should return 404 when no data found in sheet', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: null }
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'No data found in sheet' },
        { status: 404 }
      );
    });

    it('should return 404 when sheet is empty', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'No data found in sheet' },
        { status: 404 }
      );
    });

    it('should return 404 when client not found', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'NONEXISTENT', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      );
    });

    it('should return 404 when client code is case sensitive', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'client001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      );
    });
  });

  describe('PATCH /api/clients - Successful Updates', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});
    });

    it('should successfully activate a client', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT002', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
      });

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E3', // CLIENT002 is in row 3 (index 2 + 1)
        valueInputOption: 'RAW',
        requestBody: {
          values: [['TRUE']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT002 activated successfully'
      });
    });

    it('should successfully deactivate a client', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E2', // CLIENT001 is in row 2 (index 1 + 1)
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT001 deactivated successfully'
      });
    });

    it('should handle client in different row positions', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT003', active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E4', // CLIENT003 is in row 4 (index 3 + 1)
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT003 deactivated successfully'
      });
    });
  });

  describe('PATCH /api/clients - Error Handling', () => {
    it('should handle Google Sheets API authentication errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Authentication failed'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Authentication failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    });

    it('should handle Google Sheets API permission errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('The caller does not have permission'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: The caller does not have permission');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient permissions to access spreadsheet' },
        { status: 403 }
      );
    });

    it('should handle Google Sheets API update errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockRejectedValue(new Error('Update failed'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during update: Error: Update failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to update client status in spreadsheet' },
        { status: 500 }
      );
    });

    it('should handle invalid spreadsheet ID errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Unable to parse range'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Unable to parse range');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Spreadsheet not found or invalid' },
        { status: 404 }
      );
    });

    it('should handle network timeout errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Request timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Request timeout while fetching data' },
        { status: 504 }
      );
    });

    it('should handle Google Auth initialization errors', async () => {
      mockGoogleAuth.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Failed to initialize Google Auth: Error: Invalid credentials');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    });

    it('should handle request JSON parsing errors', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Failed to parse request JSON: Error: Invalid JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    });

    it('should handle invalid response structure', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Invalid response structure from Google Sheets API');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    });

    it('should handle response with missing data property', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Invalid response structure from Google Sheets API');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    });

    it('should handle update permission errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockRejectedValue(new Error('The caller does not have permission'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during update: Error: The caller does not have permission');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient permissions to update spreadsheet' },
        { status: 403 }
      );
    });

    it('should handle update rate limiting errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockRejectedValue(new Error('rate limit exceeded'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during update: Error: rate limit exceeded');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Service temporarily unavailable due to rate limiting' },
        { status: 503 }
      );
    });

    it('should handle update timeout errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during update: Error: Request timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Request timeout while updating data' },
        { status: 504 }
      );
    });
  });

  describe('PATCH /api/clients - Edge Cases', () => {
    it('should handle client code with special characters', async () => {
      const specialCharData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT-001', 'Client & Co.', 'Client & Co. Full Name', 'TRUE', '15%', '10%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: specialCharData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT-001', active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT-001 deactivated successfully'
      });
    });

    it('should handle very long client codes', async () => {
      const longClientCode = 'A'.repeat(100);
      const longClientData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', longClientCode, 'Long Client', 'Long Client Full Name', 'TRUE', '15%', '10%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: longClientData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: longClientCode, active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });
    });

    it('should handle empty client name in sheet', async () => {
      const emptyNameData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT001', '', 'Client One Full Name', 'TRUE', '15%', '10%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: emptyNameData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });
    });

    it('should handle duplicate client codes in sheet', async () => {
      const duplicateData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT001', 'Client One', 'Client One Full Name', 'TRUE', '15%', '10%'],
        ['folder-2', 'CLIENT001', 'Client One Duplicate', 'Client One Duplicate Full Name', 'FALSE', '20%', '12%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: duplicateData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: false })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      // Should update the first occurrence (row 2)
      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['FALSE']],
        },
      });
    });
  });

  describe('PATCH /api/clients - Performance and Resilience', () => {
    it('should handle concurrent update requests', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest1 = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT001', active: true })
      } as unknown as NextRequest;

      const mockRequest2 = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT002', active: false })
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        PATCH(mockRequest1),
        PATCH(mockRequest2)
      ]);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledTimes(2);
      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledTimes(2);
      expect(mockNextResponse.json).toHaveBeenCalledTimes(2);
    });

    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal']
      ];
      
      for (let i = 1; i <= 1000; i++) {
        largeData.push([
          `folder-${i}`,
          `CLIENT${i.toString().padStart(3, '0')}`,
          `Client ${i}`,
          `Client ${i} Full Name`,
          i % 2 === 0 ? 'TRUE' : 'FALSE',
          `${10 + (i % 20)}%`,
          `${5 + (i % 15)}%`
        ]);
      }

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: largeData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ clientCode: 'CLIENT500', active: true })
      } as unknown as NextRequest;

      await PATCH(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'E501', // CLIENT500 is in row 501 (index 500 + 1)
        valueInputOption: 'RAW',
        requestBody: {
          values: [['TRUE']],
        },
      });
    });
  });
});
