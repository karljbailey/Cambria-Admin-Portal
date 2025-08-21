import { NextResponse } from 'next/server';
import { listResetCodes } from '@/lib/reset-codes';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    listResetCodes();
    return NextResponse.json({
      success: true,
      message: 'Check server console for reset codes'
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed' },
      { status: 500 }
    );
  }
}
