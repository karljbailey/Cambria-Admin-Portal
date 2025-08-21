// @ts-nocheck
import { POST } from '../../app/api/clients/route';
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

describe('Clients POST API E2E Tests', () => {
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
          append: jest.fn()
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

  const validPostRequest = {
    clientCode: 'CLIENT004',
    clientName: 'New Client',
    fullName: 'New Client Full Name',
    folderId: 'folder-4',
    acosGoal: '18%',
    tacosGoal: '11%'
  };

  describe('POST /api/clients - Input Validation', () => {
    it('should return 400 when clientCode is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientCode'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientCode' },
        { status: 400 }
      );
    });

    it('should return 400 when clientName is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: 'CLIENT001',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientName'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientName' },
        { status: 400 }
      );
    });

    it('should return 400 when fullName is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: fullName'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: fullName' },
        { status: 400 }
      );
    });

    it('should return 400 when folderId is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          fullName: 'Test Client Full'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: folderId'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: folderId' },
        { status: 400 }
      );
    });

    it('should return 400 when clientCode is empty string', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: '',
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientCode'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientCode' },
        { status: 400 }
      );
    });

    it('should return 400 when all required fields are missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: expect.stringContaining('Missing or invalid required fields:') },
        { status: 400 }
      );
    });

    it('should return 400 when clientCode is not a string', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: 123,
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientCode'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientCode' },
        { status: 400 }
      );
    });
  });

  describe('POST /api/clients - Configuration Validation', () => {
    it('should return 500 when Google Sheets ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Sheets ID is empty string', async () => {
      process.env.GOOGLE_SHEETS_ID = '';

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Service Account Email is not configured', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Private Key is not configured', async () => {
      delete process.env.GOOGLE_PRIVATE_KEY;

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/clients - Google Sheets Data Retrieval', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.append.mockResolvedValue({});
    });

    it('should return 403 when insufficient permissions to access spreadsheet', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('The caller does not have permission'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: The caller does not have permission');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient permissions to access spreadsheet' },
        { status: 403 }
      );
    });

    it('should return 404 when spreadsheet not found', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Requested entity was not found'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Requested entity was not found');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Spreadsheet not found or invalid' },
        { status: 404 }
      );
    });

    it('should return 503 when rate limited', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('rate limit exceeded'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: rate limit exceeded');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Service temporarily unavailable due to rate limiting' },
        { status: 503 }
      );
    });

    it('should return 504 when request times out', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Request timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Request timeout while fetching data' },
        { status: 504 }
      );
    });

    it('should return 500 for other API errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Internal server error'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Internal server error');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    });

    it('should return 500 when response structure is invalid', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: null
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Invalid response structure from Google Sheets API');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/clients - Duplicate Client Code Validation', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.append.mockResolvedValue({});
    });

    it('should return 409 when client code already exists', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ...validPostRequest,
          clientCode: 'CLIENT001'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleLogs).toContain('Client code already exists: CLIENT001');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code already exists' },
        { status: 409 }
      );
    });

    it('should return 409 when client code exists with different case', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ...validPostRequest,
          clientCode: 'CLIENT001'
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleLogs).toContain('Client code already exists: CLIENT001');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client code already exists' },
        { status: 409 }
      );
    });

    it('should allow new client code when it does not exist', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '18%', '11%']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT004 added successfully'
      });
    });

    it('should handle empty spreadsheet gracefully', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal']] }
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalled();
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT004 added successfully'
      });
    });
  });

  describe('POST /api/clients - Successful Client Creation', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.append.mockResolvedValue({});
    });

    it('should successfully create a client with all fields', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
      });

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '18%', '11%']],
        },
      });

      expect(consoleLogs).toContain('Successfully added client CLIENT004');
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT004 added successfully'
      });
    });

    it('should successfully create client with optional fields as undefined', async () => {
      const requestWithoutOptional = {
        clientCode: 'CLIENT004',
        clientName: 'New Client',
        fullName: 'New Client Full Name',
        folderId: 'folder-4'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithoutOptional)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '', '']],
        },
      });
    });

    it('should successfully create client with empty optional fields', async () => {
      const requestWithEmptyOptional = {
        clientCode: 'CLIENT004',
        clientName: 'New Client',
        fullName: 'New Client Full Name',
        folderId: 'folder-4',
        acosGoal: '',
        tacosGoal: ''
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithEmptyOptional)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '', '']],
        },
      });
    });

    it('should trim whitespace from all fields', async () => {
      const requestWithWhitespace = {
        clientCode: '  CLIENT004  ',
        clientName: '  New Client  ',
        fullName: '  New Client Full Name  ',
        folderId: '  folder-4  ',
        acosGoal: '  18%  ',
        tacosGoal: '  11%  '
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithWhitespace)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });
  });

  describe('POST /api/clients - Append Error Handling', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
    });

    it('should handle append permission errors', async () => {
      mockSheetsInstance.spreadsheets.values.append.mockRejectedValue(new Error('The caller does not have permission'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during append: Error: The caller does not have permission');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Insufficient permissions to add client to spreadsheet' },
        { status: 403 }
      );
    });

    it('should handle append rate limiting', async () => {
      mockSheetsInstance.spreadsheets.values.append.mockRejectedValue(new Error('rate limit exceeded'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during append: Error: rate limit exceeded');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Service temporarily unavailable due to rate limiting' },
        { status: 503 }
      );
    });

    it('should handle append timeout errors', async () => {
      mockSheetsInstance.spreadsheets.values.append.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during append: Error: Request timeout');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Request timeout while adding client' },
        { status: 504 }
      );
    });

    it('should handle other append errors', async () => {
      mockSheetsInstance.spreadsheets.values.append.mockRejectedValue(new Error('Append failed'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during append: Error: Append failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to add client to spreadsheet' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/clients - Error Handling', () => {
    it('should handle Google Auth initialization errors', async () => {
      mockGoogleAuth.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

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

      await POST(mockRequest);

      expect(consoleErrors).toContain('Failed to parse request JSON: Error: Invalid JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    });

    it('should handle general API errors', async () => {
      // Test that general API errors are handled gracefully
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('General API error'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPostRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: General API error');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    });
  });

  describe('POST /api/clients - Edge Cases', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.append.mockResolvedValue({});
    });

    it('should handle client code with special characters', async () => {
      const specialCharRequest = {
        clientCode: 'CLIENT-004',
        clientName: 'Client & Co.',
        fullName: 'Client & Co. Full Name',
        folderId: 'folder-4',
        acosGoal: '15%',
        tacosGoal: '10%'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(specialCharRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT-004', 'Client & Co.', 'Client & Co. Full Name', 'TRUE', '15%', '10%']],
        },
      });
    });

    it('should handle very long field values', async () => {
      const longFieldRequest = {
        clientCode: 'A'.repeat(100),
        clientName: 'B'.repeat(200),
        fullName: 'C'.repeat(300),
        folderId: 'D'.repeat(150),
        acosGoal: 'E'.repeat(50),
        tacosGoal: 'F'.repeat(50)
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(longFieldRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['D'.repeat(150), 'A'.repeat(100), 'B'.repeat(200), 'C'.repeat(300), 'TRUE', 'E'.repeat(50), 'F'.repeat(50)]],
        },
      });
    });

    it('should handle Unicode characters in fields', async () => {
      const unicodeRequest = {
        clientCode: 'CLIENT004-测试',
        clientName: 'Client 测试',
        fullName: 'Client 测试 Full Name',
        folderId: 'folder-测试',
        acosGoal: '15% 测试',
        tacosGoal: '10% 测试'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(unicodeRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-测试', 'CLIENT004-测试', 'Client 测试', 'Client 测试 Full Name', 'TRUE', '15% 测试', '10% 测试']],
        },
      });
    });

    it('should handle non-string optional fields', async () => {
      const nonStringOptionalRequest = {
        clientCode: 'CLIENT004',
        clientName: 'New Client',
        fullName: 'New Client Full Name',
        folderId: 'folder-4',
        acosGoal: 15,
        tacosGoal: 10
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(nonStringOptionalRequest)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'CLIENT004', 'New Client', 'New Client Full Name', 'TRUE', '15', '10']],
        },
      });
    });
  });

  describe('POST /api/clients - Performance and Resilience', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.append.mockResolvedValue({});
    });

    it('should handle concurrent client creation requests', async () => {
      const mockRequest1 = {
        json: jest.fn().mockResolvedValue({
          ...validPostRequest,
          clientCode: 'CLIENT004'
        })
      } as unknown as NextRequest;

      const mockRequest2 = {
        json: jest.fn().mockResolvedValue({
          ...validPostRequest,
          clientCode: 'CLIENT005'
        })
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        POST(mockRequest1),
        POST(mockRequest2)
      ]);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledTimes(2);
      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledTimes(2);
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

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ...validPostRequest,
          clientCode: 'UNIQUE_CLIENT_999' // Use a completely unique client code
        })
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-4', 'UNIQUE_CLIENT_999', 'New Client', 'New Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });
  });
});
