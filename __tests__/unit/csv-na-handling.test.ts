import { parseCSV, createEmptyParsedData } from '../../lib/csv-parser';

describe('CSV N/A Handling Tests', () => {
  it('should return N/A for empty CSV content', () => {
    const emptyCSV = '';
    const result = parseCSV(emptyCSV);
    
    // Check that all numeric fields return 'N/A' instead of 0
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.profitLoss.margin).toBe('N/A');
    
    expect(result.payouts.latest).toBe('N/A');
    expect(result.payouts.previous).toBe('N/A');
    expect(result.payouts.average).toBe('N/A');
    
    expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(result.amazonPerformance.netProfitThisMonth).toBe('N/A');
    expect(result.amazonPerformance.marginThisMonth).toBe('N/A');
    expect(result.amazonPerformance.unitsThisMonth).toBe('N/A');
    
    expect(result.productPerformance).toHaveLength(0);
  });

  it('should return N/A for CSV with only section headers but no data', () => {
    const csvWithHeadersOnly = `Profit & Loss

Per-Product Performance

Payouts

Amazon Performance`;
    
    const result = parseCSV(csvWithHeadersOnly);
    
    // Check that all numeric fields return 'N/A' instead of 0
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    
    expect(result.payouts.latest).toBe('N/A');
    expect(result.payouts.previous).toBe('N/A');
    expect(result.payouts.average).toBe('N/A');
    
    expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(result.amazonPerformance.netProfitThisMonth).toBe('N/A');
    expect(result.amazonPerformance.marginThisMonth).toBe('N/A');
    
    expect(result.productPerformance).toHaveLength(0);
  });

  it('should return N/A for invalid numeric values', () => {
    const csvWithInvalidValues = `Profit & Loss
Sales,N/A
Cost of Goods,Invalid
Net Profit,
Margin,Not a number

Payouts
Latest,N/A
Previous,
Average,Invalid data

Amazon Performance
Sales This Month,N/A
Net Profit This Month,
Margin This Month,Invalid`;
    
    const result = parseCSV(csvWithInvalidValues);
    
    // Check that invalid values return 'N/A'
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.profitLoss.margin).toBe('N/A');
    
    expect(result.payouts.latest).toBe('N/A');
    expect(result.payouts.previous).toBe('N/A');
    expect(result.payouts.average).toBe('N/A');
    
    expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(result.amazonPerformance.netProfitThisMonth).toBe('N/A');
    expect(result.amazonPerformance.marginThisMonth).toBe('N/A');
  });

  it('should return N/A for empty cells in product performance', () => {
    const csvWithEmptyProductData = `Per-Product Performance
ASIN,Title,Sales This Month,Net Profit This Month,Margin This Month
B123,Test Product 1,,,
B456,Test Product 2,N/A,Invalid,
B789,Test Product 3,100,50,25%`;
    
    const result = parseCSV(csvWithEmptyProductData);
    
    expect(result.productPerformance).toHaveLength(3);
    
    // First product - empty values should be 'N/A'
    expect(result.productPerformance[0].salesThisMonth).toBe('N/A');
    expect(result.productPerformance[0].netProfitThisMonth).toBe('N/A');
    expect(result.productPerformance[0].marginThisMonth).toBe('N/A');
    
    // Second product - invalid values should be 'N/A'
    expect(result.productPerformance[1].salesThisMonth).toBe('N/A');
    expect(result.productPerformance[1].netProfitThisMonth).toBe('N/A');
    expect(result.productPerformance[1].marginThisMonth).toBe('N/A');
    
    // Third product - valid values should be numbers
    expect(result.productPerformance[2].salesThisMonth).toBe(100);
    expect(result.productPerformance[2].netProfitThisMonth).toBe(50);
    expect(result.productPerformance[2].marginThisMonth).toBe(25);
  });

  it('should return N/A for mixed valid and invalid data', () => {
    const csvWithMixedData = `Profit & Loss
Sales,$1,234.56
Cost of Goods,N/A
Net Profit,
Margin,25.5%

Payouts
Latest,$5,000.00
Previous,
Average,N/A

Amazon Performance
Sales This Month,$10,000.00
Net Profit This Month,Invalid
Margin This Month,30%`;
    
    const result = parseCSV(csvWithMixedData);
    
    // Valid values should be numbers
    expect(result.profitLoss.sales).toBe(1234.56);
    expect(result.profitLoss.margin).toBe(25.5);
    expect(result.payouts.latest).toBe(5000);
    expect(result.amazonPerformance.salesThisMonth).toBe(10000);
    expect(result.amazonPerformance.marginThisMonth).toBe(30);
    
    // Invalid/empty values should be 'N/A'
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.payouts.previous).toBe('N/A');
    expect(result.payouts.average).toBe('N/A');
    expect(result.amazonPerformance.netProfitThisMonth).toBe('N/A');
  });

  it('should handle case-insensitive N/A values', () => {
    const csvWithCaseVariations = `Profit & Loss
Sales,n/a
Cost of Goods,N/A
Net Profit,Na
Margin,na`;
    
    const result = parseCSV(csvWithCaseVariations);
    
    expect(result.profitLoss.sales).toBe('N/A');
    expect(result.profitLoss.costOfGoods).toBe('N/A');
    expect(result.profitLoss.netProfit).toBe('N/A');
    expect(result.profitLoss.margin).toBe('N/A');
  });

  it('should verify createEmptyParsedData returns N/A values', () => {
    const emptyData = createEmptyParsedData();
    
    // Check that all numeric fields return 'N/A'
    expect(emptyData.profitLoss.sales).toBe('N/A');
    expect(emptyData.profitLoss.costOfGoods).toBe('N/A');
    expect(emptyData.profitLoss.netProfit).toBe('N/A');
    expect(emptyData.profitLoss.margin).toBe('N/A');
    
    expect(emptyData.payouts.latest).toBe('N/A');
    expect(emptyData.payouts.previous).toBe('N/A');
    expect(emptyData.payouts.average).toBe('N/A');
    
    expect(emptyData.amazonPerformance.salesThisMonth).toBe('N/A');
    expect(emptyData.amazonPerformance.netProfitThisMonth).toBe('N/A');
    expect(emptyData.amazonPerformance.marginThisMonth).toBe('N/A');
    expect(emptyData.amazonPerformance.unitsThisMonth).toBe('N/A');
    
    expect(emptyData.productPerformance).toHaveLength(0);
  });
});
