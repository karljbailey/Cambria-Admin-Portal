import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../app/api/file/[id]/route';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    drive: jest.fn()
  }
}));

// Mock XLSX
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    sheet_to_csv: jest.fn()
  }
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

describe('Google Sheets XLSX Processing Integration Tests', () => {
  let mockGoogleAuth: jest.Mocked<any>;
  let mockDriveInstance: jest.Mocked<any>;
  let mockXLSX: jest.Mocked<typeof XLSX>;
  let mockNextResponse: jest.Mocked<typeof NextResponse>;
  let mockNextRequest: NextRequest;
  let consoleLogs: string[];
  let consoleWarns: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Capture console output
    consoleLogs = [];
    consoleWarns = [];
    consoleErrors = [];
    
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleLogs.push(args.map(arg => String(arg)).join(' '));
    });
    
    jest.spyOn(console, 'warn').mockImplementation((message) => {
      consoleWarns.push(String(message));
    });
    
    jest.spyOn(console, 'error').mockImplementation((message) => {
      consoleErrors.push(String(message));
    });

    // Setup mocks after reset
    mockDriveInstance = {
      files: {
        get: jest.fn(),
        export: jest.fn()
      }
    };

    mockXLSX = XLSX as jest.Mocked<typeof XLSX>;
    mockNextRequest = {} as NextRequest;

    // Setup module mocks
    (google.auth.GoogleAuth as jest.Mock).mockImplementation(() => ({}));
    (google.drive as jest.Mock).mockReturnValue(mockDriveInstance);
    
    mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;
    mockNextResponse.json = jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      data
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Google Sheets XLSX Export Success', () => {
    it('should successfully export Google Sheet as XLSX and parse it', async () => {
      // Setup file metadata for Google Sheet
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'test-sheet.xlsx',
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
        SheetNames: ['Profit & Loss', 'Products'],
        Sheets: {
          'Profit & Loss': { '!ref': 'A1:B10' },
          'Products': { '!ref': 'A1:F20' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '1000'], ['Cost of Goods', '600']]) // Profit & Loss
        .mockReturnValueOnce([]) // Profit & Loss Method 3
        .mockReturnValueOnce([['ASIN', 'Title', 'Sales'], ['B123', 'Product 1', '500']]) // Products
        .mockReturnValueOnce([]); // Products Method 3

      mockXLSX.utils.sheet_to_csv
        .mockReturnValueOnce('Sales,1000\nCost of Goods,600') // Profit & Loss
        .mockReturnValueOnce('ASIN,Title,Sales\nB123,Product 1,500'); // Products

      const mockParams = Promise.resolve({ id: 'google-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify Google Drive calls
      expect(mockDriveInstance.files.get).toHaveBeenCalledWith({
        fileId: 'google-sheet-id',
        fields: 'name,mimeType'
      });

      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'google-sheet-id',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Should only call XLSX export (not CSV fallback)
      expect(mockDriveInstance.files.export).toHaveBeenCalledTimes(1);

      // Verify Excel parsing was called
      expect(mockXLSX.read).toHaveBeenCalledWith(mockExcelBuffer, expect.objectContaining({
        type: 'buffer',
        cellText: false,
        cellDates: true
      }));

      // Verify console logs
      expect(consoleLogs).toContain('Processing Google Sheet: test-sheet.xlsx (application/vnd.google-apps.spreadsheet)');
      expect(consoleLogs).toContain('Attempting to export Google Sheet as Excel (.xlsx)...');
      expect(consoleLogs.some(log => log.includes('Google Sheet Excel export size:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');

      // Should not have fallback warnings
      expect(consoleWarns).toHaveLength(0);
    });

    it('should preserve multiple tabs when exporting Google Sheet as XLSX', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'multi-tab-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export
      const mockExcelBuffer = Buffer.from('mock excel with multiple tabs');
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: mockExcelBuffer
      });

      // Setup workbook with multiple tabs
      const mockWorkbook = {
        SheetNames: ['Profit & Loss', 'Product Performance', 'Payouts', 'Amazon Performance'],
        Sheets: {
          'Profit & Loss': { '!ref': 'A1:B10' },
          'Product Performance': { '!ref': 'A1:F20' },
          'Payouts': { '!ref': 'A1:C5' },
          'Amazon Performance': { '!ref': 'A1:D15' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock data for each tab
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '10000']]) // Profit & Loss Method 1
        .mockReturnValueOnce([]) // Profit & Loss Method 3
        .mockReturnValueOnce([['ASIN', 'Title'], ['B123', 'Product 1']]) // Product Performance Method 1
        .mockReturnValueOnce([]) // Product Performance Method 3
        .mockReturnValueOnce([['Latest Payout', '500']]) // Payouts Method 1
        .mockReturnValueOnce([]) // Payouts Method 3
        .mockReturnValueOnce([['Sales This Month', '8000']]) // Amazon Performance Method 1
        .mockReturnValueOnce([]); // Amazon Performance Method 3

      mockXLSX.utils.sheet_to_csv
        .mockReturnValueOnce('Sales,10000') // Profit & Loss
        .mockReturnValueOnce('ASIN,Title\nB123,Product 1') // Product Performance
        .mockReturnValueOnce('Latest Payout,500') // Payouts
        .mockReturnValueOnce('Sales This Month,8000'); // Amazon Performance

      const mockParams = Promise.resolve({ id: 'multi-tab-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify all tabs were processed
      expect(consoleLogs.some(log => log.includes('Processing tab: "Profit & Loss"'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing tab: "Product Performance"'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing tab: "Payouts"'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing tab: "Amazon Performance"'))).toBe(true);

      expect(consoleLogs.some(log => log.includes('Total tabs found: 4'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });
  });

  describe('Google Sheets XLSX Export Failures with CSV Fallback', () => {
    it('should fallback to CSV when XLSX export fails', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'fallback-sheet.csv',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export failure
      mockDriveInstance.files.export
        .mockRejectedValueOnce(new Error('XLSX export not supported'))
        .mockResolvedValueOnce({
          data: 'Sales,1000\nCost of Goods,600'
        });

      const mockParams = Promise.resolve({ id: 'fallback-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify both export attempts
      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'fallback-sheet-id',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      expect(mockDriveInstance.files.export).toHaveBeenCalledWith({
        fileId: 'fallback-sheet-id',
        mimeType: 'text/csv'
      });

      // Verify console output
      expect(consoleLogs).toContain('Attempting to export Google Sheet as Excel (.xlsx)...');
      expect(consoleWarns.some(warn => warn.includes('Excel export failed, falling back to CSV export:'))).toBe(true);
      expect(consoleLogs).toContain('Attempting to export Google Sheet as CSV...');
      expect(consoleLogs.some(log => log.includes('Google Sheet CSV export length:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as CSV (fallback)');
    });

    it('should fallback to CSV when XLSX parsing fails', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'parse-fail-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export success but parsing failure
      const mockExcelBuffer = Buffer.from('corrupted excel data');
      mockDriveInstance.files.export
        .mockResolvedValueOnce({
          data: mockExcelBuffer
        })
        .mockResolvedValueOnce({
          data: 'Sales,1000\nProfit,400'
        });

      // Setup XLSX parsing failure
      mockXLSX.read.mockImplementation(() => {
        throw new Error('Corrupted Excel file');
      });

      const mockParams = Promise.resolve({ id: 'parse-fail-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify both export attempts
      expect(mockDriveInstance.files.export).toHaveBeenCalledTimes(2);

      // Verify console output
      expect(consoleLogs).toContain('Attempting to export Google Sheet as Excel (.xlsx)...');
      expect(consoleErrors.some(error => error.includes('Failed to parse Google Sheet Excel export:'))).toBe(true);
      expect(consoleWarns.some(warn => warn.includes('Excel export failed, falling back to CSV export:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as CSV (fallback)');
    });

    it('should return error when both XLSX and CSV exports fail', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'fail-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup both exports to fail
      mockDriveInstance.files.export
        .mockRejectedValueOnce(new Error('XLSX export failed'))
        .mockRejectedValueOnce(new Error('CSV export failed'));

      const mockParams = Promise.resolve({ id: 'fail-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify error response
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to export Google Sheet',
          details: expect.stringContaining('Excel export: XLSX export failed, CSV export: CSV export failed'),
          fileType: 'application/vnd.google-apps.spreadsheet',
          fileName: 'fail-sheet.xlsx'
        }),
        { status: 500 }
      );

      // Verify console output
      expect(consoleErrors.some(error => error.includes('Both Excel and CSV export failed:'))).toBe(true);
    });
  });

  describe('Google Sheets Edge Cases', () => {
    it('should handle empty XLSX export buffer', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'empty-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup empty XLSX export
      mockDriveInstance.files.export
        .mockResolvedValueOnce({
          data: Buffer.alloc(0) // Empty buffer
        })
        .mockResolvedValueOnce({
          data: 'Header1,Header2\nValue1,Value2'
        });

      const mockParams = Promise.resolve({ id: 'empty-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should fallback to CSV
      expect(mockDriveInstance.files.export).toHaveBeenCalledTimes(2);
      expect(consoleWarns.some(warn => warn.includes('Excel export failed, falling back to CSV export:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as CSV (fallback)');
    });

    it('should handle null XLSX export data', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'null-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup null XLSX export
      mockDriveInstance.files.export
        .mockResolvedValueOnce({
          data: null
        })
        .mockResolvedValueOnce({
          data: 'Data1,Data2\n100,200'
        });

      const mockParams = Promise.resolve({ id: 'null-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Should fallback to CSV
      expect(mockDriveInstance.files.export).toHaveBeenCalledTimes(2);
      expect(consoleWarns.some(warn => warn.includes('Excel export failed, falling back to CSV export:'))).toBe(true);
    });

    it('should handle very large Google Sheets', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'large-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup large XLSX export (simulated with large buffer)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB buffer
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: largeBuffer
      });

      // Setup successful parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:Z1000' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('');

      const mockParams = Promise.resolve({ id: 'large-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify large file was processed
      expect(consoleLogs.some(log => log.includes('Google Sheet Excel export size: 10485760 bytes'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });

    it('should handle Google Drive API returning string data for XLSX export', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'string-data-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export returning string data (which might happen in some environments)
      const mockExcelString = 'mock excel data as string';
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: mockExcelString
      });

      // Setup successful parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data1', 'Data2'], ['Value1', 'Value2']]);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('Data1,Data2\nValue1,Value2');

      const mockParams = Promise.resolve({ id: 'string-data-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify string data was converted to buffer and processed
      expect(consoleLogs.some(log => log.includes('XLSX response data type: string'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Google Sheet Excel export size:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });
  });

  describe('Google Sheets Content Validation', () => {
    it('should correctly identify and process Google Sheets with complex tab structures', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'complex-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export
      const mockExcelBuffer = Buffer.from('complex excel data');
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: mockExcelBuffer
      });

      // Setup workbook with complex structure
      const mockWorkbook = {
        SheetNames: ['Summary', 'Q1 Profit & Loss', 'Product Data 2024', 'Monthly Payouts', 'Amazon KPIs'],
        Sheets: {
          'Summary': { '!ref': 'A1:E10' },
          'Q1 Profit & Loss': { '!ref': 'A1:B20' },
          'Product Data 2024': { '!ref': 'A1:M100' },
          'Monthly Payouts': { '!ref': 'A1:C12' },
          'Amazon KPIs': { '!ref': 'A1:F25' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock specific data for each tab type
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Total Revenue', '50000']]) // Summary - Method 1
        .mockReturnValueOnce([]) // Summary - Method 3
        .mockReturnValueOnce([['Sales', '15000']]) // Q1 Profit & Loss - Method 1
        .mockReturnValueOnce([]) // Q1 Profit & Loss - Method 3
        .mockReturnValueOnce([['ASIN', 'Product Name'], ['B001', 'Widget A']]) // Product Data 2024 - Method 1
        .mockReturnValueOnce([]) // Product Data 2024 - Method 3
        .mockReturnValueOnce([['Latest Payout', '2500']]) // Monthly Payouts - Method 1
        .mockReturnValueOnce([]) // Monthly Payouts - Method 3
        .mockReturnValueOnce([['ACOS This Month', '12.5']]) // Amazon KPIs - Method 1
        .mockReturnValueOnce([]); // Amazon KPIs - Method 3

      mockXLSX.utils.sheet_to_csv
        .mockReturnValueOnce('Total Revenue,50000') // Summary
        .mockReturnValueOnce('Sales,15000') // Q1 Profit & Loss
        .mockReturnValueOnce('ASIN,Product Name\nB001,Widget A') // Product Data 2024
        .mockReturnValueOnce('Latest Payout,2500') // Monthly Payouts
        .mockReturnValueOnce('ACOS This Month,12.5'); // Amazon KPIs

      const mockParams = Promise.resolve({ id: 'complex-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify correct tab processing based on names
      expect(consoleLogs.some(log => log.includes('Processing Profit & Loss data from tab'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing Product Performance data from tab'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing Payouts data from tab'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Processing Amazon Performance data from tab'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Trying to detect content type from tab headers'))).toBe(true);

      expect(consoleLogs.some(log => log.includes('Total tabs found: 5'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });

    it('should handle Google Drive API returning object data for XLSX export', async () => {
      // Setup file metadata
      mockDriveInstance.files.get.mockResolvedValueOnce({
        data: {
          name: 'object-data-sheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        }
      });

      // Setup XLSX export returning object data (which might happen in some environments)
      const mockExcelObject = { data: 'mock excel data as object', length: 25 };
      mockDriveInstance.files.export.mockResolvedValueOnce({
        data: mockExcelObject
      });

      // Setup successful parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      mockXLSX.utils.sheet_to_json.mockReturnValue([['Data1', 'Data2'], ['Value1', 'Value2']]);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('Data1,Data2\nValue1,Value2');

      const mockParams = Promise.resolve({ id: 'object-data-sheet-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      // Verify object data was converted to buffer and processed
      expect(consoleLogs.some(log => log.includes('XLSX response data type: object'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Google Sheet Excel export size:'))).toBe(true);
      expect(consoleLogs).toContain('Successfully parsed Google Sheet as Excel');
    });
  });
});
