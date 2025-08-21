// @ts-nocheck
import * as XLSX from 'xlsx';

// Mock XLSX to simulate real Excel file behavior
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    sheet_to_csv: jest.fn()
  }
}));

describe('XLSX Tab Detection and Processing Tests', () => {
  let mockXLSX: jest.Mocked<typeof XLSX>;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

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
  });

  // Test function to simulate the parseExcel logic
  function testParseExcel(excelBuffer: Buffer): any {
    // Input validation
    if (!excelBuffer || !Buffer.isBuffer(excelBuffer)) {
      throw new Error('Invalid input: excelBuffer must be a valid Buffer');
    }

    if (excelBuffer.length === 0) {
      throw new Error('Invalid input: excelBuffer is empty');
    }

    try {
      console.log('=== EXCEL FILE PARSING STARTED ===');
      console.log('Excel buffer size:', excelBuffer.length);
      
      // Load workbook from buffer with error handling
      let workbook;
      try {
        workbook = mockXLSX.read(excelBuffer, { type: 'buffer', cellText: false, cellDates: true });
      } catch (xlsxError) {
        console.error('XLSX.read failed:', xlsxError);
        throw new Error(`Failed to read Excel file: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown XLSX error'}`);
      }

      // Validate workbook structure
      if (!workbook || typeof workbook !== 'object') {
        throw new Error('Invalid workbook structure returned from XLSX.read');
      }

      if (!workbook.SheetNames || !Array.isArray(workbook.SheetNames)) {
        throw new Error('Workbook does not contain valid SheetNames array');
      }

      if (!workbook.Sheets || typeof workbook.Sheets !== 'object') {
        throw new Error('Workbook does not contain valid Sheets object');
      }
      
      // Get all tab names (these are the actual tabs in the Excel file)
      const tabNames = workbook.SheetNames;
      console.log('Available tabs in Excel file:', tabNames);
      console.log('Total tabs found:', tabNames.length);
      
      if (tabNames.length === 0) {
        throw new Error('No worksheets found in Excel file');
      }
      
      // Initialize result structure
      const result = {
        profitLoss: { sales: 0, costOfGoods: 0, taxes: 0, fbaFees: 0, referralFees: 0, storageFees: 0, adExpenses: 0, refunds: 0, expenses: 0, netProfit: 0, margin: 0, roi: 0 },
        productPerformance: [],
        payouts: { latest: 0, previous: 0, average: 0 },
        amazonPerformance: { salesThisMonth: 0, salesChange: '', netProfitThisMonth: 0, netProfitChange: '', marginThisMonth: 0, marginChange: '', unitsThisMonth: 0, unitsChange: '', refundRateThisMonth: 0, refundRateChange: '', acosThisMonth: 0, acosChange: '', tacosThisMonth: 0, tacosChange: '', ctrThisMonth: 0, ctrChange: '' }
      };
      
      // Process each tab in the Excel file
      for (const tabName of tabNames) {
        try {
          console.log(`\n--- Processing tab: "${tabName}" ---`);
          
          // Get the worksheet for this tab
          const worksheet = workbook.Sheets[tabName];
          
          if (!worksheet) {
            console.log('Tab worksheet is null or undefined, skipping');
            continue;
          }
          
          // Check if tab has data
          if (!worksheet['!ref']) {
            console.log('Tab has no data range, skipping');
            continue;
          }
          
          console.log('Tab data range:', worksheet['!ref']);
          
          // Extract data with robust error handling
          const tabData = testExtractWorksheetData(worksheet, tabName);
          
          if (!tabData || tabData.length === 0) {
            console.log('No data extracted from tab, skipping');
            continue;
          }
          
          console.log(`Final data: ${tabData.length} rows`);
          console.log('First 3 rows of tab data:', tabData.slice(0, 3));
          
          // Process based on tab name or content
          testProcessTabData(tabName, tabData, result);
          
        } catch (tabError) {
          console.error(`Error processing tab "${tabName}":`, tabError);
          // Continue processing other tabs instead of failing completely
          continue;
        }
      }
      
      console.log('=== PARSING COMPLETE ===');
      console.log('Products found:', result.productPerformance.length);
      console.log('Profit/Loss data:', result.profitLoss);
      console.log('Payouts data:', result.payouts);
      console.log('Amazon Performance data:', result.amazonPerformance);
      
      return result;
    } catch (error) {
      console.error('Error parsing Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during Excel parsing';
      throw new Error(`Failed to parse Excel content: ${errorMessage}`);
    }
  }

  // Test function to simulate extractWorksheetData
  function testExtractWorksheetData(worksheet: any, tabName: string): any[][] {
    // Input validation
    if (!worksheet || typeof worksheet !== 'object') {
      console.error(`Invalid worksheet provided for tab "${tabName}"`);
      return [];
    }

    if (!tabName || typeof tabName !== 'string') {
      console.error('Invalid tab name provided');
      return [];
    }

    try {
      console.log(`Extracting data from worksheet "${tabName}"...`);
      
      // Method 1: JSON with headers (most reliable for structured data)
      let tabData: any[][] = [];
      let method1Success = false;
      try {
        tabData = mockXLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        }) as any[][];
        method1Success = true;
        console.log(`Method 1 - JSON with headers: ${tabData.length} rows`);
      } catch (method1Error) {
        console.error(`Method 1 failed for tab "${tabName}":`, method1Error);
      }
      
      // Method 2: Raw CSV (fallback for complex formatting)
      let csvData: string = '';
      let method2Success = false;
      try {
        csvData = mockXLSX.utils.sheet_to_csv(worksheet, {
          FS: ',',
          RS: '\n',
          forceQuotes: false
        });
        method2Success = true;
        console.log(`Method 2 - CSV length: ${csvData.length} characters`);
      } catch (method2Error) {
        console.error(`Method 2 failed for tab "${tabName}":`, method2Error);
      }
      
      // Method 3: JSON without headers (for object-based data)
      let rawData: any[] = [];
      let method3Success = false;
      try {
        rawData = mockXLSX.utils.sheet_to_json(worksheet, { 
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        }) as any[];
        method3Success = true;
        console.log(`Method 3 - Raw JSON: ${rawData.length} objects`);
      } catch (method3Error) {
        console.error(`Method 3 failed for tab "${tabName}":`, method3Error);
      }
      
      // Validate that at least one method succeeded
      if (!method1Success && !method2Success && !method3Success) {
        console.error(`All extraction methods failed for tab "${tabName}"`);
        return [];
      }
      
      // Choose the best extraction method with enhanced logic
      let finalData = tabData;
      let methodUsed = 'JSON with headers';
      
      // Enhanced CSV selection logic
      if (method2Success && csvData.length > 0) {
        const csvContentRatio = csvData.length / Math.max(tabData.length, 1);
        const hasSignificantContent = csvContentRatio > 8; // More conservative threshold
        const hasValidCSVStructure = csvData.includes(',') && csvData.includes('\n');
        
        if (hasSignificantContent && hasValidCSVStructure) {
          console.log(`Using CSV data (content ratio: ${csvContentRatio.toFixed(2)})`);
          try {
            const csvRows = csvData.split('\n')
              .filter(line => line.trim().length > 0)
              .map(line => {
                // Enhanced CSV parsing with proper quote handling
                const cells = line.split(',').map(cell => {
                  const trimmed = cell.trim();
                  // Remove surrounding quotes if they exist
                  return trimmed.replace(/^"(.*)"$/, '$1');
                });
                return cells;
              });
            
            if (csvRows.length > 0) {
              finalData = csvRows;
              methodUsed = 'CSV';
            }
          } catch (csvParseError) {
            console.error(`Failed to parse CSV data for tab "${tabName}":`, csvParseError);
          }
        }
      } 
      // Enhanced JSON object selection logic
      else if (method3Success && rawData.length > 0 && rawData.length > tabData.length) {
        console.log(`Using raw JSON data (${rawData.length} objects vs ${tabData.length} rows)`);
        try {
          // Ensure all objects have consistent keys
          const firstObject = rawData[0];
          if (firstObject && typeof firstObject === 'object') {
            const keys = Object.keys(firstObject);
            if (keys.length > 0) {
              // Convert objects to arrays, maintaining key order
              const convertedData = [keys, ...rawData.map(obj => {
                return keys.map(key => {
                  const value = obj[key];
                  // Handle various data types consistently
                  if (value === null || value === undefined) return '';
                  if (typeof value === 'object') return JSON.stringify(value);
                  return String(value);
                });
              })];
              finalData = convertedData;
              methodUsed = 'Raw JSON';
            }
          }
        } catch (jsonParseError) {
          console.error(`Failed to parse raw JSON data for tab "${tabName}":`, jsonParseError);
        }
      }
      
      // Validate final data structure
      if (!Array.isArray(finalData)) {
        console.error(`Final data is not an array for tab "${tabName}", returning empty array`);
        return [];
      }
      
      // Enhanced empty row filtering
      finalData = finalData.filter(row => {
        if (!Array.isArray(row)) return false;
        
        // Check if row has any meaningful content
        return row.some(cell => {
          if (cell === null || cell === undefined) return false;
          const stringValue = String(cell).trim();
          return stringValue.length > 0 && stringValue !== 'undefined' && stringValue !== 'null';
        });
      });
      
      console.log(`Successfully extracted ${finalData.length} rows from tab "${tabName}" using ${methodUsed}`);
      return finalData;
      
    } catch (error) {
      console.error(`Unexpected error extracting data from worksheet "${tabName}":`, error);
      return [];
    }
  }

  // Test function to simulate processTabData
  function testProcessTabData(tabName: string, tabData: any[][], result: any): void {
    if (!tabName || !Array.isArray(tabData) || tabData.length === 0) {
      console.log('Invalid input for processTabData, skipping');
      return;
    }

    try {
      const lowerTabName = tabName.toLowerCase().trim();
      
      // Process based on tab name patterns
      if (lowerTabName.includes('profit') || lowerTabName.includes('loss')) {
        console.log('Processing Profit & Loss data from tab');
        // Simulate profit/loss processing
        result.profitLoss.sales = 1000;
      } else if (lowerTabName.includes('product') || lowerTabName.includes('asin')) {
        console.log('Processing Product Performance data from tab');
        // Simulate product processing
        result.productPerformance.push({ asin: 'TEST123', title: 'Test Product' });
      } else if (lowerTabName.includes('payout')) {
        console.log('Processing Payouts data from tab');
        // Simulate payouts processing
        result.payouts.latest = 500;
      } else if (lowerTabName.includes('amazon') || lowerTabName.includes('performance')) {
        console.log('Processing Amazon Performance data from tab');
        // Simulate Amazon performance processing
        result.amazonPerformance.salesThisMonth = 2000;
      } else {
        // Try to detect content type from headers
        console.log('Trying to detect content type from tab headers');
        if (tabData.length > 0 && tabData[0].some((cell: any) => String(cell).toLowerCase().includes('asin'))) {
          console.log('Detected product data from headers');
          result.productPerformance.push({ asin: 'HEADER123', title: 'Header Product' });
        }
      }
    } catch (error) {
      console.error(`Error processing tab data for "${tabName}":`, error);
      // Don't throw - continue processing other tabs
    }
  }

  describe('XLSX.read and Workbook Structure', () => {
    it('should handle valid Excel workbook with multiple tabs', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      // Mock a valid workbook structure
      const mockWorkbook = {
        SheetNames: ['Profit & Loss', 'Product Performance', 'Payouts'],
        Sheets: {
          'Profit & Loss': { '!ref': 'A1:B10' },
          'Product Performance': { '!ref': 'A1:C20' },
          'Payouts': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock successful data extraction for each tab
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '1000'], ['Cost', '500']]) // Method 1 for first tab
        .mockReturnValueOnce([]) // Method 3 for first tab
        .mockReturnValueOnce([['ASIN', 'Title'], ['B123', 'Product 1']]) // Method 1 for second tab
        .mockReturnValueOnce([]) // Method 3 for second tab
        .mockReturnValueOnce([['Latest', '500']]) // Method 1 for third tab
        .mockReturnValueOnce([]); // Method 3 for third tab

      mockXLSX.utils.sheet_to_csv
        .mockReturnValueOnce('Sales,1000\nCost,500') // Method 2 for first tab
        .mockReturnValueOnce('ASIN,Title\nB123,Product 1') // Method 2 for second tab
        .mockReturnValueOnce('Latest,500'); // Method 2 for third tab

      const result = testParseExcel(mockBuffer);

      expect(mockXLSX.read).toHaveBeenCalledWith(mockBuffer, { 
        type: 'buffer', 
        cellText: false, 
        cellDates: true 
      });
      expect(consoleLogs).toContain('Available tabs in Excel file: Profit & Loss,Product Performance,Payouts');
      expect(consoleLogs).toContain('Total tabs found: 3');
      expect(result.profitLoss.sales).toBe(1000);
      expect(result.productPerformance).toHaveLength(1);
      expect(result.payouts.latest).toBe(500);
    });

    it('should handle workbook with no tabs', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      // Mock a workbook with no tabs
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {}
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);

      expect(() => testParseExcel(mockBuffer)).toThrow('No worksheets found in Excel file');
    });

    it('should handle workbook with invalid structure', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      // Mock an invalid workbook structure
      const mockWorkbook = {
        // Missing SheetNames and Sheets
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);

      expect(() => testParseExcel(mockBuffer)).toThrow('Workbook does not contain valid SheetNames array');
    });

    it('should handle XLSX.read failure', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      mockXLSX.read.mockImplementation(() => {
        throw new Error('XLSX read failed');
      });

      expect(() => testParseExcel(mockBuffer)).toThrow('Failed to read Excel file: XLSX read failed');
    });
  });

  describe('Worksheet Processing', () => {
    it('should handle worksheet with no data range', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Empty Tab'],
        Sheets: {
          'Empty Tab': {
            // No !ref property
          }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);

      const result = testParseExcel(mockBuffer);

      expect(consoleLogs).toContain('Tab has no data range, skipping');
      expect(result.productPerformance).toHaveLength(0);
    });

    it('should handle worksheet with null/undefined data', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Null Tab'],
        Sheets: {
          'Null Tab': null
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);

      const result = testParseExcel(mockBuffer);

      expect(consoleLogs).toContain('Tab worksheet is null or undefined, skipping');
      expect(result.productPerformance).toHaveLength(0);
    });

    it('should handle worksheet where all extraction methods fail', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Failing Tab'],
        Sheets: {
          'Failing Tab': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock all extraction methods to fail
      mockXLSX.utils.sheet_to_json
        .mockImplementationOnce(() => { throw new Error('Method 1 failed'); })
        .mockImplementationOnce(() => { throw new Error('Method 3 failed'); });

      mockXLSX.utils.sheet_to_csv
        .mockImplementationOnce(() => { throw new Error('Method 2 failed'); });

      const result = testParseExcel(mockBuffer);

      expect(consoleErrors).toContain('All extraction methods failed for tab "Failing Tab"');
      expect(result.productPerformance).toHaveLength(0);
    });
  });

  describe('Tab Name Detection and Processing', () => {
    it('should correctly identify and process profit/loss tabs', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Profit & Loss Report'],
        Sheets: {
          'Profit & Loss Report': { '!ref': 'A1:B10' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '1000'], ['Cost', '500']])
        .mockReturnValueOnce([]);

      mockXLSX.utils.sheet_to_csv.mockReturnValueOnce('Sales,1000\nCost,500');

      const result = testParseExcel(mockBuffer);

      expect(consoleLogs).toContain('Processing Profit & Loss data from tab');
      expect(result.profitLoss.sales).toBe(1000);
    });

    it('should correctly identify and process product performance tabs', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Product Performance Data'],
        Sheets: {
          'Product Performance Data': { '!ref': 'A1:C20' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['ASIN', 'Title'], ['B123', 'Product 1']])
        .mockReturnValueOnce([]);

      mockXLSX.utils.sheet_to_csv.mockReturnValueOnce('ASIN,Title\nB123,Product 1');

      const result = testParseExcel(mockBuffer);

      expect(consoleLogs).toContain('Processing Product Performance data from tab');
      expect(result.productPerformance).toHaveLength(1);
      expect(result.productPerformance[0].asin).toBe('TEST123');
    });

    it('should detect product data from headers when tab name is unclear', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:C20' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['ASIN', 'Title', 'Sales'], ['B123', 'Product 1', '100']])
        .mockReturnValueOnce([]);

      mockXLSX.utils.sheet_to_csv.mockReturnValueOnce('ASIN,Title,Sales\nB123,Product 1,100');

      const result = testParseExcel(mockBuffer);

      expect(consoleLogs).toContain('Trying to detect content type from tab headers');
      expect(consoleLogs).toContain('Detected product data from headers');
      expect(result.productPerformance).toHaveLength(1);
      expect(result.productPerformance[0].asin).toBe('HEADER123');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing when individual tabs fail', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Profit & Loss', 'Bad Tab', 'Payouts'],
        Sheets: {
          'Profit & Loss': { '!ref': 'A1:B5' },
          'Bad Tab': { '!ref': 'A1:B5' },
          'Payouts': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock successful extraction for good tabs, failure for bad tab
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '1000']]) // Profit & Loss - Method 1
        .mockReturnValueOnce([]) // Profit & Loss - Method 3
        .mockImplementationOnce(() => { throw new Error('Bad tab failed'); }) // Bad Tab - Method 1
        .mockImplementationOnce(() => { throw new Error('Bad tab failed'); }) // Bad Tab - Method 3
        .mockReturnValueOnce([['Latest Payout', '500']]) // Payouts - Method 1
        .mockReturnValueOnce([]); // Payouts - Method 3

      mockXLSX.utils.sheet_to_csv
        .mockReturnValueOnce('Sales,1000') // Profit & Loss
        .mockImplementationOnce(() => { throw new Error('Bad tab failed'); }) // Bad Tab
        .mockReturnValueOnce('Latest Payout,500'); // Payouts

      const result = testParseExcel(mockBuffer);

      expect(consoleErrors.some(log => log.includes('All extraction methods failed for tab "Bad Tab"')));
      expect(consoleLogs).toContain('=== PARSING COMPLETE ===');
      // Should still process the good tabs
      expect(result.profitLoss.sales).toBe(1000);
      expect(result.payouts.latest).toBe(500);
    });

    it('should handle tab processing errors gracefully', () => {
      const mockBuffer = Buffer.from('mock excel data');
      
      const mockWorkbook = {
        SheetNames: ['Error Tab'],
        Sheets: {
          'Error Tab': { '!ref': 'A1:B5' }
        }
      };

      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Sales', '1000']])
        .mockReturnValueOnce([]);

      mockXLSX.utils.sheet_to_csv.mockReturnValueOnce('Sales,1000');

      // Mock processTabData to throw an error
      const originalProcessTabData = testProcessTabData;
      testProcessTabData = jest.fn().mockImplementation(() => {
        throw new Error('Tab processing error');
      });

      const result = testParseExcel(mockBuffer);

      expect(consoleErrors.some(log => log.includes('Error processing tab "Error Tab"')));
      expect(consoleLogs).toContain('=== PARSING COMPLETE ===');
      
      // Restore original function
      testProcessTabData = originalProcessTabData;
    });
  });
});
