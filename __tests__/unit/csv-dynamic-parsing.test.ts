import { parseCSV } from '../../lib/csv-parser';

describe('Dynamic CSV Parsing Tests', () => {
  describe('Dynamic Section Detection', () => {
    it('should handle various Profit & Loss section names', () => {
      const csvWithVariations = `Financial Summary
Sales,$1,234.56
Cost of Goods,$567.89
Net Profit,$666.67

P&L
Revenue,$2,000.00
Expenses,$1,000.00

Profit and Loss
Income,$3,000.00
Costs,$1,500.00`;

      const result = parseCSV(csvWithVariations);
      
      expect(result.profitLoss.sales).toBe(1234.56);
      expect(result.profitLoss.costOfGoods).toBe(567.89);
      expect(result.profitLoss.netProfit).toBe(666.67);
    });

    it('should handle various Product Performance section names', () => {
      const csvWithVariations = `Product Data
ASIN,Title,Sales
B123,Test Product 1,$100.00

ASIN Performance
SKU,Name,Revenue
B456,Test Product 2,$200.00

Product Performance
Product ID,Product Name,Sales This Month
B789,Test Product 3,$300.00`;

      const result = parseCSV(csvWithVariations);
      
      expect(result.productPerformance).toHaveLength(3);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
    });

    it('should handle various Payouts section names', () => {
      const csvWithVariations = `Earnings
Current,$1,000.00
Last Month,$900.00

Revenue
This Month,$1,200.00
Previous,$1,100.00

Payout
Latest,$1,500.00
Previous,$1,400.00`;

      const result = parseCSV(csvWithVariations);
      
      expect(result.payouts.latest).toBe(1500);
      expect(result.payouts.previous).toBe(1400);
    });

    it('should handle various Amazon Performance section names', () => {
      const csvWithVariations = `Platform Performance
Sales This Month,$1,234.56
Net Profit This Month,$666.67

Marketplace Performance
Revenue This Month,$2,000.00
Profit This Month,$1,000.00

Amazon Performance
Sales,$3,000.00
Net Profit,$1,500.00`;

      const result = parseCSV(csvWithVariations);
      
      expect(result.amazonPerformance.salesThisMonth).toBe(3000);
      expect(result.amazonPerformance.netProfitThisMonth).toBe(1500);
    });
  });

  describe('Dynamic Metric Mapping', () => {
    it('should handle various sales metric names', () => {
      const csvWithVariations = `Profit & Loss
Revenue,$1,234.56
Sales,$2,345.67
Income,$3,456.78`;

      const result = parseCSV(csvWithVariations);
      
      // All should map to sales
      expect(result.profitLoss.sales).toBe(3456.78); // Last one wins
    });

    it('should handle various cost metric names', () => {
      const csvWithVariations = `Profit & Loss
Cost of Goods Sold,$500.00
COGS,$600.00
Cost of Goods,$700.00`;

      const result = parseCSV(csvWithVariations);
      
      // All should map to costOfGoods
      expect(result.profitLoss.costOfGoods).toBe(700); // Last one wins
    });

    it('should handle various profit metric names', () => {
      const csvWithVariations = `Profit & Loss
Net Profit,$1,000.00
Profit,$1,100.00
Net Income,$1,200.00`;

      const result = parseCSV(csvWithVariations);
      
      // All should map to netProfit
      expect(result.profitLoss.netProfit).toBe(1200); // Last one wins
    });

    it('should handle various fee metric names', () => {
      const csvWithVariations = `Profit & Loss
FBA Fees,$100.00
FBA,$150.00
Referral Fees,$200.00
Referral,$250.00
Storage Fees,$300.00
Storage,$350.00`;

      const result = parseCSV(csvWithVariations);
      
      expect(result.profitLoss.fbaFees).toBe(150); // Last FBA wins
      expect(result.profitLoss.referralFees).toBe(250); // Last referral wins
      expect(result.profitLoss.storageFees).toBe(350); // Last storage wins
    });

    it('should handle various advertising metric names', () => {
      const csvWithVariations = `Profit & Loss
Ad Expenses,$100.00
Advertising,$150.00
Ads,$200.00`;

      const result = parseCSV(csvWithVariations);
      
      // All should map to adExpenses
      expect(result.profitLoss.adExpenses).toBe(200); // Last one wins
    });
  });

  describe('Complex Dynamic Parsing', () => {
    it('should handle mixed case and various formats', () => {
      const complexCSV = `FINANCIAL SUMMARY
Revenue,$1,234.56
Cost of Goods Sold,$567.89
Net Income,$666.67
Margin,54.0%

PRODUCT DATA
ASIN,Product Name,Sales This Month,Net Profit This Month
B123,"Test Product 1","$100.00","$50.00"
B456,"Test Product 2","$200.00","$100.00"

EARNINGS
Current,$1,000.00
Previous,$900.00
Average,$950.00

PLATFORM PERFORMANCE
Sales This Month,$1,234.56
Net Profit This Month,$666.67
Margin This Month,54.0%`;

      const result = parseCSV(complexCSV);
      
      // Profit & Loss section
      expect(result.profitLoss.sales).toBe(1234.56);
      expect(result.profitLoss.costOfGoods).toBe(567.89);
      expect(result.profitLoss.netProfit).toBe(666.67);
      expect(result.profitLoss.margin).toBe(54);
      
      // Product Performance section
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[0].netProfitThisMonth).toBe(50);
      
      // Payouts section
      expect(result.payouts.latest).toBe(1000);
      expect(result.payouts.previous).toBe(900);
      expect(result.payouts.average).toBe(950);
      
      // Amazon Performance section
      expect(result.amazonPerformance.salesThisMonth).toBe(1234.56);
      expect(result.amazonPerformance.netProfitThisMonth).toBe(666.67);
      expect(result.amazonPerformance.marginThisMonth).toBe(54);
    });

    it('should handle CSV with no explicit sections but infer from headers', () => {
      const csvWithHeaders = `ASIN,Title,Sales This Month,Net Profit This Month,Margin This Month
B123,Test Product 1,$100.00,$50.00,50.0%
B456,Test Product 2,$200.00,$100.00,50.0%`;

      const result = parseCSV(csvWithHeaders);
      
      expect(result.productPerformance).toHaveLength(2);
      expect(result.productPerformance[0].asin).toBe('B123');
      expect(result.productPerformance[0].title).toBe('Test Product 1');
      expect(result.productPerformance[0].salesThisMonth).toBe(100);
      expect(result.productPerformance[0].netProfitThisMonth).toBe(50);
      expect(result.productPerformance[0].marginThisMonth).toBe(50);
    });
  });

  describe('Error Handling in Dynamic Parsing', () => {
    it('should handle malformed data gracefully', () => {
      const malformedCSV = `Profit & Loss
Sales,"$1,234.56
Cost of Goods,$567.89
Net Profit,"$666.67"`;

      const result = parseCSV(malformedCSV);
      
      // Should still parse what it can
      expect(result.profitLoss.costOfGoods).toBe(567.89);
    });

    it('should handle empty sections gracefully', () => {
      const emptySectionsCSV = `Profit & Loss

Per-Product Performance

Payouts

Amazon Performance`;

      const result = parseCSV(emptySectionsCSV);
      
      // Should return N/A for missing data
      expect(result.profitLoss.sales).toBe('N/A');
      expect(result.productPerformance).toHaveLength(0);
      expect(result.payouts.latest).toBe('N/A');
      expect(result.amazonPerformance.salesThisMonth).toBe('N/A');
    });
  });
});
