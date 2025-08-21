import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Validate session token
    const sessionData = validateSessionToken(sessionToken);
    
    if (!sessionData) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Get user data
    let user = null;

    if (!isFirebaseConfigured()) {
      console.error('Firebase not configured for session validation');
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    if (!sessionData.userId) {
      console.error('Session data missing userId');
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    try {
      user = await usersService.getById(sessionData.userId);
    } catch (error) {
      console.error('Error fetching user from Firebase:', error);
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 }
    );
  }
}
