import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  let file: File | null = null;
  let folderId: string | null = null;
  
  try {
    // Parse form data
    const formData = await request.formData();
    file = formData.get('file') as File;
    folderId = formData.get('folderId') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!folderId || folderId.trim() === '') {
      return NextResponse.json(
        { error: 'No folder ID provided' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      console.error('Missing Google credentials:', {
        hasEmail: !!serviceAccountEmail,
        hasPrivateKey: !!privateKey
      });
      return NextResponse.json(
        { error: 'Google Drive service not configured' },
        { status: 503 }
      );
    }

    // Validate file size (optional - add reasonable limits)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 413 }
      );
    }

    // Initialize Google Drive API with error handling
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } catch (authError: unknown) {
      console.error('Google Auth initialization failed:', authError);
      return NextResponse.json(
        { error: 'Authentication service initialization failed' },
        { status: 500 }
      );
    }

    let drive;
    try {
      drive = google.drive({ version: 'v3', auth });
    } catch (driveError: unknown) {
      console.error('Google Drive initialization failed:', driveError);
      return NextResponse.json(
        { error: 'Drive service initialization failed' },
        { status: 500 }
      );
    }

    // Convert file to buffer with error handling
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } catch (fileError: unknown) {
      console.error('File processing failed:', fileError);
      return NextResponse.json(
        { error: 'Failed to process file data' },
        { status: 400 }
      );
    }

    // Create a readable stream from the buffer
    const stream = Readable.from(buffer);

    // Prepare upload parameters
    const uploadParams = {
      requestBody: {
        name: file.name,
        parents: [folderId],
        // Support for shared drives
        supportsAllDrives: true,
        supportsTeamDrives: true,
      },
      media: {
        mimeType: file.type || 'application/octet-stream', // Default MIME type if not provided
        body: stream,
      },
      // Add support for shared drives in the request
      supportsAllDrives: true,
      supportsTeamDrives: true,
    };

    // Upload file to Google Drive with comprehensive error handling
    let response;
    try {
      response = await drive.files.create(uploadParams);
    } catch (driveError: unknown) {
      console.error('Google Drive upload failed:', driveError);
      
      // Handle specific Google Drive API errors with proper type guards
      if (driveError && typeof driveError === 'object' && 'code' in driveError) {
        const errorCode = driveError.code;
        const errorMessage = 'message' in driveError && typeof driveError.message === 'string' ? driveError.message : '';
        
        if (errorCode === 403) {
          if (errorMessage.includes('Service Accounts do not have storage quota')) {
            return NextResponse.json(
              { 
                error: 'Service Account storage quota exceeded. Please use a shared drive or contact administrator.',
                details: 'Service accounts have limited storage. Consider using a shared drive or OAuth delegation.'
              },
              { status: 403 }
            );
          } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
            return NextResponse.json(
              { error: 'Insufficient permissions to upload to this folder' },
              { status: 403 }
            );
          } else {
            return NextResponse.json(
              { error: 'Access denied to Google Drive' },
              { status: 403 }
            );
          }
        } else if (errorCode === 404) {
          return NextResponse.json(
            { error: 'Folder not found or does not exist' },
            { status: 404 }
          );
        } else if (errorCode === 401) {
          return NextResponse.json(
            { error: 'Authentication failed with Google Drive' },
            { status: 401 }
          );
        } else if (errorCode === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        } else if (errorCode === 500) {
          return NextResponse.json(
            { error: 'Google Drive service temporarily unavailable' },
            { status: 503 }
          );
        } else {
          return NextResponse.json(
            { error: 'Upload failed due to drive service error', details: errorMessage },
            { status: 500 }
          );
        }
      }
      
      // Generic error handling
      return NextResponse.json(
        { error: 'Upload failed due to drive service error' },
        { status: 500 }
      );
    }

    // Validate response
    if (!response?.data?.id) {
      console.error('Upload succeeded but no file ID returned:', response);
      return NextResponse.json(
        { error: 'Upload completed but file ID not received' },
        { status: 500 }
      );
    }

    // Log successful upload
    console.log(`✅ File uploaded successfully: ${file.name} (${response.data.id})`);

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      message: 'File uploaded successfully'
    });

  } catch (error: unknown) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      file: file?.name,
      folderId,
      fileSize: file?.size,
      fileType: file?.type
    });

    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}