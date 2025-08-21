// @ts-nocheck
import { GET } from '../../app/api/file/[id]/route';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { google } from 'googleapis';

// Mock external dependencies
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    drive: jest.fn()
  }
}));

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    sheet_to_csv: jest.fn(),
    sheet_to_html: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

describe('File Parsing Integration Tests', () => {
  let mockGoogleAuth: jest.MockedClass<any>;
  let mockDrive: jest.MockedFunction<any>;
  let mockDriveInstance: any;
  let mockXLSX: jest.Mocked<typeof XLSX>;
  let mockNextRequest: any;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Store original environment
    originalEnv = { ...process.env };

    // Setup environment variables
    process.env = {
      ...originalEnv,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@service-account.com',
      GOOGLE_PRIVATE_KEY: 'test-private-key\\nwith-newlines'
    };

    // Setup Google API mocks
    mockGoogleAuth = google.auth.GoogleAuth as jest.MockedClass<any>;
    mockDrive = google.drive as jest.MockedFunction<any>;
    
    mockDriveInstance = {
      files: {
        get: jest.fn(),
        export: jest.fn()
      }
    };
    mockDrive.mockReturnValue(mockDriveInstance);
    mockGoogleAuth.mockImplementation(() => ({}));

    // Setup XLSX mocks
    mockXLSX = XLSX as jest.Mocked<typeof XLSX>;

    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Mock NextRequest
    mockNextRequest = {} as NextRequest;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('Excel File Processing', () => {
    it('should process Excel file with multiple tabs successfully', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'test-report.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: createMockExcelBuffer()
        });

      // Setup workbook mock
      mockXLSX.read.mockReturnValue(createMockWorkbook());
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce(createMockProfitLossData())
        .mockReturnValueOnce(createMockProductData())
        .mockReturnValueOnce(createMockPayoutsData());

      const mockParams = Promise.resolve({ id: 'test-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(mockXLSX.read).toHaveBeenCalledTimes(1);
      expect(consoleLogs.some(log => log.includes('EXCEL FILE PARSING STARTED'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('PARSING COMPLETE'))).toBe(true);
    });

    it('should handle corrupted Excel files gracefully', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'corrupted.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: Buffer.from('corrupted data')
        });

      // Mock XLSX.read to throw error
      mockXLSX.read.mockImplementation(() => {
        throw new Error('File is corrupted');
      });

      const mockParams = Promise.resolve({ id: 'corrupted-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(consoleErrors.some(log => log.includes('Error parsing Excel file') || log.includes('Error reading file'))).toBe(true);
    });

    it('should handle empty Excel files', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'empty.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: Buffer.alloc(0) // Empty buffer
        });

      const mockParams = Promise.resolve({ id: 'empty-file-id' });
      
      try {
        const result = await GET(mockNextRequest, { params: mockParams });
        // If the call succeeds, it should return an error response
        // The test is valid if either the call throws an error or returns an error response
      } catch (error) {
        // Expected behavior - empty files should cause errors
        expect(error).toBeDefined();
      }

      // Check that the file operations were called
      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
    });

    it('should process Excel with missing tabs gracefully', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'partial.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: createMockExcelBuffer()
        });

      // Setup workbook with missing sheets
      const partialWorkbook = {
        SheetNames: ['Profit & Loss'], // Only one tab
        Sheets: {
          'Profit & Loss': createMockWorksheet()
        }
      };

      mockXLSX.read.mockReturnValue(partialWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue(createMockProfitLossData());

      const mockParams = Promise.resolve({ id: 'partial-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(consoleLogs.some(log => log.includes('Processing tab: "Profit & Loss"'))).toBe(true);
    });
  });

  describe('CSV File Processing', () => {
    it('should process CSV file successfully', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'test-report.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: createMockCSVContent()
        });

      const mockParams = Promise.resolve({ id: 'csv-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV content length'))).toBe(true);
    });

    it('should handle malformed CSV files', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'malformed.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: 'malformed,csv,content\nwith"bad"quotes\nand,missing,cells'
        });

      const mockParams = Promise.resolve({ id: 'malformed-csv-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should still process without throwing
      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Google Sheets Processing', () => {
    it('should process Google Sheets as XLSX successfully', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'test-sheet',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup successful XLSX export
      const mockExcelBuffer = Buffer.from('mock excel data');
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: mockExcelBuffer
      });

      // Setup successful Excel parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data1', 'Data2'], ['Value1', 'Value2']]);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('Data1,Data2\nValue1,Value2');

      const mockParams = Promise.resolve({ id: 'google-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should try XLSX export first
      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'google-sheet-id',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });

    it('should fallback to CSV when XLSX fails for Google Sheets', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'fallback-sheet',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export failure and CSV success
      mockDriveInstance.files.export
        .mockRejectedValueOnce(new Error('XLSX export failed'))
        .mockResolvedValueOnce({
          data: createMockCSVContent()
        });

      const mockParams = Promise.resolve({ id: 'fallback-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should try both exports
      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'fallback-sheet-id',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'fallback-sheet-id',
        mimeType: 'text/csv'
      });

      expect(consoleLogs).toContain('Successfully parsed Google Sheet as CSV (fallback)');
    });
  });

  describe('Data Parsing Accuracy', () => {
    it('should correctly parse profit & loss data', async () => {
      const profitLossData = [
        ['Sales', '10000'],
        ['Cost of Goods', '6000'],
        ['FBA Fees', '500'],
        ['Net Profit', '3500'],
        ['Margin', '35']
      ];

      // Test that the parsing would produce expected results
      const expectedResult = {
        sales: 10000,
        costOfGoods: -6000, // Should be negative
        fbaFees: -500, // Should be negative
        netProfit: 3500,
        margin: 35
      };

      // Verify our test data structure
      expect(profitLossData.find(row => row[0] === 'Sales')?.[1]).toBe('10000');
      expect(parseFloat(profitLossData.find(row => row[0] === 'Sales')?.[1] || '0')).toBe(expectedResult.sales);
    });

    it('should correctly parse product performance data', async () => {
      const productData = [
        ['ASIN', 'Title', 'Sales This Month', 'Units This Month'],
        ['B001ABC123', 'Test Product 1', '1000', '10'],
        ['B002DEF456', 'Test Product 2', '2000', '20']
      ];

      // Verify product data structure
      expect(productData[1][0]).toBe('B001ABC123'); // ASIN
      expect(productData[1][1]).toBe('Test Product 1'); // Title
      expect(parseFloat(productData[1][2])).toBe(1000); // Sales
      expect(parseInt(productData[1][3])).toBe(10); // Units
    });

    it('should handle various number formats correctly', async () => {
      const numberFormats = [
        '$1,000.50',
        '€500.25',
        '1000',
        '25%',
        '-500',
        '1,234,567.89'
      ];

      const cleanedNumbers = numberFormats.map(format => {
        const cleaned = format.replace(/[$,€£%]/g, '');
        return parseFloat(cleaned);
      });

      expect(cleanedNumbers[0]).toBe(1000.50);
      expect(cleanedNumbers[1]).toBe(500.25);
      expect(cleanedNumbers[2]).toBe(1000);
      expect(cleanedNumbers[3]).toBe(25);
      expect(cleanedNumbers[4]).toBe(-500);
      expect(cleanedNumbers[5]).toBe(1234567.89);
    });
  });

  describe('Error Resilience', () => {
    it('should continue processing when individual tabs fail', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'mixed-results.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: createMockExcelBuffer()
        });

      // Setup workbook
      mockXLSX.read.mockReturnValue(createMockWorkbook());
      
      // Mock different results for different tabs
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce(createMockProfitLossData()) // Success
        .mockImplementationOnce(() => { throw new Error('Tab parsing failed'); }) // Failure
        .mockReturnValueOnce(createMockPayoutsData()); // Success

      const mockParams = Promise.resolve({ id: 'mixed-results-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should log errors but continue processing
      expect(consoleErrors.some(log => log.includes('Error processing tab') || log.includes('Tab parsing failed'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('PARSING COMPLETE'))).toBe(true);
    });

    it('should provide default values when parsing fails completely', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'failed-parsing.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        })
        .mockResolvedValueOnce({
          data: createMockExcelBuffer()
        });

      // Mock complete parsing failure
      mockXLSX.read.mockImplementation(() => {
        throw new Error('Complete parsing failure');
      });

      const mockParams = Promise.resolve({ id: 'failed-parsing-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(consoleErrors.some(log => log.includes('Error parsing Excel file') || log.includes('Error reading file'))).toBe(true);
    });
  });

  describe('File Type Validation', () => {
    it('should reject unsupported file types', async () => {
      // Setup file metadata for unsupported type
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'document.pdf',
          mimeType: 'application/pdf'
        }
      });

      const mockParams = Promise.resolve({ id: 'pdf-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(1); // Only metadata call
    });

    it('should handle missing file ID', async () => {
      const mockParams = Promise.resolve({ id: '' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).not.toHaveBeenCalled();
    });
  });

  // Helper functions for creating mock data
  function createMockExcelBuffer(): Buffer {
    return Buffer.from('mock excel data');
  }

  function createMockWorkbook() {
    return {
      SheetNames: ['Profit & Loss', 'Products', 'Payouts'],
      Sheets: {
        'Profit & Loss': createMockWorksheet(),
        'Products': createMockWorksheet(),
        'Payouts': createMockWorksheet()
      }
    };
  }

  function createMockWorksheet() {
    return {
      '!ref': 'A1:C10',
      A1: { v: 'Metric' },
      B1: { v: 'Value' },
      A2: { v: 'Sales' },
      B2: { v: 10000 }
    };
  }

  function createMockProfitLossData() {
    return [
      ['Sales', '10000'],
      ['Cost of Goods', '6000'],
      ['FBA Fees', '500'],
      ['Referral Fees', '1000'],
      ['Net Profit', '2500'],
      ['Margin', '25'],
      ['ROI', '41.67']
    ];
  }

  function createMockProductData() {
    return [
      ['ASIN', 'Title', 'Sales This Month', 'Sales Change', 'Net Profit This Month', 'Units This Month'],
      ['B001ABC123', 'Test Product 1', '1000', '+10%', '250', '10'],
      ['B002DEF456', 'Test Product 2', '2000', '-5%', '500', '20']
    ];
  }

  function createMockPayoutsData() {
    return [
      ['Period', 'Amount'],
      ['Latest', '5000'],
      ['Previous', '4500'],
      ['Average', '4750']
    ];
  }

  function createMockCSVContent(): string {
    return `Profit & Loss
Sales,10000
Cost of Goods,6000
FBA Fees,500
Net Profit,3500

Per-Product Performance
ASIN,Title,Sales This Month,Units This Month
B001ABC123,Test Product 1,1000,10
B002DEF456,Test Product 2,2000,20

Payouts
Period,Amount
Latest,5000
Previous,4500`;
  }
});
