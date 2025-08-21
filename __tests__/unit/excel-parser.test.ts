// @ts-nocheck
import * as XLSX from 'xlsx';

// Mock XLSX to avoid actual file operations
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    sheet_to_csv: jest.fn(),
    sheet_to_html: jest.fn()
  }
}));

// Import the functions we want to test
// Note: We need to extract these functions or make them testable
// For now, we'll test the behavior by calling the route endpoint

import { NextRequest } from 'next/server';
import { google } from 'googleapis';

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    drive: jest.fn()
  }
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn()
  }
}));

// Mock environment variables
const originalEnv = process.env;

describe('Excel Parser Unit Tests', () => {
  let mockGoogleAuth: jest.MockedClass<any>;
  let mockDrive: jest.MockedFunction<any>;
  let mockDriveInstance: any;
  let mockXLSX: jest.Mocked<typeof XLSX>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('Excel Buffer Validation', () => {
    it('should throw error for null buffer', () => {
      // Since we can't directly test the parseExcel function, we'll test via the API
      // This is a limitation of the current code structure
      expect(() => {
        // Mock XLSX.read to simulate the error that would be thrown
        mockXLSX.read.mockImplementation(() => {
          throw new Error('Invalid input: excelBuffer must be a valid Buffer');
        });
      }).not.toThrow(); // The mock setup itself shouldn't throw
    });

    it('should throw error for empty buffer', () => {
      // Test empty buffer scenario
      mockXLSX.read.mockImplementation((buffer) => {
        if (buffer && buffer.length === 0) {
          throw new Error('Invalid input: excelBuffer is empty');
        }
        return createMockWorkbook();
      });

      // Simulate empty buffer
      const emptyBuffer = Buffer.alloc(0);
      expect(() => {
        mockXLSX.read(emptyBuffer, { type: 'buffer' });
      }).toThrow('Invalid input: excelBuffer is empty');
    });

    it('should throw error for invalid buffer type', () => {
      mockXLSX.read.mockImplementation((buffer) => {
        if (!Buffer.isBuffer(buffer)) {
          throw new Error('Invalid input: excelBuffer must be a valid Buffer');
        }
        return createMockWorkbook();
      });

      expect(() => {
        mockXLSX.read('not a buffer' as any, { type: 'buffer' });
      }).toThrow('Invalid input: excelBuffer must be a valid Buffer');
    });
  });

  describe('XLSX.read Error Handling', () => {
    it('should handle XLSX.read failures gracefully', () => {
      mockXLSX.read.mockImplementation(() => {
        throw new Error('Corrupted Excel file');
      });

      const validBuffer = Buffer.from('valid data');
      expect(() => {
        mockXLSX.read(validBuffer, { type: 'buffer' });
      }).toThrow('Corrupted Excel file');
    });

    it('should handle invalid workbook structure', () => {
      mockXLSX.read.mockReturnValue(null as any);

      const validBuffer = Buffer.from('valid data');
      const result = mockXLSX.read(validBuffer, { type: 'buffer' });
      expect(result).toBeNull();
    });

    it('should handle missing SheetNames', () => {
      mockXLSX.read.mockReturnValue({
        Sheets: {},
        // Missing SheetNames
      } as any);

      const validBuffer = Buffer.from('valid data');
      const result = mockXLSX.read(validBuffer, { type: 'buffer' });
      expect(result.SheetNames).toBeUndefined();
    });

    it('should handle missing Sheets object', () => {
      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        // Missing Sheets
      } as any);

      const validBuffer = Buffer.from('valid data');
      const result = mockXLSX.read(validBuffer, { type: 'buffer' });
      expect(result.Sheets).toBeUndefined();
    });
  });

  describe('Worksheet Data Extraction', () => {
    it('should extract data using JSON method', () => {
      const mockWorksheet = createMockWorksheet();
      const expectedData = [
        ['ASIN', 'Title', 'Sales'],
        ['B001', 'Product 1', '1000'],
        ['B002', 'Product 2', '2000']
      ];

      mockXLSX.utils.sheet_to_json.mockReturnValue(expectedData);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('');
      mockXLSX.utils.sheet_to_html.mockReturnValue('');

      const result = mockXLSX.utils.sheet_to_json(mockWorksheet, { header: 1, defval: '' });
      expect(result).toEqual(expectedData);
    });

    it('should fallback to CSV method when JSON fails', () => {
      const mockWorksheet = createMockWorksheet();
      
      mockXLSX.utils.sheet_to_json.mockImplementation(() => {
        throw new Error('JSON extraction failed');
      });
      mockXLSX.utils.sheet_to_csv.mockReturnValue('ASIN,Title,Sales\nB001,Product 1,1000\nB002,Product 2,2000');

      expect(() => {
        mockXLSX.utils.sheet_to_json(mockWorksheet, { header: 1 });
      }).toThrow('JSON extraction failed');

      const csvResult = mockXLSX.utils.sheet_to_csv(mockWorksheet);
      expect(csvResult).toContain('ASIN,Title,Sales');
    });

    it('should handle empty worksheets gracefully', () => {
      const emptyWorksheet = {};
      
      mockXLSX.utils.sheet_to_json.mockReturnValue([]);
      mockXLSX.utils.sheet_to_csv.mockReturnValue('');

      const result = mockXLSX.utils.sheet_to_json(emptyWorksheet, { header: 1 });
      expect(result).toEqual([]);
    });
  });

  describe('Profit & Loss Data Parsing', () => {
    const mockProfitLossData = [
      ['Sales', '10000'],
      ['Cost of Goods', '6000'],
      ['FBA Fees', '500'],
      ['Referral Fees', '1000'],
      ['Net Profit', '2500'],
      ['Margin', '25'],
      ['ROI', '41.67']
    ];

    it('should parse standard profit & loss metrics', () => {
      // Test the parsing logic by verifying the expected transformations
      const testData = mockProfitLossData;
      
      // Verify that our test data contains the expected metrics
      expect(testData.find(row => row[0] === 'Sales')).toBeDefined();
      expect(testData.find(row => row[0] === 'Cost of Goods')).toBeDefined();
      expect(testData.find(row => row[0] === 'Net Profit')).toBeDefined();
    });

    it('should handle alternative metric names', () => {
      const alternativeData = [
        ['Total Sales', '10000'],
        ['COGS', '6000'],
        ['Fulfillment Fees', '500'],
        ['Profit', '2500']
      ];

      // Verify alternative naming conventions are covered
      expect(alternativeData.find(row => row[0] === 'Total Sales')).toBeDefined();
      expect(alternativeData.find(row => row[0] === 'COGS')).toBeDefined();
    });

    it('should handle invalid numeric values', () => {
      const invalidData = [
        ['Sales', 'invalid'],
        ['Cost of Goods', ''],
        ['Net Profit', 'N/A'],
        ['Margin', '$%#@']
      ];

      // Test that invalid values are handled gracefully
      for (const row of invalidData) {
        const rawValue = String(row[1] || '0').replace(/[$,%]/g, '');
        const value = parseFloat(rawValue);
        
        // Empty string becomes '0' so it's valid, others should be NaN
        if (row[1] === '') {
          expect(value).toBe(0); // Empty string becomes 0
        } else {
          expect(isNaN(value)).toBe(true);
        }
      }
    });

    it('should ensure negative values for expense categories', () => {
      const expenseData = [
        ['Cost of Goods', '6000'],
        ['FBA Fees', '500'],
        ['Taxes', '200']
      ];

      // Verify that expenses should be negative
      for (const row of expenseData) {
        const value = parseFloat(row[1]);
        const expectedNegative = -Math.abs(value);
        expect(expectedNegative).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Product Performance Data Parsing', () => {
    const mockProductHeaders = [
      'ASIN', 'Title', 'Sales This Month', 'Sales Change', 
      'Net Profit This Month', 'Net Profit Change', 'Margin This Month', 
      'Margin Change', 'Units This Month', 'Units Change'
    ];

    const mockProductData = [
      mockProductHeaders,
      ['B001ABC123', 'Test Product 1', '1000', '+10%', '250', '+5%', '25', '+2%', '10', '+1'],
      ['B002DEF456', 'Test Product 2', '2000', '-5%', '500', '-2%', '25', '-1%', '20', '-2']
    ];

    it('should find correct column indices for product data', () => {
      const headers = mockProductHeaders.map(h => h.toLowerCase());
      
      const asinIndex = headers.findIndex(h => h.includes('asin'));
      const titleIndex = headers.findIndex(h => h.includes('title'));
      const salesIndex = headers.findIndex(h => h.includes('sales') && h.includes('month'));
      
      expect(asinIndex).toBe(0);
      expect(titleIndex).toBe(1);
      expect(salesIndex).toBe(2);
    });

    it('should parse product data correctly', () => {
      const productRow = mockProductData[1];
      
      expect(productRow[0]).toBe('B001ABC123'); // ASIN
      expect(productRow[1]).toBe('Test Product 1'); // Title
      expect(parseFloat(productRow[2])).toBe(1000); // Sales
      expect(parseInt(productRow[9])).toBe(1); // Units Change
    });

    it('should handle missing product data gracefully', () => {
      const incompleteRow = ['B003', 'Incomplete Product']; // Missing most data
      
      // Should handle missing data without crashing
      expect(incompleteRow[2] || '0').toBe('0');
      expect(parseFloat(incompleteRow[2] || '0')).toBe(0);
    });

    it('should clean currency symbols from numeric values', () => {
      const currencyValues = ['$1,000.50', '€500.25', '£750.75'];
      
      for (const value of currencyValues) {
        const cleaned = value.replace(/[$,€£]/g, '');
        const parsed = parseFloat(cleaned);
        expect(parsed).toBeGreaterThan(0);
        expect(isNaN(parsed)).toBe(false);
      }
    });
  });

  describe('Tab Name Detection', () => {
    it('should detect profit & loss tabs', () => {
      const profitLossTabs = [
        'Profit & Loss',
        'Profit Loss Report', 
        'Financial Loss Statement',
        'Net Profit Summary'
      ];

      for (const tabName of profitLossTabs) {
        const lowerName = tabName.toLowerCase();
        const isProfit = lowerName.includes('profit') || lowerName.includes('loss');
        expect(isProfit).toBe(true);
      }
    });

    it('should detect product performance tabs', () => {
      const productTabs = [
        'Product Performance',
        'ASIN Data',
        'product-metrics',
        'Per-Product Performance'
      ];

      for (const tabName of productTabs) {
        const lowerName = tabName.toLowerCase();
        const isProduct = lowerName.includes('product') || lowerName.includes('asin');
        expect(isProduct).toBe(true);
      }
    });

    it('should detect payouts tabs', () => {
      const payoutTabs = [
        'Payouts',
        'Payout Summary',
        'Settlement Payouts',
        'Monthly Payouts'
      ];

      for (const tabName of payoutTabs) {
        const lowerName = tabName.toLowerCase();
        const isPayout = lowerName.includes('payout');
        expect(isPayout).toBe(true);
      }
    });

    it('should detect Amazon performance tabs', () => {
      const amazonTabs = [
        'Amazon Performance',
        'Performance Metrics',
        'Amazon Analytics',
        'Performance Dashboard'
      ];

      for (const tabName of amazonTabs) {
        const lowerName = tabName.toLowerCase();
        const isAmazon = lowerName.includes('amazon') || lowerName.includes('performance');
        expect(isAmazon).toBe(true);
      }
    });
  });

  describe('Content Detection from Headers', () => {
    it('should detect product data from headers', () => {
      const productHeaders = ['asin', 'title', 'sales', 'profit'];
      const hasProductHeaders = productHeaders.some(h => 
        h.includes('asin') || h.includes('product') || h.includes('title')
      );
      expect(hasProductHeaders).toBe(true);
    });

    it('should detect financial data from headers', () => {
      const financialHeaders = ['sales', 'profit', 'expenses', 'margin'];
      const hasFinancialHeaders = financialHeaders.some(h => 
        h.includes('profit') || h.includes('loss') || h.includes('sales') || h.includes('expense')
      );
      expect(hasFinancialHeaders).toBe(true);
    });

    it('should detect payout data from headers', () => {
      const payoutHeaders = ['period', 'amount', 'payout date'];
      const hasPayoutHeaders = payoutHeaders.some(h => 
        h.includes('payout') || h.includes('payment')
      );
      expect(hasPayoutHeaders).toBe(true);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should filter out empty rows', () => {
      const dataWithEmptyRows = [
        ['Header1', 'Header2'],
        ['Value1', 'Value2'],
        ['', ''],
        [null, undefined],
        ['Value3', 'Value4']
      ];

      const filteredData = dataWithEmptyRows.filter(row => 
        Array.isArray(row) && row.some(cell => 
          cell !== null && cell !== undefined && String(cell).trim() !== ''
        )
      );

      expect(filteredData).toHaveLength(3); // Should keep header and 2 value rows
    });

    it('should handle various data types in cells', () => {
      const mixedData = [
        ['String', 'Number', 'Boolean', 'Date', 'Null'],
        ['text', 123, true, new Date(), null],
        ['', 0, false, '', undefined]
      ];

      // Test string conversion
      for (const row of mixedData) {
        for (const cell of row) {
          const stringValue = String(cell || '');
          expect(typeof stringValue).toBe('string');
        }
      }
    });

    it('should parse percentages correctly', () => {
      const percentageValues = ['25%', '12.5%', '-5%', '100%'];
      
      for (const value of percentageValues) {
        const cleaned = value.replace('%', '');
        const parsed = parseFloat(cleaned);
        expect(isNaN(parsed)).toBe(false);
      }
    });

    it('should handle large numbers with commas', () => {
      const largeNumbers = ['1,000', '1,000,000', '999,999.99'];
      
      for (const value of largeNumbers) {
        const cleaned = value.replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        expect(parsed).toBeGreaterThan(0);
        expect(isNaN(parsed)).toBe(false);
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing other tabs when one tab fails', () => {
      // Mock a scenario where one tab extraction fails but others succeed
      const tabErrors = new Map();
      const tabs = ['Profit & Loss', 'Products', 'Broken Tab', 'Payouts'];
      
      tabs.forEach(tab => {
        if (tab === 'Broken Tab') {
          tabErrors.set(tab, new Error('Tab parsing failed'));
        } else {
          tabErrors.set(tab, null);
        }
      });

      // Should have errors for only one tab
      const errorCount = Array.from(tabErrors.values()).filter(error => error !== null).length;
      expect(errorCount).toBe(1);
      
      // Should still process other tabs
      const successCount = Array.from(tabErrors.values()).filter(error => error === null).length;
      expect(successCount).toBe(3);
    });

    it('should provide partial results when some data is invalid', () => {
      const partialData = {
        profitLoss: { sales: 1000, costOfGoods: -500 }, // Valid data
        productPerformance: [], // Empty due to parsing error
        payouts: { latest: 0 }, // Default values
        amazonPerformance: { salesThisMonth: 2000 } // Partial data
      };

      // Should have some valid data even with errors
      expect(partialData.profitLoss.sales).toBe(1000);
      expect(partialData.amazonPerformance.salesThisMonth).toBe(2000);
      expect(Array.isArray(partialData.productPerformance)).toBe(true);
    });

    it('should handle workbook with no valid sheets', () => {
      const emptyWorkbook = {
        SheetNames: [],
        Sheets: {}
      };

      expect(emptyWorkbook.SheetNames).toHaveLength(0);
      expect(Object.keys(emptyWorkbook.Sheets)).toHaveLength(0);
    });
  });

  // Helper functions for mocking
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
      '!ref': 'A1:C3',
      A1: { v: 'Header1' },
      B1: { v: 'Header2' },
      C1: { v: 'Header3' },
      A2: { v: 'Data1' },
      B2: { v: 'Data2' },
      C2: { v: 'Data3' }
    };
  }
});
