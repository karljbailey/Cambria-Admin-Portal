import { parseCSV } from '../../lib/csv-parser';

// Mock the isExcelContent function and parseExcel function
jest.mock('../../app/api/file/[id]/route', () => ({
  isExcelContent: jest.fn(),
  parseExcel: jest.fn()
}));

describe('CSV/Excel Content Detection Tests', () => {
  it('should handle regular CSV content correctly', () => {
    const regularCSV = `Profit & Loss
Sales,$1,234.56
Cost of Goods,$567.89
Net Profit,$666.67

Per-Product Performance
ASIN,Title,Sales This Month
B123,Test Product 1,$100.00
B456,Test Product 2,$200.00

Payouts
Latest,$5,000.00
Previous,$4,500.00
Average,$4,750.00

Amazon Performance
Sales This Month,$10,000.00
Net Profit This Month,$5,000.00
Margin This Month,50%`;

    const result = parseCSV(regularCSV);
    
    // Should parse as regular CSV
    expect(result.profitLoss.sales).toBe(1234.56);
    expect(result.profitLoss.costOfGoods).toBe(567.89);
    expect(result.profitLoss.netProfit).toBe(666.67);
    expect(result.productPerformance).toHaveLength(2);
    expect(result.payouts.latest).toBe(5000);
    expect(result.amazonPerformance.salesThisMonth).toBe(10000);
  });

  it('should handle CSV with Excel-like content indicators', () => {
    // This test simulates what would happen if Excel content was detected
    // The actual detection logic is in the route handler, but we can test the CSV parser
    // with content that might be misidentified
    
    const csvWithExcelIndicators = 'PK\x03\x04\x14\x00\b\b\b\x00\nxl/drawings/drawing1.xml\nxl/worksheets/sheet1.xml\nProfit & Loss\nSales,$1,234.56\nCost of Goods,$567.89';

    // This should still be parsed as CSV even if it contains Excel indicators
    // because the parseCSV function doesn't do content detection
    const result = parseCSV(csvWithExcelIndicators);
    
    // The parser should still try to extract what it can
    expect(result).toBeDefined();
    expect(typeof result.profitLoss.sales).toBe('number');
  });

  it('should handle empty content gracefully', () => {
    const emptyContent = '';
    const result = parseCSV(emptyContent);
    
    // Should return N/A values for missing data
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.payouts.latest).toBe('N/A');
    expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(result.productPerformance).toHaveLength(0);
  });

  it('should handle content with only Excel binary data', () => {
    // Simulate content that is purely Excel binary data
    const excelBinaryContent = 'PK\x03\x04\x14\x00\b\b\b\x00L\x14[\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x18\x00\x00\x00xl/drawings/drawing1.xml]n0\f\x07\x13\x0EUiZ\x18\x13C\x14^N0\x0E%n\x1B\x0E~J6i{\x01\x1Em?ntDb\x13|#\x12\x05z\x15]#\x0Eo(8`F\\n\x195ϼ"{^\x11}ZJV=:2\fӴ';
    
    const result = parseCSV(excelBinaryContent);
    
    // Should return N/A values since no valid CSV structure was found
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.payouts.latest).toBe('N/A');
    expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(result.productPerformance).toHaveLength(0);
  });

  it('should handle mixed content with both Excel indicators and CSV data', () => {
    const mixedContent = 'PK\x03\x04\x14\x00\b\b\b\x00\nxl/drawings/drawing1.xml\nxl/worksheets/sheet1.xml\n\nProfit & Loss\nSales,$1,234.56\nCost of Goods,$567.89\nNet Profit,$666.67\n\nPer-Product Performance\nASIN,Title,Sales This Month\nB123,Test Product 1,$100.00\nB456,Test Product 2,$200.00';

    const result = parseCSV(mixedContent);
    
    // Should still parse the CSV sections correctly
    expect(result.profitLoss.sales).toBe(1234.56);
    expect(result.profitLoss.costOfGoods).toBe(567.89);
    expect(result.profitLoss.netProfit).toBe(666.67);
    expect(result.productPerformance).toHaveLength(2);
    expect(result.productPerformance[0].asin).toBe('B123');
    expect(result.productPerformance[0].title).toBe('Test Product 1');
    expect(result.productPerformance[0].salesThisMonth).toBe(100);
  });
});
