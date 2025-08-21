import { parseCSVLine } from '../../lib/csv-parser';

describe('CSV Line Parser Unit Tests', () => {
  describe('parseCSVLine Function', () => {
    it('should parse simple CSV line correctly', () => {
      const line = 'ASIN,Title,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title', 'Sales', 'Profit']);
    });

    it('should handle quoted cells correctly', () => {
      const line = '"ASIN","Title","Sales","Profit"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title', 'Sales', 'Profit']);
    });

    it('should handle mixed quoted and unquoted cells', () => {
      const line = 'ASIN,"Title with spaces",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with spaces', 'Sales', 'Profit']);
    });

    it('should handle cells with commas inside quotes', () => {
      const line = 'ASIN,"Title, with comma",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title, with comma', 'Sales', 'Profit']);
    });

    it('should handle escaped quotes correctly', () => {
      const line = 'ASIN,"Title with ""quotes""",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with "quotes"', 'Sales', 'Profit']);
    });

    it('should handle empty cells', () => {
      const line = 'ASIN,,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '', 'Sales', 'Profit']);
    });

    it('should handle empty quoted cells', () => {
      const line = 'ASIN,"",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '', 'Sales', 'Profit']);
    });

    it('should handle cells with only whitespace', () => {
      const line = 'ASIN,   ,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '', 'Sales', 'Profit']);
    });

    it('should handle quoted cells with whitespace', () => {
      const line = 'ASIN,"   ",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '', 'Sales', 'Profit']);
    });

    it('should handle cells with special characters', () => {
      const line = 'ASIN,"Title with $, %, & symbols",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with $, %, & symbols', 'Sales', 'Profit']);
    });

    it('should handle cells with newlines in quotes', () => {
      const line = 'ASIN,"Title with\nnewline",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with\nnewline', 'Sales', 'Profit']);
    });

    it('should handle cells with tabs in quotes', () => {
      const line = 'ASIN,"Title with\ttab",Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with\ttab', 'Sales', 'Profit']);
    });

    it('should handle malformed quotes gracefully', () => {
      const line = 'ASIN,"Title with unclosed quote,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with unclosed quote,Sales,Profit']);
    });

    it('should handle multiple consecutive commas', () => {
      const line = 'ASIN,,,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '', '', 'Sales', 'Profit']);
    });

    it('should handle line ending with comma', () => {
      const line = 'ASIN,Title,Sales,Profit,';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title', 'Sales', 'Profit', '']);
    });

    it('should handle line starting with comma', () => {
      const line = ',ASIN,Title,Sales,Profit';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['', 'ASIN', 'Title', 'Sales', 'Profit']);
    });

    it('should handle complex real-world example', () => {
      const line = 'B123,"Test Product, with comma and ""quotes""","$100.00","+10.5%","$50.00","+5.2%"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual([
        'B123',
        'Test Product, with comma and "quotes"',
        '$100.00',
        '+10.5%',
        '$50.00',
        '+5.2%'
      ]);
    });

    it('should handle empty line', () => {
      const line = '';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['']);
    });

    it('should handle line with only whitespace', () => {
      const line = '   ';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['']);
    });

    it('should handle single cell', () => {
      const line = 'ASIN';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN']);
    });

    it('should handle single quoted cell', () => {
      const line = '"ASIN"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN']);
    });

    it('should handle cells with currency symbols and commas', () => {
      const line = 'ASIN,"$1,234.56","€1,000.00","£500.00"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '$1,234.56', '€1,000.00', '£500.00']);
    });

    it('should handle cells with percentages', () => {
      const line = 'ASIN,"+15.2%","-5.8%","0.0%"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '+15.2%', '-5.8%', '0.0%']);
    });

    it('should handle cells with Unicode characters', () => {
      const line = 'ASIN,"🚀 Product","€100.00","Test with émojis"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '🚀 Product', '€100.00', 'Test with émojis']);
    });

    it('should handle cells with escaped quotes at beginning and end', () => {
      const line = 'ASIN,"""Quoted Title""","Sales","Profit"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', '"Quoted Title"', 'Sales', 'Profit']);
    });

    it('should handle cells with multiple escaped quotes', () => {
      const line = 'ASIN,"Title with ""quotes"" and ""more quotes""","Sales","Profit"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with "quotes" and "more quotes"', 'Sales', 'Profit']);
    });

    it('should handle cells with mixed quote styles', () => {
      const line = 'ASIN,"Title with ""quotes"" and \'single quotes\'","Sales","Profit"';
      const result = parseCSVLine(line);
      
      expect(result).toEqual(['ASIN', 'Title with "quotes" and \'single quotes\'', 'Sales', 'Profit']);
    });
  });
});
