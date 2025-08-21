import { parseCSV } from '../../lib/csv-parser';

describe('Monthly Reports Dashboard CSV Parsing', () => {
  it('should parse real-world CSV data correctly for dashboard display', () => {
    const realWorldCSV = `Profit & Loss
Sales,$12,345.67
Cost of Goods,$5,678.90
Net Profit,$6,666.77
Margin,54.0%
FBA Fees,$234.56
Referral Fees,$567.89
Storage Fees,$123.45
Ad Expenses,$1,234.56
Refunds,$345.67
Expenses,$789.01

Per-Product Performance
ASIN,Title,Sales This Month,Sales Change,Net Profit This Month,Net Profit Change,Margin This Month,Margin Change,Units This Month,Units Change,Refund Rate This Month,Refund Rate Change,Ad Spend This Month,Ad Spend Change,ACOS This Month,ACOS Change,TACOS This Month,TACOS Change,CTR This Month,CTR Change,CVR This Month,CVR Change
B123,"Premium Widget Pro","$1,234.56","+15.2%","$567.89","+12.8%","46.0%","+2.1%","45","+5","2.5%","-0.5%","$123.45","+8.3%","10.0%","+1.2%","8.5%","+0.8%","3.2%","+0.4%","12.5%","+1.8%"
B456,"Budget Widget Basic","$987.65","+8.7%","$345.67","+6.2%","35.0%","+1.5%","32","+3","1.8%","-0.3%","$98.76","+5.1%","10.0%","+0.8%","7.2%","+0.5%","2.8%","+0.2%","10.2%","+1.1%"
B789,"Luxury Widget Elite","$2,345.67","+22.1%","$1,234.56","+18.9%","52.7%","+3.2%","67","+8","1.2%","-0.2%","$234.56","+12.5%","10.0%","+1.5%","9.1%","+0.9%","4.1%","+0.6%","15.3%","+2.2%"

Payouts
Latest,$8,765.43
Previous,$7,654.32
Average,$8,209.88

Amazon Performance
Sales This Month,$12,345.67
Sales Change,+15.2%
Net Profit This Month,$6,666.77
Net Profit Change,+12.8%
Margin This Month,54.0%
Margin Change,+2.1%
Units This Month,144
Units Change,+16
Refund Rate This Month,1.8%
Refund Rate Change,-0.3%
ACOS This Month,10.0%
ACOS Change,+1.2%
TACOS This Month,8.3%
TACOS Change,+0.7%
CTR This Month,3.4%
CTR Change,+0.4%
CVR This Month,12.7%
CVR Change,+1.7%`;

    const result = parseCSV(realWorldCSV);

    // Test Profit & Loss section
    expect(result.profitLoss.sales).toBe(12345.67);
    expect(result.profitLoss.costOfGoods).toBe(5678.90);
    expect(result.profitLoss.netProfit).toBe(6666.77);
    expect(result.profitLoss.margin).toBe(54);
    expect(result.profitLoss.fbaFees).toBe(234.56);
    expect(result.profitLoss.referralFees).toBe(567.89);
    expect(result.profitLoss.storageFees).toBe(123.45);
    expect(result.profitLoss.adExpenses).toBe(1234.56);
    expect(result.profitLoss.refunds).toBe(345.67);
    expect(result.profitLoss.expenses).toBe(789.01);

    // Test Product Performance section
    expect(result.productPerformance).toHaveLength(3);
    
    // First product
    expect(result.productPerformance[0].asin).toBe('B123');
    expect(result.productPerformance[0].title).toBe('Premium Widget Pro');
    expect(result.productPerformance[0].salesThisMonth).toBe(1234.56);
    expect(result.productPerformance[0].salesChange).toBe('+15.2%');
    expect(result.productPerformance[0].netProfitThisMonth).toBe(567.89);
    expect(result.productPerformance[0].netProfitChange).toBe('+12.8%');
    expect(result.productPerformance[0].marginThisMonth).toBe(46);
    expect(result.productPerformance[0].marginChange).toBe('+2.1%');
    expect(result.productPerformance[0].unitsThisMonth).toBe(45);
    expect(result.productPerformance[0].unitsChange).toBe('+5');
    expect(result.productPerformance[0].refundRateThisMonth).toBe(2.5);
    expect(result.productPerformance[0].refundRateChange).toBe('-0.5%');
    expect(result.productPerformance[0].adSpendThisMonth).toBe(123.45);
    expect(result.productPerformance[0].adSpendChange).toBe('+8.3%');
    expect(result.productPerformance[0].acosThisMonth).toBe(10);
    expect(result.productPerformance[0].acosChange).toBe('+1.2%');
    expect(result.productPerformance[0].tacosThisMonth).toBe(8.5);
    expect(result.productPerformance[0].tacosChange).toBe('+0.8%');
    expect(result.productPerformance[0].ctrThisMonth).toBe(3.2);
    expect(result.productPerformance[0].ctrChange).toBe('+0.4%');
    expect(result.productPerformance[0].cvrThisMonth).toBe(12.5);
    expect(result.productPerformance[0].cvrChange).toBe('+1.8%');

    // Second product
    expect(result.productPerformance[1].asin).toBe('B456');
    expect(result.productPerformance[1].title).toBe('Budget Widget Basic');
    expect(result.productPerformance[1].salesThisMonth).toBe(987.65);
    expect(result.productPerformance[1].netProfitThisMonth).toBe(345.67);
    expect(result.productPerformance[1].marginThisMonth).toBe(35);

    // Third product
    expect(result.productPerformance[2].asin).toBe('B789');
    expect(result.productPerformance[2].title).toBe('Luxury Widget Elite');
    expect(result.productPerformance[2].salesThisMonth).toBe(2345.67);
    expect(result.productPerformance[2].netProfitThisMonth).toBe(1234.56);
    expect(result.productPerformance[2].marginThisMonth).toBe(52.7);

    // Test Payouts section
    expect(result.payouts.latest).toBe(8765.43);
    expect(result.payouts.previous).toBe(7654.32);
    expect(result.payouts.average).toBe(8209.88);

    // Test Amazon Performance section
    expect(result.amazonPerformance.salesThisMonth).toBe(12345.67);
    expect(result.amazonPerformance.salesChange).toBe('+15.2%');
    expect(result.amazonPerformance.netProfitThisMonth).toBe(6666.77);
    expect(result.amazonPerformance.netProfitChange).toBe('+12.8%');
    expect(result.amazonPerformance.marginThisMonth).toBe(54);
    expect(result.amazonPerformance.marginChange).toBe('+2.1%');
    expect(result.amazonPerformance.unitsThisMonth).toBe(144);
    expect(result.amazonPerformance.unitsChange).toBe('+16');
    expect(result.amazonPerformance.refundRateThisMonth).toBe(1.8);
    expect(result.amazonPerformance.refundRateChange).toBe('-0.3%');
    expect(result.amazonPerformance.acosThisMonth).toBe(10);
    expect(result.amazonPerformance.acosChange).toBe('+1.2%');
    expect(result.amazonPerformance.tacosThisMonth).toBe(8.3);
    expect(result.amazonPerformance.tacosChange).toBe('+0.7%');
    expect(result.amazonPerformance.ctrThisMonth).toBe(3.4);
    expect(result.amazonPerformance.ctrChange).toBe('+0.4%');
    expect(result.amazonPerformance.cvrThisMonth).toBe(12.7);
    expect(result.amazonPerformance.cvrChange).toBe('+1.7%');
  });

  it('should handle CSV with different section naming conventions', () => {
    const alternativeCSV = `FINANCIAL SUMMARY
Revenue,$15,000.00
Cost of Goods Sold,$7,000.00
Net Income,$8,000.00
Profit Margin,53.3%

PRODUCT DATA
SKU,Product Name,Sales This Month,Net Profit This Month,Margin This Month
P001,"Product Alpha","$3,000.00","$1,500.00","50.0%"
P002,"Product Beta","$2,500.00","$1,250.00","50.0%"

EARNINGS
Current,$8,000.00
Last Month,$7,500.00
Average,$7,750.00

PLATFORM PERFORMANCE
Sales This Month,$15,000.00
Net Profit This Month,$8,000.00
Margin This Month,53.3%`;

    const result = parseCSV(alternativeCSV);

    // Test that alternative section names are recognized
    expect(result.profitLoss.sales).toBe(15000);
    expect(result.profitLoss.costOfGoods).toBe(7000);
    expect(result.profitLoss.netProfit).toBe(8000);
    expect(result.profitLoss.margin).toBe(53.3);

    expect(result.productPerformance).toHaveLength(2);
    expect(result.productPerformance[0].asin).toBe('P001');
    expect(result.productPerformance[0].title).toBe('Product Alpha');
    expect(result.productPerformance[0].salesThisMonth).toBe(3000);
    expect(result.productPerformance[0].netProfitThisMonth).toBe(1500);
    expect(result.productPerformance[0].marginThisMonth).toBe(50);

    expect(result.payouts.latest).toBe(8000);
    expect(result.payouts.previous).toBe(7500);
    expect(result.payouts.average).toBe(7750);

    expect(result.amazonPerformance.salesThisMonth).toBe(15000);
    expect(result.amazonPerformance.netProfitThisMonth).toBe(8000);
    expect(result.amazonPerformance.marginThisMonth).toBe(53.3);
  });

  it('should handle CSV with no explicit sections but infer from headers', () => {
    const headerOnlyCSV = `ASIN,Title,Sales This Month,Net Profit This Month,Margin This Month,Units This Month
B123,"Test Product 1","$1,000.00","$500.00","50.0%","25"
B456,"Test Product 2","$2,000.00","$1,000.00","50.0%","50"`;

    const result = parseCSV(headerOnlyCSV);

    // Should infer product performance from headers
    expect(result.productPerformance).toHaveLength(2);
    expect(result.productPerformance[0].asin).toBe('B123');
    expect(result.productPerformance[0].title).toBe('Test Product 1');
    expect(result.productPerformance[0].salesThisMonth).toBe(1000);
    expect(result.productPerformance[0].netProfitThisMonth).toBe(500);
    expect(result.productPerformance[0].marginThisMonth).toBe(50);
    expect(result.productPerformance[0].unitsThisMonth).toBe(25);

    expect(result.productPerformance[1].asin).toBe('B456');
    expect(result.productPerformance[1].title).toBe('Test Product 2');
    expect(result.productPerformance[1].salesThisMonth).toBe(2000);
    expect(result.productPerformance[1].netProfitThisMonth).toBe(1000);
    expect(result.productPerformance[1].marginThisMonth).toBe(50);
    expect(result.productPerformance[1].unitsThisMonth).toBe(50);
  });
});
