import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { auditHelpers } from '@/lib/audit';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    let user = null;

    if (isFirebaseConfigured()) {
      // Use Firebase
      try {
        user = await usersService.getByEmail(email);
        console.log(`🔍 User lookup for ${email}: ${user ? 'Found' : 'Not found'}`);
      } catch (error) {
        console.error('Error fetching from Firebase:', error);
        return NextResponse.json(
          { success: false, error: 'Authentication service temporarily unavailable' },
          { status: 503 }
        );
      }
    } else {
      // Firebase not configured - return error
      console.error('Firebase not configured for login request');
      return NextResponse.json(
        { success: false, error: 'Authentication service not configured' },
        { status: 503 }
      );
    }

    // Check if user exists and is active
    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    if (!user.passwordHash || !user.passwordSalt) {
      console.error(`User ${user.email} has no password hash configured`);
      return NextResponse.json(
        { success: false, error: 'User account not properly configured' },
        { status: 500 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login time
    if (user.id) {
      try {
        await usersService.update(user.id, { lastLogin: new Date().toISOString() });
      } catch (error) {
        console.error('Error updating last login:', error);
        // Don't fail the login if last login update fails
      }
    }

    // Log successful login
    try {
      await auditHelpers.userLoggedIn(user.email, user.name, request.headers.get('user-agent') || 'Unknown');
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't fail the login if audit logging fails
    }

    // Create session token
    const sessionToken = createSessionToken(user.id || 'unknown', user.email);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      message: 'Login successful'
    });

    // Set HTTP-only cookie with session token
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
