import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { usersService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

interface Client {
  folderId: string;
  clientCode: string;
  clientName: string;
  fullName: string;
  acosGoal?: string;
  tacosGoal?: string;
  active: boolean;
}

export async function GET(request: NextRequest) {
  try {
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

    if (!serviceAccountEmail) {
      console.error('Google Service Account Email not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error('Google Private Key not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API with enhanced error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } catch (authError) {
      console.error('Failed to initialize Google Auth:', authError);
      return NextResponse.json(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Read the spreadsheet data with enhanced error handling
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.trim(),
        range: 'A:G', // Extended to include ACOS and TACOS goals (columns F and G)
      });
    } catch (sheetsError: unknown) {
      console.error('Google Sheets API error:', sheetsError);
      
      // Provide more specific error messages based on error type
      const errorMessage = sheetsError instanceof Error ? sheetsError.message : String(sheetsError);
      
      if (errorMessage.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access spreadsheet' },
          { status: 403 }
        );
      }
      
      if (errorMessage.includes('not found') || errorMessage.includes('Unable to parse range')) {
        return NextResponse.json(
          { error: 'Spreadsheet not found or invalid' },
          { status: 404 }
        );
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (errorMessage.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while fetching data' },
          { status: 504 }
        );
      }
      
      // Generic error for other cases
      return NextResponse.json(
        { error: 'Failed to fetch clients data' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!response || !response.data) {
      console.error('Invalid response structure from Google Sheets API');
      return NextResponse.json(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    }

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('No data found in spreadsheet, returning empty array');
      return NextResponse.json({ clients: [] });
    }

    // Skip header row and map data to Client interface
    // Sheet columns: A=Folder ID, B=Client Code, C=Client Name, D=Full Name, E=Active, F=ACOS Goal, G=TACOS Goal
    const clients: Client[] = rows.slice(1).map((row) => ({
      folderId: row[0] || '',
      clientCode: row[1] || '',
      clientName: row[2] || '',
      fullName: row[3] || '',
      active: row[4]?.toUpperCase() === 'TRUE',
      acosGoal: row[5] || '',
      tacosGoal: row[6] || '',
    }));

    console.log(`Successfully fetched ${clients.length} clients from spreadsheet`);

    // Check if user permissions should be applied
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const forPermissionManagement = searchParams.get('forPermissionManagement') === 'true';
    
    if (userId && isFirebaseConfigured()) {
      try {
        // Get user and their permissions
        const user = await usersService.getById(userId);
        if (!user) {
          console.log(`User ${userId} not found, denying access`);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 403 }
          );
        }

        // If user is admin, return all clients
        if (user.role === 'admin') {
          console.log(`User ${userId} is admin, returning all ${clients.length} clients`);
          return NextResponse.json({ clients });
        }

        // If this is for permission management, return all clients (admin function)
        if (forPermissionManagement) {
          console.log(`Permission management request for user ${userId}, returning all ${clients.length} clients`);
          return NextResponse.json({ clients });
        }

        // Get user's client permissions
        const userPermissions = user.clientPermissions || [];
        const accessibleClientCodes = userPermissions.map(p => p.clientCode);
        
        console.log(`User ${userId} has access to ${accessibleClientCodes.length} clients:`, accessibleClientCodes);

        // Filter clients based on permissions
        const filteredClients = clients.filter(client => 
          accessibleClientCodes.some(code => 
            code.toUpperCase() === client.clientCode.toUpperCase()
          )
        );

        console.log(`Filtered clients for user ${userId}: ${filteredClients.length} out of ${clients.length}`);
        return NextResponse.json({ clients: filteredClients });
      } catch (error) {
        console.error('Error applying user permissions:', error);
        // If permission check fails, deny access for security
        return NextResponse.json(
          { error: 'Permission check failed' },
          { status: 403 }
        );
      }
    }

    // No user ID provided or Firebase not configured, deny access
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  } catch (error) {
    // Enhanced error logging with more context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Unexpected error fetching clients:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching clients' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check user permissions first
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { error: 'Authentication system not configured' },
        { status: 500 }
      );
    }

    try {
      const user = await usersService.getById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 403 }
        );
      }

      // Only admin users can modify clients
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required to modify clients' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { clientCode, active } = body;

    // Enhanced input validation
    if (!clientCode || typeof clientCode !== 'string' || clientCode.trim() === '') {
      console.error('Invalid clientCode provided:', { clientCode, type: typeof clientCode });
      return NextResponse.json(
        { error: 'Client code is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof active !== 'boolean') {
      console.error('Invalid active value provided:', { active, type: typeof active });
      return NextResponse.json(
        { error: 'Active status must be a boolean value' },
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

    if (!serviceAccountEmail) {
      console.error('Google Service Account Email not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error('Google Private Key not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API with enhanced error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (authError) {
      console.error('Failed to initialize Google Auth:', authError);
      return NextResponse.json(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Retrieve spreadsheet data with enhanced error handling
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.trim(),
        range: 'A:G',
      });
    } catch (sheetsError: unknown) {
      console.error('Google Sheets API error during data retrieval:', sheetsError);
      
      // Provide more specific error messages based on error type
      const errorMessage = sheetsError instanceof Error ? sheetsError.message : String(sheetsError);
      
      if (errorMessage.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access spreadsheet' },
          { status: 403 }
        );
      }
      
      if (errorMessage.includes('not found') || errorMessage.includes('Unable to parse range')) {
        return NextResponse.json(
          { error: 'Spreadsheet not found or invalid' },
          { status: 404 }
        );
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (errorMessage.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while fetching data' },
          { status: 504 }
        );
      }
      
      // Generic error for other cases
      return NextResponse.json(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!response || !response.data) {
      console.error('Invalid response structure from Google Sheets API');
      return NextResponse.json(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    }

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in spreadsheet');
      return NextResponse.json(
        { error: 'No data found in sheet' },
        { status: 404 }
      );
    }

    // Find the row index for the client (skip header row)
    let clientRowIndex = -1;
    const trimmedClientCode = clientCode.trim();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][1] === trimmedClientCode) { // Client Code is in column B (index 1)
        clientRowIndex = i + 1; // Sheets rows are 1-indexed
        break;
      }
    }

    if (clientRowIndex === -1) {
      console.log(`Client not found: ${trimmedClientCode}`);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update the Active column (column E, index 4) with enhanced error handling
    const range = `E${clientRowIndex}`;
    const value = active ? 'TRUE' : 'FALSE';

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId.trim(),
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[value]],
        },
      });
    } catch (updateError: unknown) {
      console.error('Google Sheets API error during update:', updateError);
      
      // Provide specific error messages for update failures
      if (updateError instanceof Error && updateError.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update spreadsheet' },
          { status: 403 }
        );
      }
      
      if (updateError instanceof Error && (updateError.message?.includes('quota') || updateError.message?.includes('rate'))) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (updateError instanceof Error && updateError.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while updating data' },
          { status: 504 }
        );
      }
      
      // Generic error for other update failures
      return NextResponse.json(
        { error: 'Failed to update client status in spreadsheet' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated client ${trimmedClientCode} status to ${active ? 'active' : 'inactive'}`);
    return NextResponse.json({ 
      success: true, 
      message: `Client ${trimmedClientCode} ${active ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    // Enhanced error logging with more context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Unexpected error updating client status:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating client status' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check user permissions first
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { error: 'Authentication system not configured' },
        { status: 500 }
      );
    }

    try {
      const user = await usersService.getById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 403 }
        );
      }

      // Only admin users can modify clients
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required to modify clients' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { originalCode, clientCode, clientName, fullName, folderId, acosGoal, tacosGoal, active } = body;

    // Enhanced input validation with detailed error messages
    const missingFields = [];
    if (!originalCode || typeof originalCode !== 'string' || originalCode.trim() === '') {
      missingFields.push('originalCode');
    }
    if (!clientCode || typeof clientCode !== 'string' || clientCode.trim() === '') {
      missingFields.push('clientCode');
    }
    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
      missingFields.push('clientName');
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
      missingFields.push('fullName');
    }
    if (!folderId || typeof folderId !== 'string' || folderId.trim() === '') {
      missingFields.push('folderId');
    }

    if (missingFields.length > 0) {
      console.error(`Missing or invalid required fields: ${missingFields.join(', ')}`, { 
        originalCode, clientCode, clientName, fullName, folderId 
      });
      return NextResponse.json(
        { error: `Missing or invalid required fields: ${missingFields.join(', ')}` },
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

    if (!serviceAccountEmail) {
      console.error('Google Service Account Email not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error('Google Private Key not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API with enhanced error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (authError) {
      console.error('Failed to initialize Google Auth:', authError);
      return NextResponse.json(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Retrieve spreadsheet data with enhanced error handling
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.trim(),
        range: 'A:G',
      });
    } catch (sheetsError: unknown) {
      console.error('Google Sheets API error during data retrieval:', sheetsError);
      
      // Provide more specific error messages based on error type
      if (sheetsError instanceof Error && sheetsError.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access spreadsheet' },
          { status: 403 }
        );
      }
      
      if (sheetsError instanceof Error && (sheetsError.message?.includes('not found') || sheetsError.message?.includes('Unable to parse range'))) {
        return NextResponse.json(
          { error: 'Spreadsheet not found or invalid' },
          { status: 404 }
        );
      }
      
      if (sheetsError instanceof Error && (sheetsError.message?.includes('quota') || sheetsError.message?.includes('rate'))) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (sheetsError instanceof Error && sheetsError.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while fetching data' },
          { status: 504 }
        );
      }
      
      // Generic error for other cases
      return NextResponse.json(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!response || !response.data) {
      console.error('Invalid response structure from Google Sheets API');
      return NextResponse.json(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    }

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in spreadsheet');
      return NextResponse.json(
        { error: 'No data found in sheet' },
        { status: 404 }
      );
    }

    // Find the row index for the client (skip header row)
    let clientRowIndex = -1;
    const trimmedOriginalCode = originalCode.trim();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][1] === trimmedOriginalCode) { // Client Code is in column B (index 1)
        clientRowIndex = i + 1; // Sheets rows are 1-indexed
        break;
      }
    }

    if (clientRowIndex === -1) {
      console.log(`Client not found: ${trimmedOriginalCode}`);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Prepare update data with enhanced validation
    const trimmedClientCode = clientCode.trim();
    const trimmedClientName = clientName.trim();
    const trimmedFullName = fullName.trim();
    const trimmedFolderId = folderId.trim();
    const trimmedAcosGoal = (acosGoal || '').toString().trim();
    const trimmedTacosGoal = (tacosGoal || '').toString().trim();
    const activeValue = active ? 'TRUE' : 'FALSE';

    // Update all columns for the client with enhanced error handling
    // Sheet columns: A=Folder ID, B=Client Code, C=Client Name, D=Full Name, E=Active, F=ACOS Goal, G=TACOS Goal
    const range = `A${clientRowIndex}:G${clientRowIndex}`;
    const values = [[trimmedFolderId, trimmedClientCode, trimmedClientName, trimmedFullName, activeValue, trimmedAcosGoal, trimmedTacosGoal]];

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId.trim(),
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });
    } catch (updateError: unknown) {
      console.error('Google Sheets API error during update:', updateError);
      
      // Provide specific error messages for update failures
      if (updateError instanceof Error && updateError.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update spreadsheet' },
          { status: 403 }
        );
      }
      
      if (updateError instanceof Error && (updateError.message?.includes('quota') || updateError.message?.includes('rate'))) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (updateError instanceof Error && updateError.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while updating data' },
          { status: 504 }
        );
      }
      
      // Generic error for other update failures
      return NextResponse.json(
        { error: 'Failed to update client in spreadsheet' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated client ${trimmedOriginalCode} to ${trimmedClientCode}`);
    return NextResponse.json({ 
      success: true, 
      message: `Client ${trimmedClientCode} updated successfully` 
    });
  } catch (error) {
    // Enhanced error logging with more context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Unexpected error updating client:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating client' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user permissions first
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { error: 'Authentication system not configured' },
        { status: 500 }
      );
    }

    try {
      const user = await usersService.getById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 403 }
        );
      }

      // Only admin users can create clients
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required to create clients' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { clientCode, clientName, fullName, folderId, acosGoal, tacosGoal } = body;

    // Enhanced input validation with detailed error messages
    const missingFields = [];
    if (!clientCode || typeof clientCode !== 'string' || clientCode.trim() === '') {
      missingFields.push('clientCode');
    }
    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
      missingFields.push('clientName');
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
      missingFields.push('fullName');
    }
    if (!folderId || typeof folderId !== 'string' || folderId.trim() === '') {
      missingFields.push('folderId');
    }

    if (missingFields.length > 0) {
      console.error(`Missing or invalid required fields: ${missingFields.join(', ')}`, { 
        clientCode, clientName, fullName, folderId 
      });
      return NextResponse.json(
        { error: `Missing or invalid required fields: ${missingFields.join(', ')}` },
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

    if (!serviceAccountEmail) {
      console.error('Google Service Account Email not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error('Google Private Key not configured');
      return NextResponse.json(
        { error: 'Authentication configuration missing' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API with enhanced error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (authError) {
      console.error('Failed to initialize Google Auth:', authError);
      return NextResponse.json(
        { error: 'Authentication initialization failed' },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Retrieve spreadsheet data with enhanced error handling
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.trim(),
        range: 'A:G',
      });
    } catch (sheetsError: unknown) {
      console.error('Google Sheets API error during data retrieval:', sheetsError);
      
      // Provide more specific error messages based on error type
      if (sheetsError instanceof Error && sheetsError.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access spreadsheet' },
          { status: 403 }
        );
      }
      
      if (sheetsError instanceof Error && (sheetsError.message?.includes('not found') || sheetsError.message?.includes('Unable to parse range'))) {
        return NextResponse.json(
          { error: 'Spreadsheet not found or invalid' },
          { status: 404 }
        );
      }
      
      if (sheetsError instanceof Error && (sheetsError.message?.includes('quota') || sheetsError.message?.includes('rate'))) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (sheetsError instanceof Error && sheetsError.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while fetching data' },
          { status: 504 }
        );
      }
      
      // Generic error for other cases
      return NextResponse.json(
        { error: 'Failed to retrieve spreadsheet data' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!response || !response.data) {
      console.error('Invalid response structure from Google Sheets API');
      return NextResponse.json(
        { error: 'Invalid response from data source' },
        { status: 500 }
      );
    }

    const rows = response.data.values;
    
    // Check if client code already exists with enhanced validation
    if (rows && rows.length > 0) {
      const trimmedClientCode = clientCode.trim();
      
      // Skip header row and check for existing client code
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][1] === trimmedClientCode) { // Client Code is in column B (index 1)
          console.log(`Client code already exists: ${trimmedClientCode}`);
          return NextResponse.json(
            { error: 'Client code already exists' },
            { status: 409 }
          );
        }
      }
    }

    // Prepare new client data with enhanced validation
    const trimmedClientCode = clientCode.trim();
    const trimmedClientName = clientName.trim();
    const trimmedFullName = fullName.trim();
    const trimmedFolderId = folderId.trim();
    const trimmedAcosGoal = (acosGoal || '').toString().trim();
    const trimmedTacosGoal = (tacosGoal || '').toString().trim();

    // Add new client row with enhanced error handling
    // Sheet columns: A=Folder ID, B=Client Code, C=Client Name, D=Full Name, E=Active, F=ACOS Goal, G=TACOS Goal
    const newRow = [trimmedFolderId, trimmedClientCode, trimmedClientName, trimmedFullName, 'TRUE', trimmedAcosGoal, trimmedTacosGoal]; // Default to active

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId.trim(),
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });
    } catch (appendError: unknown) {
      console.error('Google Sheets API error during append:', appendError);
      
      // Provide specific error messages for append failures
      if (appendError instanceof Error && appendError.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to add client to spreadsheet' },
          { status: 403 }
        );
      }
      
      if (appendError instanceof Error && (appendError.message?.includes('quota') || appendError.message?.includes('rate'))) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable due to rate limiting' },
          { status: 503 }
        );
      }
      
      if (appendError instanceof Error && appendError.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout while adding client' },
          { status: 504 }
        );
      }
      
      // Generic error for other append failures
      return NextResponse.json(
        { error: 'Failed to add client to spreadsheet' },
        { status: 500 }
      );
    }

    console.log(`Successfully added client ${trimmedClientCode}`);
    return NextResponse.json({ 
      success: true, 
      message: `Client ${trimmedClientCode} added successfully` 
    });
  } catch (error) {
    // Enhanced error logging with more context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Unexpected error adding client:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while adding client' },
      { status: 500 }
    );
  }
}
