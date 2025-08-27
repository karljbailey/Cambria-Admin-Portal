import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { ParsedData, parseCSV, createEmptyParsedData } from '../../../../lib/csv-parser';
import { usersService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

// Helper function to check if user has access to a client
async function checkClientAccess(userId: string, clientCode: string): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured, denying access');
    return false;
  }

  try {
    const user = await usersService.getById(userId);
    if (!user) {
      console.log(`User ${userId} not found, denying access`);
      return false;
    }

    // Admin users have access to all clients
    if (user.role === 'admin') {
      console.log(`User ${userId} is admin, granting access to client ${clientCode}`);
      return true;
    }

    // Check if user has permission for this specific client
    const userPermissions = user.clientPermissions || [];
    const hasAccess = userPermissions.some(permission => 
      permission.clientCode.toUpperCase() === clientCode.toUpperCase()
    );

    console.log(`User ${userId} access check for client ${clientCode}: ${hasAccess}`);
    return hasAccess;
  } catch (error) {
    console.error('Error checking client access:', error);
    return false;
  }
}

// Helper function to detect if content is actually Excel data
function isExcelContent(content: string | Buffer): boolean {
  if (Buffer.isBuffer(content)) {
    // Check for Excel file signatures
    const header = content.slice(0, 8);
    // Excel files start with PK (ZIP signature)
    if (header[0] === 0x50 && header[1] === 0x4B) {
      return true;
    }
  } else if (typeof content === 'string') {
    // Check for Excel XML content or binary indicators
    if (content.includes('PK\x03\x04') || // ZIP signature
        content.includes('xl/') || // Excel internal structure
        content.includes('workbook.xml') || // Excel workbook
        content.includes('worksheets/') || // Excel worksheets
        content.includes('drawings/')) { // Excel drawings
      return true;
    }
  }
  return false;
}

// Helper function to parse Excel content
function parseExcel(excelBuffer: Buffer): ParsedData {
  // Input validation
  if (!excelBuffer || !Buffer.isBuffer(excelBuffer)) {
    throw new Error('Invalid input: excelBuffer must be a valid Buffer');
  }

  if (excelBuffer.length === 0) {
    throw new Error('Invalid input: excelBuffer is empty');
  }

  try {
    console.log('=== EXCEL FILE PARSING STARTED ===');
    console.log('Excel buffer size:', excelBuffer.length);
    
    // Load workbook from buffer with error handling
    let workbook;
    try {
      console.log('Attempting to read Excel buffer with XLSX...');
      workbook = XLSX.read(excelBuffer, { 
        type: 'buffer', 
        cellText: false, 
        cellDates: true,
        cellNF: false,
        cellStyles: false
      });
      console.log('XLSX.read completed successfully');
    } catch (xlsxError) {
      console.error('XLSX.read failed:', xlsxError);
      
      // Try alternative reading methods
      try {
        console.log('Attempting alternative XLSX reading method...');
        workbook = XLSX.read(excelBuffer, { 
          type: 'buffer', 
          cellText: true, 
          cellDates: false,
          cellNF: false,
          cellStyles: false
        });
        console.log('Alternative XLSX.read method succeeded');
      } catch (alternativeError) {
        console.error('Alternative XLSX.read also failed:', alternativeError);
        throw new Error(`Failed to read Excel file: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown XLSX error'}`);
      }
    }

    // Validate workbook structure
    if (!workbook || typeof workbook !== 'object') {
      throw new Error('Invalid workbook structure returned from XLSX.read');
    }

    if (!workbook.SheetNames || !Array.isArray(workbook.SheetNames)) {
      throw new Error('Workbook does not contain valid SheetNames array');
    }

    if (!workbook.Sheets || typeof workbook.Sheets !== 'object') {
      throw new Error('Workbook does not contain valid Sheets object');
    }
    
    // Get all tab names (these are the actual tabs in the Excel file)
    const tabNames = workbook.SheetNames;
    console.log('Available tabs in Excel file:', tabNames);
    console.log('Total tabs found:', tabNames.length);
    
    if (tabNames.length === 0) {
      throw new Error('No worksheets found in Excel file');
    }
    
    // Initialize result structure
    const result: ParsedData = createEmptyParsedData();
    
    // Process each tab in the Excel file
    for (const tabName of tabNames) {
      try {
        console.log(`\n--- Processing tab: "${tabName}" ---`);
        
        // Get the worksheet for this tab
        const worksheet = workbook.Sheets[tabName];
        
        if (!worksheet) {
          console.log('Tab worksheet is null or undefined, skipping');
          continue;
        }
        
        // Check if tab has data
        if (!worksheet['!ref']) {
          console.log('Tab has no data range, skipping');
          continue;
        }
        
        console.log('Tab data range:', worksheet['!ref']);
        
        // Extract data with robust error handling
        const tabData = extractWorksheetData(worksheet, tabName);
        
        if (!tabData || tabData.length === 0) {
          console.log('No data extracted from tab, skipping');
          continue;
        }
        
        console.log(`Final data: ${tabData.length} rows`);
        console.log('First 3 rows of tab data:', tabData.slice(0, 3));
        
        // Process based on tab name or content
        processTabData(tabName, tabData, result);
        
      } catch (tabError) {
        console.error(`Error processing tab "${tabName}":`, tabError);
        // Continue processing other tabs instead of failing completely
        continue;
      }
    }
    
    console.log('=== PARSING COMPLETE ===');
    console.log('Products found:', result.productPerformance.length);
    console.log('Profit/Loss data:', result.profitLoss);
    console.log('Payouts data:', result.payouts);
    console.log('Amazon Performance data:', result.amazonPerformance);
    
    return result;
  } catch (error) {
    console.error('Error parsing Excel:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during Excel parsing';
    throw new Error(`Failed to parse Excel content: ${errorMessage}`);
  }
}



// Helper function to extract data from worksheet with multiple methods
function extractWorksheetData(worksheet: unknown, tabName: string): unknown[][] {
  // Input validation
  if (!worksheet || typeof worksheet !== 'object') {
    console.error(`Invalid worksheet provided for tab "${tabName}"`);
    return [];
  }

  if (!tabName || typeof tabName !== 'string') {
    console.error('Invalid tab name provided');
    return [];
  }

  try {
    console.log(`Extracting data from worksheet "${tabName}"...`);
    
    // Method 1: JSON with headers (most reliable for structured data)
    let tabData: unknown[][] = [];
    let method1Success = false;
    try {
      tabData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      }) as unknown[][];
      method1Success = true;
      console.log(`Method 1 - JSON with headers: ${tabData.length} rows`);
    } catch (method1Error) {
      console.error(`Method 1 failed for tab "${tabName}":`, method1Error);
    }
    
    // Method 2: Raw CSV (fallback for complex formatting)
    let csvData: string = '';
    let method2Success = false;
    try {
      csvData = XLSX.utils.sheet_to_csv(worksheet, {
        FS: ',',
        RS: '\n',
        forceQuotes: false
      });
      method2Success = true;
      console.log(`Method 2 - CSV length: ${csvData.length} characters`);
    } catch (method2Error) {
      console.error(`Method 2 failed for tab "${tabName}":`, method2Error);
    }
    
    // Method 3: JSON without headers (for object-based data)
    let rawData: unknown[] = [];
    let method3Success = false;
    try {
      rawData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      }) as unknown[];
      method3Success = true;
      console.log(`Method 3 - Raw JSON: ${rawData.length} objects`);
    } catch (method3Error) {
      console.error(`Method 3 failed for tab "${tabName}":`, method3Error);
    }
    
    // Validate that at least one method succeeded
    if (!method1Success && !method2Success && !method3Success) {
      console.error(`All extraction methods failed for tab "${tabName}"`);
      return [];
    }
    
    // Choose the best extraction method with enhanced logic
    let finalData: unknown[][] = tabData;
    let methodUsed = 'JSON with headers';
    
    // Enhanced CSV selection logic
    if (method2Success && csvData.length > 0) {
      const csvContentRatio = csvData.length / Math.max(tabData.length, 1);
      const hasSignificantContent = csvContentRatio > 8; // More conservative threshold
      const hasValidCSVStructure = csvData.includes(',') && csvData.includes('\n');
      
      if (hasSignificantContent && hasValidCSVStructure) {
        console.log(`Using CSV data (content ratio: ${csvContentRatio.toFixed(2)})`);
        try {
          const csvRows = csvData.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
              // Enhanced CSV parsing with proper quote handling
              const cells = line.split(',').map(cell => {
                const trimmed = cell.trim();
                // Remove surrounding quotes if they exist
                return trimmed.replace(/^"(.*)"$/, '$1');
              });
              return cells;
            });
          
          if (csvRows.length > 0) {
            finalData = csvRows;
            methodUsed = 'CSV';
          }
        } catch (csvParseError) {
          console.error(`Failed to parse CSV data for tab "${tabName}":`, csvParseError);
        }
      }
    } 
    // Enhanced JSON object selection logic
    else if (method3Success && rawData.length > 0 && rawData.length > tabData.length) {
      console.log(`Using raw JSON data (${rawData.length} objects vs ${tabData.length} rows)`);
      try {
        // Ensure all objects have consistent keys
        const firstObject = rawData[0];
        if (firstObject && typeof firstObject === 'object') {
          const keys = Object.keys(firstObject);
          if (keys.length > 0) {
            // Convert objects to arrays, maintaining key order
            const convertedData = [keys, ...rawData.map(obj => {
              return keys.map(key => {
                // Type guard to ensure obj is an object with string keys
                if (obj && typeof obj === 'object' && key in obj) {
                  const value = (obj as Record<string, unknown>)[key];
                  // Handle various data types consistently
                  if (value === null || value === undefined) return '';
                  if (typeof value === 'object') return JSON.stringify(value);
                  return String(value);
                }
                return '';
              });
            })];
            finalData = convertedData;
            methodUsed = 'Raw JSON';
          }
        }
      } catch (jsonParseError) {
        console.error(`Failed to parse raw JSON data for tab "${tabName}":`, jsonParseError);
      }
    }
    
    // Validate final data structure
    if (!Array.isArray(finalData)) {
      console.error(`Final data is not an array for tab "${tabName}", returning empty array`);
      return [];
    }
    
    // Enhanced empty row filtering
    finalData = finalData.filter(row => {
      if (!Array.isArray(row)) return false;
      
      // Check if row has any meaningful content
      return row.some(cell => {
        if (cell === null || cell === undefined) return false;
        const stringValue = String(cell).trim();
        return stringValue.length > 0 && stringValue !== 'undefined' && stringValue !== 'null';
      });
    });
    
    console.log(`Successfully extracted ${finalData.length} rows from tab "${tabName}" using ${methodUsed}`);
    return finalData;
    
  } catch (error) {
    console.error(`Unexpected error extracting data from worksheet "${tabName}":`, error);
    return [];
  }
}

// Helper function to process tab data based on name and content
function processTabData(tabName: string, tabData: unknown[][], result: ParsedData): void {
  if (!tabName || !Array.isArray(tabData) || tabData.length === 0) {
    console.log('Invalid input for processTabData, skipping');
    return;
  }

  try {
    const lowerTabName = tabName.toLowerCase().trim();
    
    // Process based on tab name patterns
    if (lowerTabName.includes('profit') || lowerTabName.includes('loss')) {
      console.log('Processing Profit & Loss data from tab');
      parseProfitLossData(tabData, result);
    } else if (lowerTabName.includes('product') || lowerTabName.includes('asin')) {
      console.log('Processing Product Performance data from tab');
      parseProductPerformanceData(tabData, result);
    } else if (lowerTabName.includes('payout')) {
      console.log('Processing Payouts data from tab');
      parsePayoutsData(tabData, result);
    } else if (lowerTabName.includes('amazon') || lowerTabName.includes('performance')) {
      console.log('Processing Amazon Performance data from tab');
      parseAmazonPerformanceData(tabData, result);
    } else {
      // Try to detect content type from headers
      console.log('Trying to detect content type from tab headers');
      detectAndParseContent(tabData, result);
    }
  } catch (error) {
    console.error(`Error processing tab data for "${tabName}":`, error);
    // Don't throw - continue processing other tabs
  }
}

// Helper function to parse Profit & Loss data
function parseProfitLossData(sheetData: unknown[][], result: ParsedData): void {
  if (!Array.isArray(sheetData) || !result || typeof result !== 'object') {
    console.error('Invalid input for parseProfitLossData');
    return;
  }

  console.log('Parsing Profit & Loss data...');
  
  try {
    for (const row of sheetData) {
      if (!Array.isArray(row) || row.length < 2) {
        continue;
      }

      const metric = String(row[0] || '').toLowerCase().trim();
      const rawValue = String(row[1] || '0').trim();
      
      console.log(`Processing metric: "${metric}" = "${rawValue}"`);
      
      // More comprehensive metric matching
      switch (metric) {
        case 'sales': 
        case 'total sales':
        case 'gross sales':
        case 'revenue':
        case 'total revenue':
          result.profitLoss.sales = rawValue; // Store raw value
          break;
        case 'cost of goods': 
        case 'cogs':
        case 'cost of goods sold':
        case 'cost of sales':
          result.profitLoss.costOfGoods = rawValue; // Store raw value
          break;
        case 'taxes': 
        case 'tax':
        case 'income tax':
          result.profitLoss.taxes = rawValue; // Store raw value
          break;
        case 'fba fees': 
        case 'fba':
        case 'fulfillment fees':
        case 'fulfillment by amazon fees':
          result.profitLoss.fbaFees = rawValue; // Store raw value
          break;
        case 'referral fees': 
        case 'referral':
        case 'amazon referral fees':
          result.profitLoss.referralFees = rawValue; // Store raw value
          break;
        case 'storage fees': 
        case 'storage':
        case 'warehouse fees':
          result.profitLoss.storageFees = rawValue; // Store raw value
          break;
        case 'ad expenses': 
        case 'advertising':
        case 'ad spend':
        case 'advertising expenses':
        case 'marketing':
          result.profitLoss.adExpenses = rawValue; // Store raw value
          break;
        case 'refunds': 
        case 'refund':
        case 'returns':
          result.profitLoss.refunds = rawValue; // Store raw value
          break;
        case 'expenses': 
        case 'total expenses':
        case 'operating expenses':
          result.profitLoss.expenses = rawValue; // Store raw value
          break;
        case 'net profit': 
        case 'profit':
        case 'net income':
        case 'profit after tax':
          result.profitLoss.netProfit = rawValue; // Store raw value
          break;
        case 'margin': 
        case 'profit margin':
        case 'net margin':
          result.profitLoss.margin = rawValue; // Store raw value
          break;
        case 'roi': 
        case 'return on investment':
        case 'return on investment %':
          result.profitLoss.roi = rawValue; // Store raw value
          break;
        default:
          // Log unrecognized metrics for debugging
          if (metric.length > 0) {
            console.log(`Unrecognized profit/loss metric: "${metric}"`);
          }
          break;
      }
    }
  } catch (error) {
    console.error('Error parsing Profit & Loss data:', error);
    // Don't throw - continue with partial data
  }
}

// Helper function to parse Product Performance data
function parseProductPerformanceData(sheetData: unknown[][], result: ParsedData) {
  console.log('Parsing Product Performance data...');
  
  if (sheetData.length < 2) {
    console.log('Not enough rows for product data');
    return;
  }
  
  const headers = sheetData[0].map((h: unknown) => String(h || '').toLowerCase());
  console.log('Product headers:', headers);
  
  // Find column indices
  const asinIndex = headers.findIndex(h => h.includes('asin'));
  const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('product') || h.includes('name'));
  const salesIndex = headers.findIndex(h => h.includes('sales') && h.includes('month'));
  const salesChangeIndex = headers.findIndex(h => h.includes('sales') && h.includes('change'));
  const profitIndex = headers.findIndex(h => h.includes('profit') && h.includes('month'));
  const profitChangeIndex = headers.findIndex(h => h.includes('profit') && h.includes('change'));
  const marginIndex = headers.findIndex(h => h.includes('margin') && h.includes('month'));
  const marginChangeIndex = headers.findIndex(h => h.includes('margin') && h.includes('change'));
  const unitsIndex = headers.findIndex(h => h.includes('unit') && h.includes('month'));
  const unitsChangeIndex = headers.findIndex(h => h.includes('unit') && h.includes('change'));
  const refundIndex = headers.findIndex(h => h.includes('refund') && h.includes('month'));
  const refundChangeIndex = headers.findIndex(h => h.includes('refund') && h.includes('change'));
  const adSpendIndex = headers.findIndex(h => h.includes('ad') && h.includes('spend') && h.includes('month'));
  const adSpendChangeIndex = headers.findIndex(h => h.includes('ad') && h.includes('spend') && h.includes('change'));
  const acosIndex = headers.findIndex(h => h.includes('acos') && h.includes('month'));
  const acosChangeIndex = headers.findIndex(h => h.includes('acos') && h.includes('change'));
  const tacosIndex = headers.findIndex(h => h.includes('tacos') && h.includes('month'));
  const tacosChangeIndex = headers.findIndex(h => h.includes('tacos') && h.includes('change'));
  const ctrIndex = headers.findIndex(h => h.includes('ctr') && h.includes('month'));
  const ctrChangeIndex = headers.findIndex(h => h.includes('ctr') && h.includes('change'));
  const cvrIndex = headers.findIndex(h => h.includes('cvr') && h.includes('month'));
  const cvrChangeIndex = headers.findIndex(h => h.includes('cvr') && h.includes('change'));
  
  console.log('Column indices found:', {
    asinIndex, titleIndex, salesIndex, profitIndex, marginIndex, unitsIndex
  });
  
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (row.length === 0 || !row[asinIndex]) continue;
    
    const product = {
      asin: String(row[asinIndex] || ''),
      title: String(row[titleIndex] || ''),
      salesThisMonth: String(row[salesIndex] || '0'),
      salesChange: String(row[salesChangeIndex] || ''),
      netProfitThisMonth: String(row[profitIndex] || '0'),
      netProfitChange: String(row[profitChangeIndex] || ''),
      marginThisMonth: String(row[marginIndex] || '0'),
      marginChange: String(row[marginChangeIndex] || ''),
      unitsThisMonth: String(row[unitsIndex] || '0'),
      unitsChange: String(row[unitsChangeIndex] || ''),
      refundRateThisMonth: String(row[refundIndex] || '0'),
      refundRateChange: String(row[refundChangeIndex] || ''),
      adSpendThisMonth: String(row[adSpendIndex] || '0'),
      adSpendChange: String(row[adSpendChangeIndex] || ''),
      acosThisMonth: String(row[acosIndex] || '0'),
      acosChange: String(row[acosChangeIndex] || ''),
      tacosThisMonth: String(row[tacosIndex] || '0'),
      tacosChange: String(row[tacosChangeIndex] || ''),
      ctrThisMonth: String(row[ctrIndex] || '0'),
      ctrChange: String(row[ctrChangeIndex] || ''),
      cvrThisMonth: String(row[cvrIndex] || '0'),
      cvrChange: String(row[cvrChangeIndex] || '')
    };
    
    result.productPerformance.push(product);
    console.log(`Added product: ${product.asin} - ${product.title}`);
  }
  
  console.log(`Total products parsed: ${result.productPerformance.length}`);
}

// Helper function to parse Payouts data
function parsePayoutsData(sheetData: unknown[][], result: ParsedData) {
  console.log('Parsing Payouts data...');
  
  // Look for payout values in the data
  for (const row of sheetData) {
    if (row.length >= 2) {
      const label = String(row[0] || '').toLowerCase();
      const value = parseFloat(String(row[1] || '0').replace(/[$,]/g, ''));
      
      if (label.includes('latest') || label.includes('current')) {
        result.payouts.latest = value;
      } else if (label.includes('previous') || label.includes('last')) {
        result.payouts.previous = value;
      } else if (label.includes('average') || label.includes('avg')) {
        result.payouts.average = value;
      }
    }
  }
}

// Helper function to parse Amazon Performance data
function parseAmazonPerformanceData(sheetData: unknown[][], result: ParsedData) {
  console.log('Parsing Amazon Performance data...');
  
  for (const row of sheetData) {
    if (row.length >= 2) {
      const metric = String(row[0] || '').toLowerCase();
      const rawValue = String(row[1] || '0');
      const change = String(row[2] || '');
      
      if (metric.includes('sales') && metric.includes('month')) {
        result.amazonPerformance.salesThisMonth = rawValue;
        result.amazonPerformance.salesChange = change;
      } else if (metric.includes('profit') && metric.includes('month')) {
        result.amazonPerformance.netProfitThisMonth = rawValue;
        result.amazonPerformance.netProfitChange = change;
      } else if (metric.includes('margin') && metric.includes('month')) {
        result.amazonPerformance.marginThisMonth = rawValue;
        result.amazonPerformance.marginChange = change;
      } else if (metric.includes('unit') && metric.includes('month')) {
        result.amazonPerformance.unitsThisMonth = rawValue;
        result.amazonPerformance.unitsChange = change;
      } else if (metric.includes('refund') && metric.includes('month')) {
        result.amazonPerformance.refundRateThisMonth = rawValue;
        result.amazonPerformance.refundRateChange = change;
      } else if (metric.includes('acos') && metric.includes('month')) {
        result.amazonPerformance.acosThisMonth = rawValue;
        result.amazonPerformance.acosChange = change;
      } else if (metric.includes('tacos') && metric.includes('month')) {
        result.amazonPerformance.tacosThisMonth = rawValue;
        result.amazonPerformance.tacosChange = change;
      } else if (metric.includes('ctr') && metric.includes('month')) {
        result.amazonPerformance.ctrThisMonth = rawValue;
        result.amazonPerformance.ctrChange = change;
      }
    }
  }
}

// Helper function to detect and parse content based on headers
function detectAndParseContent(sheetData: unknown[][], result: ParsedData) {
  console.log('Detecting content type from headers...');
  
  if (sheetData.length === 0) return;
  
  const headers = sheetData[0].map((h: unknown) => String(h || '').toLowerCase());
  console.log('Headers found:', headers);
  
  // Check if this looks like product data
  if (headers.some(h => h.includes('asin') || h.includes('product') || h.includes('title'))) {
    console.log('Detected product performance data');
    parseProductPerformanceData(sheetData, result);
  }
  // Check if this looks like profit/loss data
  else if (headers.some(h => h.includes('profit') || h.includes('loss') || h.includes('sales') || h.includes('expense'))) {
    console.log('Detected profit/loss data');
    parseProfitLossData(sheetData, result);
  }
  // Check if this looks like payouts data
  else if (headers.some(h => h.includes('payout') || h.includes('payment'))) {
    console.log('Detected payouts data');
    parsePayoutsData(sheetData, result);
  }
  // Check if this looks like Amazon performance data
  else if (headers.some(h => h.includes('amazon') || h.includes('performance') || h.includes('acos') || h.includes('tacos'))) {
    console.log('Detected Amazon performance data');
    parseAmazonPerformanceData(sheetData, result);
  }
}





export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Check user permissions
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const clientCode = searchParams.get('clientCode');

    if (!userId || !clientCode) {
      return NextResponse.json(
        { error: 'User ID and client code are required' },
        { status: 400 }
      );
    }

    // Check if user has access to this client
    const hasAccess = await checkClientAccess(userId, clientCode);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to access this client.' },
        { status: 403 }
      );
    }

    // Initialize Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name,mimeType',
    });

    const fileName = fileMetadata.data.name;
    const mimeType = fileMetadata.data.mimeType;

    console.log(`Processing file: ${fileName}, type: ${mimeType}`);

    // Check if it's a supported file format
    const isCSV = mimeType?.includes('csv');
    const isGoogleSheet = mimeType?.includes('spreadsheet') && mimeType?.includes('google');
    const isExcel = mimeType?.includes('excel') || 
                   mimeType?.includes('spreadsheetml') || 
                   mimeType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
                   mimeType?.includes('application/vnd.ms-excel') ||
                   fileName?.toLowerCase().endsWith('.xlsx') ||
                   fileName?.toLowerCase().endsWith('.xls');

    if (!isCSV && !isGoogleSheet && !isExcel) {
      return NextResponse.json(
        { 
          error: 'File is not a supported format (CSV or Excel)',
          fileType: mimeType,
          fileName: fileName,
          supportedTypes: ['CSV', 'Excel (.xlsx/.xls)', 'Google Sheets']
        },
        { status: 400 }
      );
    }

    // Download file content
    let parsedData: ParsedData;
    
    if (mimeType?.includes('spreadsheet') && mimeType?.includes('google')) {
      // For Google Sheets, try downloading as Excel first to preserve tabs and formatting
      console.log(`Processing Google Sheet: ${fileName} (${mimeType})`);
      
      try {
        console.log('=== GOOGLE SHEET XLSX DOWNLOAD STARTED ===');
        console.log('Attempting to export Google Sheet as Excel (.xlsx)...');
        
        // Step 1: Download the Excel file from Google Drive
        const xlsxResponse = await drive.files.export({
          fileId,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        
        console.log('=== XLSX DOWNLOAD COMPLETED ===');
        console.log('XLSX response received successfully');
        console.log('XLSX response data type:', typeof xlsxResponse.data);
        console.log('XLSX response data constructor:', xlsxResponse.data?.constructor?.name);
        
        if (xlsxResponse.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('XLSX response data length:', (xlsxResponse.data as any).length);
          console.log('XLSX response data keys:', Object.keys(xlsxResponse.data));
        } else {
          console.error('XLSX response data is null or undefined');
          throw new Error('Excel export returned null or undefined data');
        }
        
        // Step 2: Convert response data to Buffer
        console.log('=== CONVERTING TO BUFFER ===');
        let fileBuffer: Buffer;
        
        if (xlsxResponse.data instanceof Buffer) {
          console.log('Response data is already a Buffer');
          fileBuffer = xlsxResponse.data;
        } else if (typeof xlsxResponse.data === 'string') {
          console.log('Converting string data to Buffer');
          fileBuffer = Buffer.from(xlsxResponse.data, 'binary');
        } else if (xlsxResponse.data && typeof xlsxResponse.data === 'object') {
          console.log('Converting object data to Buffer');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = xlsxResponse.data as any;
          
          // Enhanced Blob detection - check multiple ways
          const isBlob = data instanceof Blob || 
                        (data && typeof data.arrayBuffer === 'function' && data.type) ||
                        (data && data.constructor && data.constructor.name === 'Blob');
          
          if (isBlob) {
            // Handle Blob objects by converting to ArrayBuffer first
            console.log('Converting Blob to Buffer');
            try {
              const arrayBuffer = await data.arrayBuffer();
              fileBuffer = Buffer.from(arrayBuffer);
            } catch (blobError) {
              console.error('Failed to convert Blob to ArrayBuffer:', blobError);
              throw new Error('Failed to convert Blob data to Buffer');
            }
          } else if (data instanceof ArrayBuffer) {
            // Handle ArrayBuffer objects
            console.log('Converting ArrayBuffer to Buffer');
            fileBuffer = Buffer.from(data);
          } else if (data && data.buffer && data.buffer instanceof ArrayBuffer) {
            // Handle TypedArray objects (Uint8Array, etc.)
            console.log('Converting TypedArray to Buffer');
            fileBuffer = Buffer.from(data.buffer);
          } else if (data && typeof data === 'object' && data.byteLength !== undefined) {
            // Handle objects that have byteLength (like ArrayBuffer-like objects)
            console.log('Converting ArrayBuffer-like object to Buffer');
            fileBuffer = Buffer.from(data);
          } else {
            // Try to convert other object types
            console.log('Attempting to convert object to Buffer');
            console.log('Object type:', typeof data);
            console.log('Object constructor:', data?.constructor?.name);
            console.log('Object keys:', Object.keys(data || {}));
            
            // Try different conversion methods
            try {
              if (data && data.data) {
                // Some APIs wrap data in a data property
                fileBuffer = Buffer.from(data.data);
              } else if (data && typeof data.toString === 'function') {
                // Try converting to string first
                const stringData = data.toString();
                fileBuffer = Buffer.from(stringData, 'binary');
              } else {
                // Last resort - try direct conversion
                fileBuffer = Buffer.from(data);
              }
            } catch (conversionError) {
              console.error('All conversion methods failed:', conversionError);
              throw new Error(`Cannot convert object of type ${typeof data} to Buffer`);
            }
          }
        } else {
          console.error('Unexpected XLSX response data type:', typeof xlsxResponse.data);
          throw new Error(`Excel export returned invalid data type: ${typeof xlsxResponse.data}`);
        }
        
        // Step 3: Validate the buffer
        console.log('=== VALIDATING BUFFER ===');
        if (!fileBuffer) {
          throw new Error('Failed to create buffer from Excel export data');
        }
        
        if (!Buffer.isBuffer(fileBuffer)) {
          throw new Error(`Buffer validation failed: expected Buffer, got ${typeof fileBuffer}`);
        }
        
        if (fileBuffer.length === 0) {
          throw new Error('Excel export returned empty buffer');
        }
        
        console.log(`Google Sheet Excel export size: ${fileBuffer.length} bytes`);
        console.log('Buffer validation successful');
        
        // Step 4: Process the Excel file
        console.log('=== PROCESSING EXCEL FILE ===');
        try {
          parsedData = parseExcel(fileBuffer);
          console.log('=== EXCEL PROCESSING COMPLETED ===');
          console.log('Successfully parsed Google Sheet as Excel');
        } catch (parseError) {
          console.error('=== EXCEL PROCESSING FAILED ===');
          console.error('Failed to parse Google Sheet Excel export:', parseError);
          throw parseError; // Re-throw to trigger CSV fallback
        }
        
      } catch (xlsxError) {
        console.warn('Excel export failed, falling back to CSV export:', xlsxError);
        
        // Fallback to CSV export
        try {
          console.log('=== CSV FALLBACK DOWNLOAD STARTED ===');
          console.log('Attempting to export Google Sheet as CSV...');
          
          const csvResponse = await drive.files.export({
            fileId,
            mimeType: 'text/csv',
          });
          
          console.log('=== CSV DOWNLOAD COMPLETED ===');
          console.log('CSV response received successfully');
          console.log('CSV response data type:', typeof csvResponse.data);
          
          if (!csvResponse.data) {
            console.error('CSV response data is null or undefined');
            throw new Error('CSV export returned null or undefined data');
          }
          
          const fileContent = csvResponse.data as string;
          
          if (typeof fileContent !== 'string') {
            console.error('CSV response data is not a string:', typeof fileContent);
            throw new Error(`CSV export returned invalid data type: ${typeof fileContent}`);
          }
          
          if (fileContent.length === 0) {
            console.error('CSV response data is empty');
            throw new Error('CSV export returned empty content');
          }
          
          console.log(`Google Sheet CSV export length: ${fileContent.length} characters`);
          console.log('CSV content validation successful');
          
          console.log('=== PROCESSING CSV FILE ===');
          parsedData = parseCSV(fileContent);
          console.log('=== CSV PROCESSING COMPLETED ===');
          console.log('Successfully parsed Google Sheet as CSV (fallback)');
          
        } catch (csvError) {
          console.error('Both Excel and CSV export failed:', csvError);
          return NextResponse.json(
            { 
              error: 'Failed to export Google Sheet',
              details: `Excel export: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}, CSV export: ${csvError instanceof Error ? csvError.message : 'Unknown error'}`,
              fileType: mimeType,
              fileName: fileName
            },
            { status: 500 }
          );
        }
      }
      
    } else if (mimeType?.includes('csv')) {
      // For CSV files, download directly
      console.log(`=== CSV FILE DOWNLOAD STARTED ===`);
      console.log(`Processing CSV file: ${fileName} (${mimeType})`);
      
      const response = await drive.files.get({
        fileId,
        alt: 'media',
      });
      
      console.log('=== CSV DOWNLOAD COMPLETED ===');
      console.log('CSV response received successfully');
      console.log('CSV response data type:', typeof response.data);
      
      if (!response.data) {
        console.error('CSV response data is null or undefined');
        return NextResponse.json(
          { error: 'CSV file content is null or undefined' },
          { status: 400 }
        );
      }
      
      let fileContent: string;
      if (typeof response.data === 'string') {
        console.log('Response data is already a string');
        fileContent = response.data;
      } else if (response.data instanceof Buffer) {
        console.log('Converting Buffer data to string');
        fileContent = response.data.toString('utf8');
      } else if (response.data && typeof response.data === 'object') {
        console.log('Converting object data to string');
        fileContent = String(response.data);
      } else {
        console.error('Unexpected CSV response data type:', typeof response.data);
        return NextResponse.json(
          { error: `CSV file has invalid data type: ${typeof response.data}` },
          { status: 400 }
        );
      }
      
      // Validate the content
      console.log('=== VALIDATING CSV CONTENT ===');
      if (!fileContent) {
        console.error('CSV content is null or undefined after conversion');
        return NextResponse.json(
          { error: 'CSV file content is null or undefined after conversion' },
          { status: 400 }
        );
      }
      
      if (typeof fileContent !== 'string') {
        console.error(`CSV content validation failed: expected string, got ${typeof fileContent}`);
        return NextResponse.json(
          { error: `CSV content validation failed: expected string, got ${typeof fileContent}` },
          { status: 400 }
        );
      }
      
      if (fileContent.length === 0) {
        console.error('CSV content is empty');
        return NextResponse.json(
          { error: 'CSV file content is empty' },
          { status: 400 }
        );
      }
      
      console.log(`CSV content length: ${fileContent.length} characters`);
      console.log('CSV content validation successful');
      
      // Debug: Show first few characters to help identify content type
      const preview = fileContent.substring(0, 200);
      console.log('Content preview:', preview);
      console.log('Content contains Excel indicators:', {
        hasPK: fileContent.includes('PK\x03\x04'),
        hasXL: fileContent.includes('xl/'),
        hasWorkbook: fileContent.includes('workbook.xml'),
        hasWorksheets: fileContent.includes('worksheets/'),
        hasDrawings: fileContent.includes('drawings/')
      });
      
      // Check if the content is actually Excel data despite being labeled as CSV
      if (isExcelContent(fileContent)) {
        console.log('=== DETECTED EXCEL CONTENT IN CSV FILE ===');
        console.log('File is labeled as CSV but contains Excel data, converting to Buffer and processing as Excel');
        
        try {
          // Convert string content to Buffer for Excel processing
          const excelBuffer = Buffer.from(fileContent, 'binary');
          console.log('=== PROCESSING AS EXCEL FILE ===');
          parsedData = parseExcel(excelBuffer);
          console.log('=== EXCEL PROCESSING COMPLETED ===');
          console.log('Successfully parsed mislabeled CSV file as Excel');
        } catch (excelError) {
          console.error('Failed to parse as Excel, falling back to CSV:', excelError);
          console.log('=== PROCESSING AS CSV FILE ===');
          parsedData = parseCSV(fileContent);
          console.log('=== CSV PROCESSING COMPLETED ===');
        }
      } else {
        console.log('=== PROCESSING CSV FILE ===');
        parsedData = parseCSV(fileContent);
        console.log('=== CSV PROCESSING COMPLETED ===');
      }
      
    } else if (isExcel) {
      // For Excel files (.xlsx/.xls), download as buffer
      console.log(`=== EXCEL FILE DOWNLOAD STARTED ===`);
      console.log(`Processing Excel file: ${fileName} (${mimeType})`);
      
      const response = await drive.files.get({
        fileId,
        alt: 'media',
      });
      
      console.log('=== EXCEL DOWNLOAD COMPLETED ===');
      console.log('Excel response received successfully');
      console.log('Excel response data type:', typeof response.data);
      console.log('Excel response data constructor:', response.data?.constructor?.name);
      
      if (!response.data) {
        console.error('Excel response data is null or undefined');
        return NextResponse.json(
          { error: 'Excel file content is null or undefined' },
          { status: 400 }
        );
      }
      
      let fileBuffer: Buffer;
      if (response.data instanceof Buffer) {
        console.log('Response data is already a Buffer');
        fileBuffer = response.data;
      } else if (typeof response.data === 'string') {
        console.log('Converting string data to Buffer');
        fileBuffer = Buffer.from(response.data, 'binary');
      } else if (response.data && typeof response.data === 'object') {
        console.log('Converting object data to Buffer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = response.data as any;
        
        // Enhanced Blob detection - check multiple ways
        const isBlob = data instanceof Blob || 
                      (data && typeof data.arrayBuffer === 'function' && data.type) ||
                      (data && data.constructor && data.constructor.name === 'Blob');
        
        if (isBlob) {
          // Handle Blob objects by converting to ArrayBuffer first
          console.log('Converting Blob to Buffer');
          try {
            const arrayBuffer = await data.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
          } catch (blobError) {
            console.error('Failed to convert Blob to ArrayBuffer:', blobError);
            throw new Error('Failed to convert Blob data to Buffer');
          }
        } else if (data instanceof ArrayBuffer) {
          // Handle ArrayBuffer objects
          console.log('Converting ArrayBuffer to Buffer');
          fileBuffer = Buffer.from(data);
        } else if (data && data.buffer && data.buffer instanceof ArrayBuffer) {
          // Handle TypedArray objects (Uint8Array, etc.)
          console.log('Converting TypedArray to Buffer');
          fileBuffer = Buffer.from(data.buffer);
        } else if (data && typeof data === 'object' && data.byteLength !== undefined) {
          // Handle objects that have byteLength (like ArrayBuffer-like objects)
          console.log('Converting ArrayBuffer-like object to Buffer');
          fileBuffer = Buffer.from(data);
        } else {
          // Try to convert other object types
          console.log('Attempting to convert object to Buffer');
          console.log('Object type:', typeof data);
          console.log('Object constructor:', data?.constructor?.name);
          console.log('Object keys:', Object.keys(data || {}));
          
          // Try different conversion methods
          try {
            if (data && data.data) {
              // Some APIs wrap data in a data property
              fileBuffer = Buffer.from(data.data);
            } else if (data && typeof data.toString === 'function') {
              // Try converting to string first
              const stringData = data.toString();
              fileBuffer = Buffer.from(stringData, 'binary');
            } else {
              // Last resort - try direct conversion
              fileBuffer = Buffer.from(data);
            }
          } catch (conversionError) {
            console.error('All conversion methods failed:', conversionError);
            throw new Error(`Cannot convert object of type ${typeof data} to Buffer`);
          }
        }
      } else {
        console.error('Unexpected Excel response data type:', typeof response.data);
        return NextResponse.json(
          { error: `Excel file has invalid data type: ${typeof response.data}` },
          { status: 400 }
        );
      }
      
      // Validate the buffer
      console.log('=== VALIDATING EXCEL BUFFER ===');
      if (!fileBuffer) {
        console.error('Failed to create buffer from Excel file data');
        return NextResponse.json(
          { error: 'Failed to create buffer from Excel file data' },
          { status: 400 }
        );
      }
      
      if (!Buffer.isBuffer(fileBuffer)) {
        console.error(`Buffer validation failed: expected Buffer, got ${typeof fileBuffer}`);
        return NextResponse.json(
          { error: `Buffer validation failed: expected Buffer, got ${typeof fileBuffer}` },
          { status: 400 }
        );
      }
      
      if (fileBuffer.length === 0) {
        console.error('Excel file buffer is empty');
        return NextResponse.json(
          { error: 'Excel file content is empty' },
          { status: 400 }
        );
      }
      
      console.log(`Excel file size: ${fileBuffer.length} bytes`);
      console.log('Excel buffer validation successful');
      
      console.log('=== PROCESSING EXCEL FILE ===');
      try {
        parsedData = parseExcel(fileBuffer);
        console.log('=== EXCEL PROCESSING COMPLETED ===');
      } catch (parseError) {
        console.error('=== EXCEL PROCESSING FAILED ===');
        console.error('Error parsing Excel file:', parseError);
        return NextResponse.json(
          { 
            error: 'Failed to parse Excel file',
            details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
            fileType: mimeType,
            fileName: fileName
          },
          { status: 400 }
        );
      }
      
    } else {
      return NextResponse.json(
        { 
          error: 'Unsupported file format. Please use CSV, Excel (.xlsx), or Google Sheets.',
          fileType: mimeType,
          fileName: fileName
        },
        { status: 400 }
      );
    }
    
    console.log(`Parsed data:`, {
      profitLossKeys: Object.keys(parsedData.profitLoss),
      productCount: parsedData.productPerformance.length,
      hasPayouts: !!parsedData.payouts,
      hasAmazonPerformance: !!parsedData.amazonPerformance
    });

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Functions are internal to this route handler
// Removed exports to comply with Next.js API route requirements
