import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

interface FolderItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    console.log('📁 Fetching folder data for ID:', folderId);

    // Check environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      console.error('❌ Google Drive API credentials not configured');
      return NextResponse.json(
        { error: 'Google Drive API not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Initialize Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log('📁 Google Drive API initialized, fetching files...');

    // List files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink)',
      orderBy: 'name',
    });

    console.log('📁 Response:', response.data);

    const files = response.data.files || [];
    console.log('📁 Found', files.length, 'files in folder');

    // Map the response to our interface
    const items: FolderItem[] = files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      webViewLink: file.webViewLink!,
    }));

    // Log some details about the items
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files_count = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');
    
    console.log('📁 Folder summary:', {
      totalItems: items.length,
      folders: folders.length,
      files: files_count.length,
      folderNames: folders.map(f => f.name),
      fileNames: files_count.slice(0, 5).map(f => f.name) // First 5 files
    });

    return NextResponse.json({ 
      items,
      summary: {
        totalItems: items.length,
        folders: folders.length,
        files: files_count.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching folder data:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Permission denied. Check if the service account has access to this folder.' },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Folder not found. Check if the folder ID is correct.' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch folder data' },
      { status: 500 }
    );
  }
}
