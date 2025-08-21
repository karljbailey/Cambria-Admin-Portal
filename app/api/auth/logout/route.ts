import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth';
import { auditHelpers } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // Get session token to log user info before clearing
    const sessionToken = request.cookies.get('session_token')?.value;
    let userEmail = 'Unknown';
    let userName = 'Unknown';

    if (sessionToken && sessionToken.trim() !== '') {
      try {
        const sessionData = validateSessionToken(sessionToken);
        if (sessionData && sessionData.email) {
          userEmail = sessionData.email;
          // Extract username from email, handle edge cases
          const emailParts = sessionData.email.split('@');
          userName = emailParts.length > 0 ? emailParts[0] : sessionData.email;
        }
      } catch (error) {
        // Invalid session token, continue with Unknown user
        console.log('Invalid session token during logout:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Log logout
    try {
      await auditHelpers.userLoggedOut(userEmail, userName, request.headers.get('user-agent') || 'Unknown');
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't fail logout if audit logging fails
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

    // Clear the session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire immediately
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
