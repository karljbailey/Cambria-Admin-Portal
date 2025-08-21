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

    // Initialize Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // List files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink)',
      orderBy: 'name',
    });

    const files = response.data.files || [];

    // Map the response to our interface
    const items: FolderItem[] = files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      webViewLink: file.webViewLink!,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching folder data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder data' },
      { status: 500 }
    );
  }
}
