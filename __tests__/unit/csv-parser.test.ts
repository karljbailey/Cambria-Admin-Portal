import { parseCSV, parseSections } from '../../lib/csv-parser';

describe('CSV Parser Unit Tests', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('parseCSV Function', () => {
    it('should parse CSV with section headers correctly', () => {
      const csvContent = `Profit & Loss
Sales,1000
Cost of Goods,500
Net Profit,500

Per-Product Performance
ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change
B123,Test Product 1,100,10%,50,5%
B456,Test Product 2,200,20%,100,10%`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.profitLoss.sales).toBe(1000);
      expect(result.profitLoss.costOfGoods).toBe(500);
      expect(result.profitLoss.netProfit).toBe(500);
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[1].asin).toBe('B456');
      expect(result.productPerformance[1].title).toBe('Test Product 2');
      expect(result.productPerformance[1].salesThisMonth).toBe(200);
      expect(consoleLogs.some(log => log.includes('Parsing 8 lines of CSV content'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Found section: Profit & Loss with 3 rows'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Found section: Per-Product Performance with 3 rows'))).toBe(true);
    });

    it('should handle CSV with quoted cells correctly', () => {
      const csvContent = `"Profit & Loss"
"Sales","1,000"
"Cost of Goods","500"
"Net Profit","500"

"Per-Product Performance"
"ASIN","Title","Sales This Month","Sales Change"
"B123","Test Product, with comma","100","10%"
"B456","Test Product 2","200","20%"`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product, with comma');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[1].asin).toBe('B456');
      expect(result.productPerformance[1].title).toBe('Test Product 2');
      expect(result.productPerformance[1].salesThisMonth).toBe(200);
    });

    it('should handle CSV with mixed case section headers', () => {
      const csvContent = `PROFIT & LOSS
Sales,1000
Cost of Goods,500

per-product performance
ASIN,Title,Sales
B123,Test Product,100

PAYOUTS
Latest,1000
Previous,900`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.productPerformance).toHaveLength(1);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
    });

    it('should handle CSV with no section headers and infer structure from headers', () => {
      const csvContent = `ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change
B123,Test Product 1,100,10%,50,5%
B456,Test Product 2,200,20%,100,10%`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[1].asin).toBe('B456');
      expect(result.productPerformance[1].title).toBe('Test Product 2');
      expect(result.productPerformance[1].salesThisMonth).toBe(200);
      expect(consoleLogs.some(log => log.includes('No sections detected, trying to infer structure from headers'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Inferred product performance section from headers'))).toBe(true);
    });

    it('should handle empty CSV content gracefully', () => {
      const csvContent = '';

      const result = parseCSV(csvContent);

      // Test that empty content returns N/A for missing data
      expect(result.profitLoss.sales).toBe('N/A');
      expect(result.profitLoss.costOfGoods).toBe('N/A');
      expect(result.profitLoss.netProfit).toBe('N/A');
      expect(result.productPerformance).toHaveLength(0);
      expect(result.payouts.latest).toBe('N/A');
      expect(result.payouts.previous).toBe('N/A');
      expect(result.payouts.average).toBe('N/A');
      expect(consoleLogs.some(log => log.includes('Parsing 0 lines of CSV content'))).toBe(true);
    });

    it('should handle CSV with only whitespace lines', () => {
      const csvContent = `   \n\n  \nProfit & Loss\nSales,1000\n\n\nCost of Goods,500\n  \n`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.profitLoss.sales).toBe(1000);
      expect(result.profitLoss.costOfGoods).toBe(500);
      expect(result.productPerformance).toHaveLength(0);
    });

    it('should handle CSV with malformed quotes gracefully', () => {
      const csvContent = `Profit & Loss
Sales,"1000
Cost of Goods,500
Net Profit,"500"`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.profitLoss.sales).toBe(1000);
      expect(result.profitLoss.costOfGoods).toBe(500);
      expect(result.profitLoss.netProfit).toBe(500);
      expect(result.productPerformance).toHaveLength(0);
    });

    it('should handle CSV with section headers in individual cells', () => {
      const csvContent = `Data,Profit & Loss,Other
Sales,1000,Info
Cost of Goods,500,Data
Net Profit,500,More`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.productPerformance).toHaveLength(0);
      expect(consoleLogs.some(log => log.includes('Found section header in cell: "Profit & Loss" at line 1'))).toBe(true);
    });

    it('should throw error for invalid CSV content', () => {
      const invalidContent = null as any;

      expect(() => parseCSV(invalidContent)).toThrow('Failed to parse CSV content');
      expect(consoleErrors.some(error => error.includes('Error parsing CSV'))).toBe(true);
    });

    it('should handle CSV with complex data types and formatting', () => {
      const csvContent = `Profit & Loss
Sales,"$1,234.56"
Cost of Goods,"$567.89"
Net Profit,"$666.67"
Margin,"54.0%"

Per-Product Performance
ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change,Margin This Month,Margin Change,Units This Month,Units Change,Refund Rate This Month,Refund Rate Change,Ad Spend This Month,Ad Spend Change,ACOS This Month,ACOS Change,TACOS This Month,TACOS Change,CTR This Month,CTR Change,CVR This Month,CVR Change
B123,"Test Product 1","$100.00","+10.5%","$50.00","+5.2%","50.0%","+2.1%","25","+3","2.5%","-0.5%","$15.00","+12.3%","15.0%","+1.2%","12.0%","+0.8%","2.5%","+0.3%","8.5%","+1.1%"
B456,"Test Product 2","$200.00","+20.0%","$100.00","+10.0%","50.0%","+5.0%","50","+5","1.5%","-0.3%","$25.00","+15.0%","12.5%","+2.0%","10.0%","+1.5%","3.0%","+0.5%","9.0%","+1.5%"`;

      const result = parseCSV(csvContent);

      // Test that the data was parsed correctly
      expect(result.profitLoss.sales).toBe(1234.56);
      expect(result.profitLoss.costOfGoods).toBe(567.89);
      expect(result.profitLoss.netProfit).toBe(666.67);
      expect(result.profitLoss.margin).toBe(54.0);
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[1].asin).toBe('B456');
      expect(result.productPerformance[1].title).toBe('Test Product 2');
      expect(result.productPerformance[1].salesThisMonth).toBe(200);
    });
  });
});
