import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Validate environment configuration
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    if (!spreadsheetId || spreadsheetId.trim() === '') {
      console.error('Google Sheets ID not configured or empty');
      return NextResponse.json(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    }

    if (!serviceAccountEmail || !privateKey) {
      console.error('Google credentials not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // First, read the spreadsheet to find the client by folder ID and check for "New Documents" column
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId.trim(),
      range: 'A:Z', // Read more columns to find the "New Documents" column
    });

    if (!readResponse.data.values || readResponse.data.values.length === 0) {
      console.error('No data found in spreadsheet');
      return NextResponse.json(
        { error: 'No data found in spreadsheet' },
        { status: 404 }
      );
    }

    const rows = readResponse.data.values;
    const headerRow = rows[0]; // First row contains headers
    
    // Find the "New Documents" column index
    let newDocumentsColumnIndex = -1;
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i].toString().toLowerCase().includes('new documents')) {
        newDocumentsColumnIndex = i;
        break;
      }
    }

    // If "New Documents" column doesn't exist, create it
    if (newDocumentsColumnIndex === -1) {
      console.log('"New Documents" column not found, creating it...');
      
      try {
        // Add the column header to the first row
        const lastColumnLetter = String.fromCharCode(65 + headerRow.length); // Convert to letter (A, B, C, etc.)
        const newColumnRange = `${lastColumnLetter}1`;
        
        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId.trim(),
          range: newColumnRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['New Documents']]
          }
        });
        
        newDocumentsColumnIndex = headerRow.length;
        console.log(`Created "New Documents" column at position ${lastColumnLetter}`);
      } catch (createColumnError) {
        console.error('Failed to create "New Documents" column:', createColumnError);
        return NextResponse.json(
          { error: 'Failed to create "New Documents" column in spreadsheet' },
          { status: 500 }
        );
      }
    }

    // Find the row with matching folder ID (column A)
    let clientRowIndex = -1;
    let clientCode = '';

    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      if (row[0] === folderId) { // Column A is folder ID
        clientRowIndex = i + 1; // Sheets API uses 1-based indexing
        clientCode = row[1] || ''; // Column B is client code
        break;
      }
    }

    if (clientRowIndex === -1) {
      console.error(`No client found with folder ID: ${folderId}`);
      return NextResponse.json(
        { error: 'Client not found with the provided folder ID' },
        { status: 404 }
      );
    }

    console.log(`Found client: ${clientCode} at row ${clientRowIndex}`);

    // Convert column index to letter (0=A, 1=B, 2=C, etc.)
    const columnLetter = String.fromCharCode(65 + newDocumentsColumnIndex);
    const updateRange = `${columnLetter}${clientRowIndex}`;
    
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId.trim(),
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['TRUE']]
      }
    });

    console.log(`✅ Updated sheet for client ${clientCode}: New Documents = TRUE`);

    return NextResponse.json({
      success: true,
      message: 'Sheet updated successfully',
      clientCode,
      rowUpdated: clientRowIndex,
      columnUpdated: columnLetter,
      columnIndex: newDocumentsColumnIndex
    });

  } catch (error: unknown) {
    console.error('Error updating sheet:', error);
    
    // Handle specific Google Sheets API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = error.code;
      const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';
      
      if (errorCode === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update spreadsheet' },
          { status: 403 }
        );
      } else if (errorCode === 404) {
        return NextResponse.json(
          { error: 'Spreadsheet not found' },
          { status: 404 }
        );
      } else if (errorCode === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update spreadsheet', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
