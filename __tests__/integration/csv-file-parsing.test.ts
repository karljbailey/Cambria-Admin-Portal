import { GET } from '../../app/api/file/[id]/route';
import { NextRequest } from 'next/server';
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

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      ...data
    }))
  }
}));

describe('CSV File Parsing Integration Tests', () => {
  let mockGoogleAuth: jest.MockedClass<any>;
  let mockDrive: jest.MockedFunction<any>;
  let mockDriveInstance: any;
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

  const createMockCSVContent = () => {
    return `Profit & Loss
Sales,$1,234.56
Cost of Goods,$567.89
Net Profit,$666.67
Margin,54.0%

Per-Product Performance
ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change,Margin This Month,Margin Change,Units This Month,Units Change,Refund Rate This Month,Refund Rate Change,Ad Spend This Month,Ad Spend Change,ACOS This Month,ACOS Change,TACOS This Month,TACOS Change,CTR This Month,CTR Change,CVR This Month,CVR Change
B123,"Test Product 1","$100.00","+10.5%","$50.00","+5.2%","50.0%","+2.1%","25","+3","2.5%","-0.5%","$15.00","+12.3%","15.0%","+1.2%","12.0%","+0.8%","2.5%","+0.3%","8.5%","+1.1%"
B456,"Test Product 2","$200.00","+20.0%","$100.00","+10.0%","50.0%","+5.0%","50","+5","1.5%","-0.3%","$25.00","+15.0%","12.5%","+2.0%","10.0%","+1.5%","3.0%","+0.5%","9.0%","+1.5%"

Payouts
Latest,$1,000.00
Previous,$900.00
Average,$950.00

Amazon Performance
Sales This Month,$1,234.56
Sales Change,+15.2%
Net Profit This Month,$666.67
Net Profit Change,+12.8%
Margin This Month,54.0%
Margin Change,+2.1%
Units This Month,150
Units Change,+8.5%
Refund Rate This Month,2.5%
Refund Rate Change,-0.5%
ACOS This Month,15.0%
ACOS Change,+1.2%
TACOS This Month,12.0%
TACOS Change,+0.8%
CTR This Month,2.5%
CTR Change,+0.3%`;
  };

  describe('CSV File Processing', () => {
    it('should process CSV file successfully with all sections', async () => {
      // Setup file metadata
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'monthly-report.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: createMockCSVContent()
        });

      const mockParams = Promise.resolve({ id: 'csv-file-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('Processing CSV file: monthly-report.csv'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('CSV content length:'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with quoted cells and commas', async () => {
      const csvWithQuotes = `"Profit & Loss"
"Sales","$1,234.56"
"Cost of Goods","$567.89"
"Net Profit","$666.67"

"Per-Product Performance"
"ASIN","Title","Sales This Month"
"B123","Test Product, with comma","$100.00"
"B456","Test Product 2","$200.00"`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'quoted-csv.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: csvWithQuotes
        });

      const mockParams = Promise.resolve({ id: 'quoted-csv-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with no section headers and infer structure', async () => {
      const csvNoSections = `ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change
B123,Test Product 1,$100.00,+10.5%,$50.00,+5.2%
B456,Test Product 2,$200.00,+20.0%,$100.00,+10.0%`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'no-sections.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: csvNoSections
        });

      const mockParams = Promise.resolve({ id: 'no-sections-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('No sections detected, trying to infer structure from headers'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Inferred product performance section from headers'))).toBe(true);
    });

    it('should handle empty CSV file gracefully', async () => {
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'empty.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: ''
        });

      const mockParams = Promise.resolve({ id: 'empty-csv-id' });
      let result;
      try {
        result = await GET(mockNextRequest, { params: mockParams });
        console.log('Result:', result);
        console.log('Result type:', typeof result);
        console.log('Result status:', result?.status);
      } catch (error) {
        console.log('Error caught:', error);
        throw error;
      }

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(400);
      const resultData = await result.json();
      expect(resultData.error).toBe('CSV file content is null or undefined');
    });

    it('should handle CSV file with malformed content gracefully', async () => {
      const malformedCSV = `Profit & Loss
Sales,"$1,234.56
Cost of Goods,$567.89
Net Profit,"$666.67"`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'malformed.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: malformedCSV
        });

      const mockParams = Promise.resolve({ id: 'malformed-csv-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with mixed case section headers', async () => {
      const mixedCaseCSV = `PROFIT & LOSS
Sales,$1,234.56
Cost of Goods,$567.89

per-product performance
ASIN,Title,Sales This Month
B123,Test Product 1,$100.00

PAYOUTS
Latest,$1,000.00
Previous,$900.00`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'mixed-case.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: mixedCaseCSV
        });

      const mockParams = Promise.resolve({ id: 'mixed-case-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with whitespace-only lines', async () => {
      const whitespaceCSV = `   \n\n  \nProfit & Loss\nSales,$1,234.56\n\n\nCost of Goods,$567.89\n  \n`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'whitespace.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: whitespaceCSV
        });

      const mockParams = Promise.resolve({ id: 'whitespace-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with complex data formatting', async () => {
      const complexCSV = `Profit & Loss
Sales,"$1,234.56"
Cost of Goods,"$567.89"
Net Profit,"$666.67"
Margin,"54.0%"

Per-Product Performance
ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change,Margin This Month,Margin Change,Units This Month,Units Change,Refund Rate This Month,Refund Rate Change,Ad Spend This Month,Ad Spend Change,ACOS This Month,ACOS Change,TACOS This Month,TACOS Change,CTR This Month,CTR Change,CVR This Month,CVR Change
B123,"Test Product 1","$100.00","+10.5%","$50.00","+5.2%","50.0%","+2.1%","25","+3","2.5%","-0.5%","$15.00","+12.3%","15.0%","+1.2%","12.0%","+0.8%","2.5%","+0.3%","8.5%","+1.1%"
B456,"Test Product 2","$200.00","+20.0%","$100.00","+10.0%","50.0%","+5.0%","50","+5","1.5%","-0.3%","$25.00","+15.0%","12.5%","+2.0%","10.0%","+1.5%","3.0%","+0.5%","9.0%","+1.5%"`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'complex.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: complexCSV
        });

      const mockParams = Promise.resolve({ id: 'complex-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });
  });

  describe('CSV Error Handling', () => {
    it('should handle CSV file with null response data', async () => {
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'null-data.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: null
        });

      const mockParams = Promise.resolve({ id: 'null-data-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleErrors.some(error => error.includes('CSV response data is null or undefined'))).toBe(true);
    });

    it('should handle CSV file with undefined response data', async () => {
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'undefined-data.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: undefined
        });

      const mockParams = Promise.resolve({ id: 'undefined-data-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleErrors.some(error => error.includes('CSV response data is null or undefined'))).toBe(true);
    });

    it('should handle CSV file with empty content', async () => {
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'empty-content.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: ''
        });

      const mockParams = Promise.resolve({ id: 'empty-content-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(400);
      const resultData = await result.json();
      expect(resultData.error).toBe('CSV file content is null or undefined');
    });

    it('should handle CSV file with invalid data type', async () => {
      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'invalid-type.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: 123 // Invalid type
        });

      const mockParams = Promise.resolve({ id: 'invalid-type-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleErrors.some(error => error.includes('Unexpected CSV response data type'))).toBe(true);
    });

    it('should handle CSV file with Buffer data type', async () => {
      const bufferData = Buffer.from('Profit & Loss\nSales,1000\nCost of Goods,500');

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'buffer-data.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: bufferData
        });

      const mockParams = Promise.resolve({ id: 'buffer-data-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('Converting Buffer data to string'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });

    it('should handle CSV file with object data type', async () => {
      const objectData = { toString: () => 'Profit & Loss\nSales,1000\nCost of Goods,500' };

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'object-data.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: objectData
        });

      const mockParams = Promise.resolve({ id: 'object-data-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('Converting object data to string'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });
  });

  describe('CSV File Validation', () => {
    it('should validate CSV file size and content', async () => {
      const largeCSV = 'Profit & Loss\n' + 'Sales,1000\n'.repeat(1000); // Large CSV

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'large.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: largeCSV
        });

      const mockParams = Promise.resolve({ id: 'large-csv-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV content length:'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('CSV content validation successful'))).toBe(true);
    });

    it('should handle CSV file with special characters', async () => {
      const specialCharsCSV = `Profit & Loss
Sales,$1,234.56
Cost of Goods,$567.89
Net Profit,$666.67
Special Field,"Value with 'quotes' and \"double quotes\""
Unicode Field,€100.00
Emoji Field,🚀 Product`;

      mockDriveInstance.files.get
        .mockResolvedValueOnce({
          data: {
            name: 'special-chars.csv',
            mimeType: 'text/csv'
          }
        })
        .mockResolvedValueOnce({
          data: specialCharsCSV
        });

      const mockParams = Promise.resolve({ id: 'special-chars-id' });
      const result = await GET(mockNextRequest, { params: mockParams });

      expect(mockDriveInstance.files.get).toHaveBeenCalledTimes(2);
      expect(consoleLogs.some(log => log.includes('CSV PROCESSING COMPLETED'))).toBe(true);
    });
  });
});
