// @ts-nocheck
import { GET } from '../../app/api/clients/route';
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

describe('Clients GET API E2E Tests', () => {
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
          get: jest.fn()
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

  const mockRequest = {} as NextRequest;

  const mockSheetsData = [
    ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'], // Header row
    ['folder-1', 'CLIENT001', 'Client One', 'Client One Full Name', 'TRUE', '15%', '10%'],
    ['folder-2', 'CLIENT002', 'Client Two', 'Client Two Full Name', 'FALSE', '20%', '12%'],
    ['folder-3', 'CLIENT003', 'Client Three', 'Client Three Full Name', 'true', '', ''], // Different case
    ['folder-4', 'CLIENT004', 'Client Four', 'Client Four Full Name', 'FALSE', '25%', '15%'],
    ['folder-5', '', '', '', '', '', ''], // Empty row
    ['folder-6', 'CLIENT006', 'Client Six', 'Client Six Full Name', 'TRUE'], // Missing optional columns
  ];

  describe('GET /api/clients - Configuration Validation', () => {
    it('should return 500 when Google Sheets ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Sheets ID is empty string', async () => {
      process.env.GOOGLE_SHEETS_ID = '';

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should handle missing Google Service Account Email', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Service Account Email not configured');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });

    it('should handle missing Google Private Key', async () => {
      delete process.env.GOOGLE_PRIVATE_KEY;

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Private Key not configured');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });
  });

  describe('GET /api/clients - Google Auth Initialization', () => {
    it('should initialize Google Auth with correct parameters', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });

      await GET(mockRequest);

      expect(mockGoogleAuth).toHaveBeenCalledWith({
        credentials: {
          client_email: 'test@service-account.com',
          private_key: 'test-private-key\nwith-newlines',
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      expect(mockSheets).toHaveBeenCalledWith({ version: 'v4', auth: expect.any(Object) });
    });

    it('should properly handle newlines in private key', async () => {
      process.env.GOOGLE_PRIVATE_KEY = 'test\\nkey\\nwith\\nmultiple\\nlines';
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });

      await GET(mockRequest);

      expect(mockGoogleAuth).toHaveBeenCalledWith({
        credentials: {
          client_email: 'test@service-account.com',
          private_key: 'test\nkey\nwith\nmultiple\nlines',
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    });
  });

  describe('GET /api/clients - Successful Data Retrieval', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
    });

    it('should successfully fetch and map client data', async () => {
      await GET(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: [
          {
            folderId: 'folder-1',
            clientCode: 'CLIENT001',
            clientName: 'Client One',
            fullName: 'Client One Full Name',
            active: true,
            acosGoal: '15%',
            tacosGoal: '10%'
          },
          {
            folderId: 'folder-2',
            clientCode: 'CLIENT002',
            clientName: 'Client Two',
            fullName: 'Client Two Full Name',
            active: false,
            acosGoal: '20%',
            tacosGoal: '12%'
          },
          {
            folderId: 'folder-3',
            clientCode: 'CLIENT003',
            clientName: 'Client Three',
            fullName: 'Client Three Full Name',
            active: true, // 'true' (lowercase) should be converted to true
            acosGoal: '',
            tacosGoal: ''
          },
          {
            folderId: 'folder-4',
            clientCode: 'CLIENT004',
            clientName: 'Client Four',
            fullName: 'Client Four Full Name',
            active: false,
            acosGoal: '25%',
            tacosGoal: '15%'
          },
          {
            folderId: 'folder-5',
            clientCode: '',
            clientName: '',
            fullName: '',
            active: false, // Empty string should be false
            acosGoal: '',
            tacosGoal: ''
          },
          {
            folderId: 'folder-6',
            clientCode: 'CLIENT006',
            clientName: 'Client Six',
            fullName: 'Client Six Full Name',
            active: true,
            acosGoal: '', // Missing column should default to empty string
            tacosGoal: '' // Missing column should default to empty string
          }
        ]
      });
    });

    it('should handle header-only spreadsheet', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal']] }
      });

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: []
      });
    });

    it('should handle different case variations of active field', async () => {
      const testData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT001', 'Client One', 'Full Name', 'TRUE', '', ''],
        ['folder-2', 'CLIENT002', 'Client Two', 'Full Name', 'true', '', ''],
        ['folder-3', 'CLIENT003', 'Client Three', 'Full Name', 'True', '', ''],
        ['folder-4', 'CLIENT004', 'Client Four', 'Full Name', 'FALSE', '', ''],
        ['folder-5', 'CLIENT005', 'Client Five', 'Full Name', 'false', '', ''],
        ['folder-6', 'CLIENT006', 'Client Six', 'Full Name', 'anything', '', ''],
        ['folder-7', 'CLIENT007', 'Client Seven', 'Full Name', '', '', ''],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: testData }
      });

      await GET(mockRequest);

      const response = mockNextResponse.json.mock.calls[0][0];
      expect(response.clients).toEqual([
        expect.objectContaining({ clientCode: 'CLIENT001', active: true }), // TRUE
        expect.objectContaining({ clientCode: 'CLIENT002', active: true }), // true
        expect.objectContaining({ clientCode: 'CLIENT003', active: true }), // True
        expect.objectContaining({ clientCode: 'CLIENT004', active: false }), // FALSE
        expect.objectContaining({ clientCode: 'CLIENT005', active: false }), // false
        expect.objectContaining({ clientCode: 'CLIENT006', active: false }), // anything
        expect.objectContaining({ clientCode: 'CLIENT007', active: false }), // empty
      ]);
    });
  });

  describe('GET /api/clients - Empty Data Handling', () => {
    it('should return empty array when no data in spreadsheet', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: null }
      });

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: []
      });
    });

    it('should return empty array when values array is empty', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: []
      });
    });

    it('should return empty array when values is undefined', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: {}
      });

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: []
      });
    });
  });

  describe('GET /api/clients - Error Handling', () => {
    it('should handle Google Sheets API authentication errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Authentication failed'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: Authentication failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch clients data' },
        { status: 500 }
      );
    });

    it('should handle Google Sheets API permission errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('The caller does not have permission'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: The caller does not have permission');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient permissions to access spreadsheet' },
        { status: 403 }
      );
    });

    it('should handle Google Sheets API quota exceeded errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('rate limit exceeded'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: rate limit exceeded');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Service temporarily unavailable due to rate limiting' },
        { status: 503 }
      );
    });

    it('should handle invalid spreadsheet ID errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Unable to parse range'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: Unable to parse range');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Spreadsheet not found or invalid' },
        { status: 404 }
      );
    });

    it('should handle network timeout errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Request timeout'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: Request timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Request timeout while fetching data' },
        { status: 504 }
      );
    });

    it('should handle Google Auth initialization errors', async () => {
      mockGoogleAuth.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      await GET(mockRequest);

      expect(consoleErrors).toContain('Failed to initialize Google Auth: Error: Invalid credentials');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    });

    it('should handle unexpected API response format', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Cannot read property of null'));

      await GET(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error: Error: Cannot read property of null');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch clients data' },
        { status: 500 }
      );
    });

    it('should handle invalid response structure', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue(null);

      await GET(mockRequest);

      expect(consoleErrors).toContain('Invalid response structure from Google Sheets API');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    });

    it('should handle response with missing data property', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({});

      await GET(mockRequest);

      expect(consoleErrors).toContain('Invalid response structure from Google Sheets API');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    });
  });

  describe('GET /api/clients - Edge Cases', () => {

    it('should handle rows with missing columns gracefully', async () => {
      const sparseData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT001'], // Only first two columns
        ['folder-2', 'CLIENT002', 'Client Two'], // Only first three columns
        ['folder-3'], // Only first column
        [], // Completely empty row
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: sparseData }
      });

      await GET(mockRequest);

      const response = mockNextResponse.json.mock.calls[0][0];
      expect(response.clients).toEqual([
        {
          folderId: 'folder-1',
          clientCode: 'CLIENT001',
          clientName: '',
          fullName: '',
          active: false,
          acosGoal: '',
          tacosGoal: ''
        },
        {
          folderId: 'folder-2',
          clientCode: 'CLIENT002',
          clientName: 'Client Two',
          fullName: '',
          active: false,
          acosGoal: '',
          tacosGoal: ''
        },
        {
          folderId: 'folder-3',
          clientCode: '',
          clientName: '',
          fullName: '',
          active: false,
          acosGoal: '',
          tacosGoal: ''
        },
        {
          folderId: '',
          clientCode: '',
          clientName: '',
          fullName: '',
          active: false,
          acosGoal: '',
          tacosGoal: ''
        }
      ]);
    });

    it('should handle very large datasets', async () => {
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

      await GET(mockRequest);

      const response = mockNextResponse.json.mock.calls[0][0];
      expect(response.clients).toHaveLength(1000);
      expect(response.clients[0]).toEqual({
        folderId: 'folder-1',
        clientCode: 'CLIENT001',
        clientName: 'Client 1',
        fullName: 'Client 1 Full Name',
        active: false,
        acosGoal: '11%',
        tacosGoal: '6%'
      });
    });

    it('should handle special characters in data', async () => {
      const specialCharData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT-001', 'Client & Co.', 'Client & Co. Full Name', 'TRUE', '15.5%', '10.2%'],
        ['folder-2', 'CLIENT_002', 'Client "Quotes"', 'Client "Quotes" Full Name', 'TRUE', '20%', '12%'],
        ['folder-3', 'CLIENT@003', 'Client Unicode 测试', 'Client Unicode 测试 Full', 'TRUE', '25%', '15%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: specialCharData }
      });

      await GET(mockRequest);

      const response = mockNextResponse.json.mock.calls[0][0];
      expect(response.clients).toEqual([
        {
          folderId: 'folder-1',
          clientCode: 'CLIENT-001',
          clientName: 'Client & Co.',
          fullName: 'Client & Co. Full Name',
          active: true,
          acosGoal: '15.5%',
          tacosGoal: '10.2%'
        },
        {
          folderId: 'folder-2',
          clientCode: 'CLIENT_002',
          clientName: 'Client "Quotes"',
          fullName: 'Client "Quotes" Full Name',
          active: true,
          acosGoal: '20%',
          tacosGoal: '12%'
        },
        {
          folderId: 'folder-3',
          clientCode: 'CLIENT@003',
          clientName: 'Client Unicode 测试',
          fullName: 'Client Unicode 测试 Full',
          active: true,
          acosGoal: '25%',
          tacosGoal: '15%'
        }
      ]);
    });
  });

  describe('GET /api/clients - Performance and Resilience', () => {

    it('should handle concurrent requests', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });

      const [result1, result2, result3] = await Promise.all([
        GET(mockRequest),
        GET(mockRequest),
        GET(mockRequest)
      ]);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledTimes(3);
      expect(mockNextResponse.json).toHaveBeenCalledTimes(3);
    });

    it('should handle API rate limiting gracefully', async () => {
      // First request - rate limited
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('rate limit exceeded'));

      await GET(mockRequest);
      expect(consoleErrors).toContain('Google Sheets API error: Error: rate limit exceeded');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Service temporarily unavailable due to rate limiting' },
        { status: 503 }
      );

      // Reset for second request
      jest.clearAllMocks();
      consoleLogs = [];
      consoleErrors = [];
      mockNextResponse.json.mockImplementation((data, options) => ({
        json: async () => data,
        status: options?.status || 200,
        ok: !options?.status || options.status < 400
      }));

      // Second request should succeed
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });

      await GET(mockRequest);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        clients: expect.any(Array)
      });
    });
  });
});
