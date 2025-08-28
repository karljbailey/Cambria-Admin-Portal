// Test script to verify raw data parsing
const { parseCSV } = require('./lib/csv-parser.ts');

// Example data from user with multi-line quoted title
const exampleCSV = `ASIN,Title,Sales_LastMonth,Sales_ThisMonth,Sales_Change
B005F6CM2I,"Ergo Ceramic Ionic Round Brush for Blow Out - Salon Quality Hair Brushes for Women - Roller Brush for Blow Drying
Wet and Dry Hair Styling
Volumizing Hair Care - ER53: 2"",36472.37,36472.37,0.00%`;

console.log('Testing CSV parser with example data...');
console.log('Input CSV:');
console.log(exampleCSV);
console.log('\n---\n');

try {
  const result = parseCSV(exampleCSV);
  console.log('Parsed result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.rawProductPerformance) {
    console.log('\nRaw Product Performance Data:');
    console.log('Headers:', result.rawProductPerformance.headers);
    console.log('Data rows:', result.rawProductPerformance.rawData.length);
    console.log('First row:', result.rawProductPerformance.rawData[0]);
    
    // Check if the title is properly preserved
    if (result.rawProductPerformance.rawData.length > 0) {
      const firstRow = result.rawProductPerformance.rawData[0];
      const titleIndex = result.rawProductPerformance.headers.findIndex(h => h.toLowerCase().includes('title'));
      if (titleIndex >= 0 && firstRow[titleIndex]) {
        console.log('\nTitle field preserved correctly:', firstRow[titleIndex]);
      }
    }
  } else {
    console.log('\nNo raw product performance data found');
  }
} catch (error) {
  console.error('Error parsing CSV:', error);
}
