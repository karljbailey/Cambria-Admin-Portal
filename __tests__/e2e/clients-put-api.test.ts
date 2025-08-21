// @ts-nocheck
import { PUT } from '../../app/api/clients/route';
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

describe('Clients PUT API E2E Tests', () => {
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

  const validPutRequest = {
    originalCode: 'CLIENT001',
    clientCode: 'CLIENT001-UPDATED',
    clientName: 'Updated Client Name',
    fullName: 'Updated Client Full Name',
    folderId: 'updated-folder-id',
    acosGoal: '18%',
    tacosGoal: '11%',
    active: true
  };

  describe('PUT /api/clients - Input Validation', () => {
    it('should return 400 when originalCode is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: originalCode'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: originalCode' },
        { status: 400 }
      );
    });

    it('should return 400 when clientCode is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          originalCode: 'CLIENT001',
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientCode'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientCode' },
        { status: 400 }
      );
    });

    it('should return 400 when clientName is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          originalCode: 'CLIENT001',
          clientCode: 'CLIENT001',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: clientName'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: clientName' },
        { status: 400 }
      );
    });

    it('should return 400 when fullName is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          originalCode: 'CLIENT001',
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields: fullName'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing or invalid required fields: fullName' },
        { status: 400 }
      );
    });

    it('should return 400 when folderId is missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          originalCode: 'CLIENT001',
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          fullName: 'Test Client Full'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: expect.stringContaining('Missing or invalid required fields:') },
        { status: 400 }
      );
    });

    it('should return 400 when originalCode is empty string', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          originalCode: '',
          clientCode: 'CLIENT001',
          clientName: 'Test Client',
          fullName: 'Test Client Full',
          folderId: 'folder-1'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: expect.stringContaining('Missing or invalid required fields:') },
        { status: 400 }
      );
    });

    it('should return 400 when all required fields are missing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors.some(log => log.includes('Missing or invalid required fields:'))).toBe(true);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: expect.stringContaining('Missing or invalid required fields:') },
        { status: 400 }
      );
    });
  });

  describe('PUT /api/clients - Configuration Validation', () => {
    it('should return 500 when Google Sheets ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });

    it('should return 500 when Google Sheets ID is empty string', async () => {
      process.env.GOOGLE_SHEETS_ID = '';

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    });
  });

  describe('PUT /api/clients - Google Sheets Data Retrieval', () => {
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
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

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
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'No data found in sheet' },
        { status: 404 }
      );
    });

    it('should return 404 when client not found', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ...validPutRequest,
          originalCode: 'NONEXISTENT'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      );
    });

    it('should return 404 when original client code is case sensitive', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ...validPutRequest,
          originalCode: 'client001'
        })
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Client not found' },
        { status: 404 }
      );
    });
  });

  describe('PUT /api/clients - Successful Updates', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});
    });

    it('should successfully update a client with all fields', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A:G',
      });

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2', // CLIENT001 is in row 2
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '18%', '11%']],
        },
      });

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Client CLIENT001-UPDATED updated successfully'
      });
    });

    it('should successfully update with optional fields as undefined', async () => {
      const requestWithoutOptional = {
        originalCode: 'CLIENT001',
        clientCode: 'CLIENT001-UPDATED',
        clientName: 'Updated Client Name',
        fullName: 'Updated Client Full Name',
        folderId: 'updated-folder-id',
        active: false
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithoutOptional)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'FALSE', '', '']],
        },
      });
    });

    it('should handle client in different row positions', async () => {
      const requestForClient003 = {
        ...validPutRequest,
        originalCode: 'CLIENT003'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestForClient003)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A4:G4', // CLIENT003 is in row 4
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });

    it('should handle active field as false', async () => {
      const requestWithInactive = {
        ...validPutRequest,
        active: false
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithInactive)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'FALSE', '18%', '11%']],
        },
      });
    });
  });

  describe('PUT /api/clients - Error Handling', () => {
    it('should handle Google Sheets API authentication errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Authentication failed'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Authentication failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    });

    it('should handle Google Sheets API permission errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('The caller does not have permission'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

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
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during update: Error: Update failed');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to update client in spreadsheet' },
        { status: 500 }
      );
    });

    it('should handle invalid spreadsheet ID errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Unable to parse range'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(consoleErrors).toContain('Google Sheets API error during data retrieval: Error: Unable to parse range');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Spreadsheet not found or invalid' },
        { status: 404 }
      );
    });

    it('should handle network timeout errors', async () => {
      mockSheetsInstance.spreadsheets.values.get.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

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
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

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

      await PUT(mockRequest);

      expect(consoleErrors).toContain('Failed to parse request JSON: Error: Invalid JSON');
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    });
  });

  describe('PUT /api/clients - Edge Cases', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});
    });

    it('should handle client code with special characters', async () => {
      const specialCharData = [
        ['Folder ID', 'Client Code', 'Client Name', 'Full Name', 'Active', 'ACOS Goal', 'TACOS Goal'],
        ['folder-1', 'CLIENT-001', 'Client & Co.', 'Client & Co. Full Name', 'TRUE', '15%', '10%'],
      ];

      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: specialCharData }
      });

      const requestWithSpecialChars = {
        ...validPutRequest,
        originalCode: 'CLIENT-001',
        clientCode: 'CLIENT-001-UPDATED'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithSpecialChars)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT-001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });

    it('should handle very long field values', async () => {
      const longFieldRequest = {
        originalCode: 'CLIENT001',
        clientCode: 'A'.repeat(100),
        clientName: 'B'.repeat(200),
        fullName: 'C'.repeat(300),
        folderId: 'D'.repeat(150),
        acosGoal: 'E'.repeat(50),
        tacosGoal: 'F'.repeat(50),
        active: true
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(longFieldRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['D'.repeat(150), 'A'.repeat(100), 'B'.repeat(200), 'C'.repeat(300), 'TRUE', 'E'.repeat(50), 'F'.repeat(50)]],
        },
      });
    });

    it('should handle empty optional fields', async () => {
      const requestWithEmptyOptional = {
        originalCode: 'CLIENT001',
        clientCode: 'CLIENT001-UPDATED',
        clientName: 'Updated Client Name',
        fullName: 'Updated Client Full Name',
        folderId: 'updated-folder-id',
        acosGoal: '',
        tacosGoal: '',
        active: true
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestWithEmptyOptional)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '', '']],
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

      const mockRequest = {
        json: jest.fn().mockResolvedValue(validPutRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      // Should update the first occurrence (row 2)
      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });

    it('should handle Unicode characters in fields', async () => {
      const unicodeRequest = {
        originalCode: 'CLIENT001',
        clientCode: 'CLIENT001-测试',
        clientName: 'Client 测试',
        fullName: 'Client 测试 Full Name',
        folderId: 'folder-测试',
        acosGoal: '15% 测试',
        tacosGoal: '10% 测试',
        active: true
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(unicodeRequest)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A2:G2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['folder-测试', 'CLIENT001-测试', 'Client 测试', 'Client 测试 Full Name', 'TRUE', '15% 测试', '10% 测试']],
        },
      });
    });
  });

  describe('PUT /api/clients - Performance and Resilience', () => {
    beforeEach(() => {
      mockSheetsInstance.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockSheetsData }
      });
      mockSheetsInstance.spreadsheets.values.update.mockResolvedValue({});
    });

    it('should handle concurrent update requests', async () => {
      const mockRequest1 = {
        json: jest.fn().mockResolvedValue({
          ...validPutRequest,
          originalCode: 'CLIENT001'
        })
      } as unknown as NextRequest;

      const mockRequest2 = {
        json: jest.fn().mockResolvedValue({
          ...validPutRequest,
          originalCode: 'CLIENT002'
        })
      } as unknown as NextRequest;

      const [result1, result2] = await Promise.all([
        PUT(mockRequest1),
        PUT(mockRequest2)
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

      const requestForClient500 = {
        ...validPutRequest,
        originalCode: 'CLIENT500'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestForClient500)
      } as unknown as NextRequest;

      await PUT(mockRequest);

      expect(mockSheetsInstance.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id-123',
        range: 'A501:G501', // CLIENT500 is in row 501 (index 500 + 1)
        valueInputOption: 'RAW',
        requestBody: {
          values: [['updated-folder-id', 'CLIENT001-UPDATED', 'Updated Client Name', 'Updated Client Full Name', 'TRUE', '18%', '11%']],
        },
      });
    });
  });
});
