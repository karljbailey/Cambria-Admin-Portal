// CSV parsing utilities for Monthly Reports Dashboard

export interface RawProductPerformance {
  rawData: string[][]; // Raw table data as 2D array
  headers: string[]; // Column headers
}

export interface ParsedData {
  profitLoss: {
    sales: number | string;
    costOfGoods: number | string;
    taxes: number | string;
    fbaFees: number | string;
    referralFees: number | string;
    storageFees: number | string;
    adExpenses: number | string;
    refunds: number | string;
    expenses: number | string;
    netProfit: number | string;
    margin: number | string;
    roi: number | string;
  };
  productPerformance: Array<{
    asin: string;
    title: string;
    salesThisMonth: number | string;
    salesChange: string;
    netProfitThisMonth: number | string;
    netProfitChange: string;
    marginThisMonth: number | string;
    marginChange: string;
    unitsThisMonth: number | string;
    unitsChange: string;
    refundRateThisMonth: number | string;
    refundRateChange: string;
    adSpendThisMonth: number | string;
    adSpendChange: string;
    acosThisMonth: number | string;
    acosChange: string;
    tacosThisMonth: number | string;
    tacosChange: string;
    ctrThisMonth: number | string;
    ctrChange: string;
    cvrThisMonth: number | string;
    cvrChange: string;
  }>;
  // Add raw product performance data
  rawProductPerformance?: RawProductPerformance;
  payouts: {
    latest: number | string;
    previous: number | string;
    average: number | string;
  };
  amazonPerformance: {
    salesThisMonth: number | string;
    salesChange: string;
    netProfitThisMonth: number | string;
    netProfitChange: string;
    marginThisMonth: number | string;
    marginChange: string;
    unitsThisMonth: number | string;
    unitsChange: string;
    refundRateThisMonth: number | string;
    refundRateChange: string;
    acosThisMonth: number | string;
    acosChange: string;
    tacosThisMonth: number | string;
    tacosChange: string;
    ctrThisMonth: number | string;
    ctrChange: string;
  };
}

// Helper function to safely parse values - store raw values
function safeParseNumber(value: string): number | string {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'n/a') {
    return 'N/A';
  }
  
  // Return the raw value as a string, don't parse or modify it
  return value.trim();
}

// Helper function to create empty parsed data structure
export function createEmptyParsedData(): ParsedData {
  return {
    profitLoss: {
      sales: 'N/A', costOfGoods: 'N/A', taxes: 'N/A', fbaFees: 'N/A', referralFees: 'N/A',
      storageFees: 'N/A', adExpenses: 'N/A', refunds: 'N/A', expenses: 'N/A',
      netProfit: 'N/A', margin: 'N/A', roi: 'N/A'
    },
    productPerformance: [],
    payouts: { latest: 'N/A', previous: 'N/A', average: 'N/A' },
    amazonPerformance: {
      salesThisMonth: 'N/A', salesChange: '', netProfitThisMonth: 'N/A', netProfitChange: '',
      marginThisMonth: 'N/A', marginChange: '', unitsThisMonth: 'N/A', unitsChange: '',
      refundRateThisMonth: 'N/A', refundRateChange: '', acosThisMonth: 'N/A', acosChange: '',
      tacosThisMonth: 'N/A', tacosChange: '', ctrThisMonth: 'N/A', ctrChange: ''
    }
  };
}

// Helper function to parse a single CSV line with proper quote handling
export function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes) {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentCell += '"';
          i += 2; // Skip both quotes
          continue;
        } else {
          // End of quoted cell
          insideQuotes = false;
        }
      } else {
        // Start of quoted cell
        insideQuotes = true;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of cell
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
    
    i++;
  }
  
  // Add the last cell
  cells.push(currentCell.trim());
  
  return cells;
}

// Helper function to parse different sections
export function parseSections(sections: { [key: string]: string[][] }): ParsedData {
  const result: ParsedData = createEmptyParsedData();

  // Dynamic section mapping - handle various section names
  const sectionMappings = {
    profitLoss: ['profit & loss', 'profit and loss', 'p&l', 'financial summary'],
    productPerformance: ['per-product performance', 'product performance', 'product data', 'asin performance'],
    payouts: ['payouts', 'payout', 'earnings', 'revenue'],
    amazonPerformance: ['amazon performance', 'platform performance', 'marketplace performance']
  };

  // Parse Profit & Loss section
  const profitLossSection = findSectionByKeywords(sections, sectionMappings.profitLoss);
  if (profitLossSection) {
    console.log(`Processing Profit & Loss section with ${profitLossSection.length} rows`);
    for (const row of profitLossSection) {
      if (row.length >= 2) {
        const metric = row[0]?.toLowerCase().trim();
        const value = safeParseNumber(row[1] || '');
        
        // Dynamic metric mapping
        const metricMappings: { [key: string]: keyof typeof result.profitLoss } = {
          'sales': 'sales',
          'revenue': 'sales',
          'income': 'sales',
          'cost of goods': 'costOfGoods',
          'cogs': 'costOfGoods',
          'cost of goods sold': 'costOfGoods',
          'net profit': 'netProfit',
          'profit': 'netProfit',
          'net income': 'netProfit',
          'margin': 'margin',
          'profit margin': 'margin',
          'taxes': 'taxes',
          'tax': 'taxes',
          'fba fees': 'fbaFees',
          'fba': 'fbaFees',
          'referral fees': 'referralFees',
          'referral': 'referralFees',
          'storage fees': 'storageFees',
          'storage': 'storageFees',
          'ad expenses': 'adExpenses',
          'advertising': 'adExpenses',
          'ads': 'adExpenses',
          'refunds': 'refunds',
          'refund': 'refunds',
          'expenses': 'expenses',
          'expense': 'expenses',
          'roi': 'roi',
          'return on investment': 'roi'
        };

        const targetField = metricMappings[metric];
        if (targetField) {
          (result.profitLoss as any)[targetField] = value;
        }
      }
    }
  }

  // Check for raw product data stored during parsing
  if ((sections as any)['_rawProductData']) {
    const rawData = (sections as any)['_rawProductData'];
    result.rawProductPerformance = {
      headers: rawData.headers,
      rawData: rawData.rawData
    };
    console.log('Applied raw product performance data from inferred section');
  }

  // Parse Product Performance sections (handle multiple sections)
  const productPerformanceSections = findAllSectionsByKeywords(sections, sectionMappings.productPerformance);
  if (productPerformanceSections.length > 0) {
    console.log(`Processing ${productPerformanceSections.length} Product Performance sections`);
    
    for (const productPerformanceSection of productPerformanceSections) {
      console.log(`Processing Product Performance section with ${productPerformanceSection.length} rows`);
      
      // Find header row to dynamically map columns
      let headerRow: string[] = [];
      let dataRows: string[][] = [];
      
      for (const row of productPerformanceSection) {
        if (Array.isArray(row) && row.length > 0) {
          const firstCell = row[0]?.toLowerCase().trim();
          if (firstCell === 'asin' || firstCell === 'product' || firstCell === 'sku' || firstCell.includes('product id') || firstCell.includes('product name')) {
            headerRow = row.map(cell => cell.toLowerCase().trim());
            console.log('Found header row:', headerRow);
          } else {
            dataRows.push(row);
          }
        }
      }
      
      // If no explicit header found, use first row as header
      if (headerRow.length === 0 && productPerformanceSection.length > 0) {
        const firstRow = productPerformanceSection[0];
        if (Array.isArray(firstRow)) {
          headerRow = firstRow.map(cell => cell.toLowerCase().trim());
          dataRows = productPerformanceSection.slice(1).filter(row => Array.isArray(row)) as string[][];
          console.log('Using first row as header:', headerRow);
        }
      }
      
      // Store raw data for Product Performance
      if (productPerformanceSection.length > 0) {
        const rawHeaders = productPerformanceSection[0].map(cell => String(cell || '').trim());
        const rawData = productPerformanceSection.slice(1).map(row => 
          row.map(cell => String(cell || '').trim())
        );
        
        result.rawProductPerformance = {
          headers: rawHeaders,
          rawData: rawData
        };
        console.log('Stored raw product performance data:', {
          headers: rawHeaders,
          dataRows: rawData.length
        });
      }
    
    // Dynamic column mapping
    const columnMappings: { [key: string]: string } = {
      'asin': 'asin',
      'sku': 'asin',
      'product': 'asin',
      'product id': 'asin',
      'title': 'title',
      'product name': 'title',
      'name': 'title',
      'sales this month': 'salesThisMonth',
      'sales': 'salesThisMonth',
      'revenue': 'salesThisMonth',
      'sales change': 'salesChange',
      'net profit this month': 'netProfitThisMonth',
      'profit': 'netProfitThisMonth',
      'net profit': 'netProfitThisMonth',
      'net profit change': 'netProfitChange',
      'margin this month': 'marginThisMonth',
      'margin': 'marginThisMonth',
      'margin change': 'marginChange',
      'units this month': 'unitsThisMonth',
      'units': 'unitsThisMonth',
      'quantity': 'unitsThisMonth',
      'units change': 'unitsChange',
      'refund rate this month': 'refundRateThisMonth',
      'refund rate': 'refundRateThisMonth',
      'refund rate change': 'refundRateChange',
      'ad spend this month': 'adSpendThisMonth',
      'ad spend': 'adSpendThisMonth',
      'advertising': 'adSpendThisMonth',
      'ad spend change': 'adSpendChange',
      'acos this month': 'acosThisMonth',
      'acos': 'acosThisMonth',
      'acos change': 'acosChange',
      'tacos this month': 'tacosThisMonth',
      'tacos': 'tacosThisMonth',
      'tacos change': 'tacosChange',
      'ctr this month': 'ctrThisMonth',
      'ctr': 'ctrThisMonth',
      'ctr change': 'ctrChange',
      'cvr this month': 'cvrThisMonth',
      'cvr': 'cvrThisMonth',
      'cvr change': 'cvrChange'
    };
    
    // Process data rows
    for (const row of dataRows) {
      if (row.length >= 2) {
        const product: any = {
          asin: '',
          title: '',
          salesThisMonth: 'N/A',
          salesChange: '',
          netProfitThisMonth: 'N/A',
          netProfitChange: '',
          marginThisMonth: 'N/A',
          marginChange: '',
          unitsThisMonth: 'N/A',
          unitsChange: '',
          refundRateThisMonth: 'N/A',
          refundRateChange: '',
          adSpendThisMonth: 'N/A',
          adSpendChange: '',
          acosThisMonth: 'N/A',
          acosChange: '',
          tacosThisMonth: 'N/A',
          tacosChange: '',
          ctrThisMonth: 'N/A',
          ctrChange: '',
          cvrThisMonth: 'N/A',
          cvrChange: ''
        };
        
        // Map columns based on header
        for (let i = 0; i < Math.min(headerRow.length, row.length); i++) {
          const header = headerRow[i];
          const value = row[i]?.trim() || '';
          const targetField = columnMappings[header];
          
          if (targetField) {
            if (targetField.includes('ThisMonth')) {
              product[targetField] = safeParseNumber(value);
            } else if (targetField.includes('Change')) {
              product[targetField] = value;
            } else if (targetField === 'asin' || targetField === 'title') {
              product[targetField] = value;
            }
          }
        }
        
        if (product.asin && product.title) {
          result.productPerformance.push(product);
        }
      }
    }
    console.log(`Total products parsed: ${result.productPerformance.length}`);
  }
  } else {
    console.log('No product section found or section is empty');
  }

  // Parse Payouts sections (handle multiple sections)
  const payoutsSections = findAllSectionsByKeywords(sections, sectionMappings.payouts);
  if (payoutsSections.length > 0) {
    console.log(`Processing ${payoutsSections.length} Payouts sections`);
    
    for (const payoutsSection of payoutsSections) {
      console.log(`Processing Payouts section with ${payoutsSection.length} rows`);
      for (const row of payoutsSection) {
        if (row.length >= 2) {
          const metric = row[0]?.toLowerCase().trim();
          const rawValue = row[1] || '';
          
          // Dynamic payout metric mapping
          const payoutMappings: { [key: string]: keyof typeof result.payouts } = {
            'latest': 'latest',
            'current': 'latest',
            'this month': 'latest',
            'previous': 'previous',
            'last month': 'previous',
            'average': 'average',
            'avg': 'average',
            'mean': 'average'
          };
          
          const targetField = payoutMappings[metric];
          if (targetField) {
            const numericValue = safeParseNumber(rawValue);
            (result.payouts as any)[targetField] = numericValue;
          }
        }
      }
    }
  }

  // Parse Amazon Performance sections (handle multiple sections)
  const amazonSections = findAllSectionsByKeywords(sections, sectionMappings.amazonPerformance);
  if (amazonSections.length > 0) {
    console.log(`Processing ${amazonSections.length} Amazon Performance sections`);
    
    for (const amazonSection of amazonSections) {
      console.log(`Processing Amazon Performance section with ${amazonSection.length} rows`);
      for (const row of amazonSection) {
        if (row.length >= 2) {
          const metric = row[0]?.toLowerCase().trim();
          const value = row[1] || '';
          
          // Dynamic Amazon performance metric mapping
          const amazonMappings: { [key: string]: keyof typeof result.amazonPerformance } = {
            'sales this month': 'salesThisMonth',
            'sales': 'salesThisMonth',
            'revenue this month': 'salesThisMonth',
            'revenue': 'salesThisMonth',
            'sales change': 'salesChange',
            'net profit this month': 'netProfitThisMonth',
            'net profit': 'netProfitThisMonth',
            'profit this month': 'netProfitThisMonth',
            'profit': 'netProfitThisMonth',
            'net profit change': 'netProfitChange',
            'profit change': 'netProfitChange',
            'margin this month': 'marginThisMonth',
            'margin': 'marginThisMonth',
            'margin change': 'marginChange',
            'units this month': 'unitsThisMonth',
            'units': 'unitsThisMonth',
            'quantity this month': 'unitsThisMonth',
            'units change': 'unitsChange',
            'refund rate this month': 'refundRateThisMonth',
            'refund rate': 'refundRateThisMonth',
            'refund rate change': 'refundRateChange',
            'acos this month': 'acosThisMonth',
            'acos': 'acosThisMonth',
            'acos change': 'acosChange',
            'tacos this month': 'tacosThisMonth',
            'tacos': 'tacosThisMonth',
            'tacos change': 'tacosChange',
            'ctr this month': 'ctrThisMonth',
            'ctr': 'ctrThisMonth',
            'ctr change': 'ctrChange'
          };
          
          const targetField = amazonMappings[metric];
          if (targetField) {
            if (targetField.includes('ThisMonth')) {
              const numericValue = safeParseNumber(value);
              (result.amazonPerformance as any)[targetField] = numericValue;
            } else if (targetField.includes('Change')) {
              (result.amazonPerformance as any)[targetField] = value;
            }
          }
        }
      }
    }
  }

  return result;
}

// Helper function to find sections by keywords
function findSectionByKeywords(sections: { [key: string]: string[][] }, keywords: string[]): string[][] | undefined {
  for (const [sectionName, sectionData] of Object.entries(sections)) {
    const lowerSectionName = sectionName.toLowerCase();
    if (keywords.some(keyword => lowerSectionName.includes(keyword))) {
      console.log(`Found section "${sectionName}" matching keywords: ${keywords.join(', ')}`);
      return sectionData;
    }
  }
  return undefined;
}

// Helper function to find all sections by keywords
function findAllSectionsByKeywords(sections: { [key: string]: string[][] }, keywords: string[]): string[][][] {
  const matchingSections: string[][][] = [];
  for (const [sectionName, sectionData] of Object.entries(sections)) {
    const lowerSectionName = sectionName.toLowerCase();
    if (keywords.some(keyword => lowerSectionName.includes(keyword))) {
      console.log(`Found section "${sectionName}" matching keywords: ${keywords.join(', ')}`);
      matchingSections.push(sectionData);
    }
  }
  return matchingSections;
}

// Helper function to parse CSV content
export function parseCSV(csvContent: string): ParsedData {
  try {
    // Input validation
    if (csvContent === null || csvContent === undefined || typeof csvContent !== 'string') {
      console.error('Invalid CSV content: must be a non-empty string');
      throw new Error('Invalid CSV content: must be a non-empty string');
    }

    // Handle empty content gracefully
    if (csvContent.trim() === '') {
      console.log('Parsing 0 lines of CSV content');
      return createEmptyParsedData();
    }

    // Normalize line endings
    const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split into lines but preserve quoted fields that span multiple lines
    const lines: string[] = [];
    let currentLine = '';
    let insideQuotes = false;
    
    for (let i = 0; i < normalizedContent.length; i++) {
      const char = normalizedContent[i];
      
      if (char === '"') {
        if (insideQuotes) {
          // Check for escaped quote
          if (i + 1 < normalizedContent.length && normalizedContent[i + 1] === '"') {
            currentLine += '"';
            i++; // Skip the next quote
          } else {
            // End of quoted field
            insideQuotes = false;
          }
        } else {
          // Start of quoted field
          insideQuotes = true;
        }
        currentLine += char;
      } else if (char === '\n' && !insideQuotes) {
        // End of line (only if not inside quotes)
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    
    // Add the last line if it has content
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    const sections: { [key: string]: string[][] } = {};
    let currentSection = '';
    let currentData: string[][] = [];

    console.log(`Parsing ${lines.length} lines of CSV content`);
    console.log('First few lines:', lines.slice(0, 5));

    // Enhanced CSV parsing with better quote handling and dynamic section detection
    const sectionKeywords = [
      'profit & loss', 'profit and loss', 'p&l', 'financial summary',
      'per-product performance', 'product performance', 'product data', 'asin performance',
      'payouts', 'payout', 'earnings', 'revenue',
      'amazon performance', 'platform performance', 'marketplace performance'
    ];
    
    for (const line of lines) {
      // Check for section headers (case insensitive) with dynamic keyword matching
      const lowerLine = line.toLowerCase();
      const isSectionHeader = sectionKeywords.some(keyword => lowerLine.includes(keyword));
      
      // Only treat as section header if it's a single cell or doesn't contain commas
      const hasCommas = line.includes(',');
      const isPureSectionHeader = isSectionHeader && !hasCommas;
      
      if (isPureSectionHeader) {
        if (currentSection && currentData.length > 0) {
          sections[currentSection] = currentData;
          console.log(`Found section: ${currentSection} with ${currentData.length} rows`);
        }
        currentSection = line.trim();
        currentData = [];
        console.log(`Starting new section: ${currentSection}`);
      } else if (line.trim()) {
        // Enhanced CSV parsing with proper quote handling
        const cells = parseCSVLine(line);
        if (cells.length > 0) {
          currentData.push(cells);
        }
      }
    }
    
    // Add the last section if it has data
    if (currentSection && currentData.length > 0) {
      sections[currentSection] = currentData;
      console.log(`Found section: ${currentSection} with ${currentData.length} rows`);
    }
    
    // Also check for section headers that might be in individual cells
    console.log('Looking for section headers in individual cells...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const cells = parseCSVLine(line);
        for (const cell of cells) {
          const lowerCell = cell.toLowerCase();
          if (lowerCell.includes('profit & loss') || lowerCell.includes('pre-product performance') || 
              lowerCell.includes('per-product performance') || lowerCell.includes('payouts') || 
              lowerCell.includes('amazon performance')) {
            console.log(`Found section header in cell: "${cell}" at line ${i + 1}`);
          }
        }
      }
    }

    console.log('Found sections:', Object.keys(sections));
    
    // If no sections found, try to detect by looking for common headers
    if (Object.keys(sections).length === 0 && lines.length > 0) {
      console.log('No sections detected, trying to infer structure from headers...');
      const headers = parseCSVLine(lines[0]).map(cell => cell.trim().toLowerCase());
      console.log('Headers found:', headers);
      
      // If we see product-related headers, treat the whole file as product data
      if (headers.some(h => h.includes('asin') || h.includes('product') || h.includes('title'))) {
        sections['Per-Product Performance'] = lines.map(line => parseCSVLine(line));
        console.log('Inferred product performance section from headers');
      }
      
      // Also check for the specific format you mentioned (ASIN, Title, Sales_LastMonth, etc.)
      const hasAsinHeader = headers.some(h => h.toLowerCase().includes('asin'));
      const hasTitleHeader = headers.some(h => h.toLowerCase().includes('title'));
      const hasSalesHeader = headers.some(h => h.toLowerCase().includes('sales'));
      
      if (hasAsinHeader && hasTitleHeader && hasSalesHeader) {
        sections['Product Performance'] = lines.map(line => parseCSVLine(line));
        console.log('Inferred product performance section from ASIN/Title/Sales headers');
      }
      
      // If we have any sections now, also store raw data for the first product section
      if (Object.keys(sections).length > 0) {
        const firstProductSection = Object.values(sections)[0];
        if (firstProductSection && firstProductSection.length > 0) {
          const rawHeaders = firstProductSection[0].map(cell => String(cell || '').trim());
          const rawData = firstProductSection.slice(1).map(row => 
            row.map(cell => String(cell || '').trim())
          );
          
          // Store raw data in a special key for later processing
          (sections as any)['_rawProductData'] = {
            headers: rawHeaders,
            rawData: rawData
          };
          console.log('Stored raw product performance data from inferred section:', {
            headers: rawHeaders,
            dataRows: rawData.length
          });
        }
      }
    }
    
    return parseSections(sections);
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV content');
  }
}
