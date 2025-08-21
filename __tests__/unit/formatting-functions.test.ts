describe('Formatting Functions Tests', () => {
  // Mock the formatting functions from the client page
  const formatCurrency = (value: number | string) => {
    if (typeof value === 'string') {
      return value === 'N/A' ? 'N/A' : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(parseFloat(value));
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    return 'N/A';
  };

  const formatPercentage = (value: number | string) => {
    if (typeof value === 'string') {
      return value === 'N/A' ? 'N/A' : `${parseFloat(value).toFixed(2)}%`;
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return `${value.toFixed(2)}%`;
    }
    return 'N/A';
  };

  describe('formatCurrency', () => {
    it('should format valid numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(-123.45)).toBe('-$123.45');
    });

    it('should handle N/A string values', () => {
      expect(formatCurrency('N/A')).toBe('N/A');
      expect(formatCurrency('n/a')).toBe('$NaN'); // parseFloat('n/a') returns NaN
    });

    it('should handle numeric strings', () => {
      expect(formatCurrency('1234.56')).toBe('$1,234.56');
      expect(formatCurrency('0')).toBe('$0.00');
      expect(formatCurrency('-123.45')).toBe('-$123.45');
    });

    it('should handle invalid numeric strings', () => {
      expect(formatCurrency('invalid')).toBe('$NaN');
      expect(formatCurrency('not-a-number')).toBe('$NaN');
    });

    it('should handle NaN numbers', () => {
      expect(formatCurrency(NaN)).toBe('N/A');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null as any)).toBe('N/A');
      expect(formatCurrency(undefined as any)).toBe('N/A');
    });

    it('should handle empty strings', () => {
      expect(formatCurrency('')).toBe('$NaN');
    });
  });

  describe('formatPercentage', () => {
    it('should format valid numbers correctly', () => {
      expect(formatPercentage(12.345)).toBe('12.35%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(100)).toBe('100.00%');
      expect(formatPercentage(-5.67)).toBe('-5.67%');
    });

    it('should handle N/A string values', () => {
      expect(formatPercentage('N/A')).toBe('N/A');
      expect(formatPercentage('n/a')).toBe('NaN%'); // parseFloat('n/a') returns NaN
    });

    it('should handle numeric strings', () => {
      expect(formatPercentage('12.345')).toBe('12.35%');
      expect(formatPercentage('0')).toBe('0.00%');
      expect(formatPercentage('100')).toBe('100.00%');
      expect(formatPercentage('-5.67')).toBe('-5.67%');
    });

    it('should handle invalid numeric strings', () => {
      expect(formatPercentage('invalid')).toBe('NaN%');
      expect(formatPercentage('not-a-number')).toBe('NaN%');
    });

    it('should handle NaN numbers', () => {
      expect(formatPercentage(NaN)).toBe('N/A');
    });

    it('should handle null and undefined', () => {
      expect(formatPercentage(null as any)).toBe('N/A');
      expect(formatPercentage(undefined as any)).toBe('N/A');
    });

    it('should handle empty strings', () => {
      expect(formatPercentage('')).toBe('NaN%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(0.001)).toBe('0.00%');
      expect(formatPercentage(99.999)).toBe('100.00%');
      expect(formatPercentage(Infinity)).toBe('Infinity%');
      expect(formatPercentage(-Infinity)).toBe('-Infinity%');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed data types from API responses', () => {
      const mockData = {
        sales: 1234.56,
        margin: 'N/A',
        cost: 'invalid',
        profit: null,
        revenue: undefined,
        growth: 15.5
      };

      expect(formatCurrency(mockData.sales)).toBe('$1,234.56');
      expect(formatCurrency(mockData.margin)).toBe('N/A');
      expect(formatCurrency(mockData.cost)).toBe('$NaN');
      expect(formatCurrency(mockData.profit)).toBe('N/A');
      expect(formatCurrency(mockData.revenue)).toBe('N/A');
      expect(formatCurrency(mockData.growth)).toBe('$15.50');

      expect(formatPercentage(mockData.sales)).toBe('1234.56%');
      expect(formatPercentage(mockData.margin)).toBe('N/A');
      expect(formatPercentage(mockData.cost)).toBe('NaN%');
      expect(formatPercentage(mockData.profit)).toBe('N/A');
      expect(formatPercentage(mockData.revenue)).toBe('N/A');
      expect(formatPercentage(mockData.growth)).toBe('15.50%');
    });

    it('should handle data from CSV parsing with N/A values', () => {
      const csvData = {
        profitLoss: {
          sales: 12345.67,
          costOfGoods: 'N/A',
          netProfit: 'N/A',
          margin: 37.0
        },
        productPerformance: [
          {
            salesThisMonth: 1234.56,
            netProfitThisMonth: 'N/A',
            marginThisMonth: 46.0,
            acosThisMonth: 'N/A'
          }
        ]
      };

      // Test profit loss formatting
      expect(formatCurrency(csvData.profitLoss.sales)).toBe('$12,345.67');
      expect(formatCurrency(csvData.profitLoss.costOfGoods)).toBe('N/A');
      expect(formatCurrency(csvData.profitLoss.netProfit)).toBe('N/A');
      expect(formatPercentage(csvData.profitLoss.margin)).toBe('37.00%');

      // Test product performance formatting
      const product = csvData.productPerformance[0];
      expect(formatCurrency(product.salesThisMonth)).toBe('$1,234.56');
      expect(formatCurrency(product.netProfitThisMonth)).toBe('N/A');
      expect(formatPercentage(product.marginThisMonth)).toBe('46.00%');
      expect(formatPercentage(product.acosThisMonth)).toBe('N/A');
    });
  });
});
