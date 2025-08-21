import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { verifyResetCode, getUserIdForResetCode, removeResetCode } from '@/lib/reset-codes';

// Simple audit logging function to avoid circular dependencies
const logSecurityEvent = (event: string, details: Record<string, unknown>) => {
  console.log(`[SECURITY] ${event}:`, JSON.stringify(details, null, 2));
};

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    console.log('Reset password request:', { email, code: code ? '***' : 'missing', hasPassword: !!newPassword });

    // Validate required fields
    if (!email || !code || !newPassword) {
      console.log('Missing required fields:', { email: !!email, code: !!code, password: !!newPassword });
      return NextResponse.json(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if reset code exists and is valid
    console.log('Verifying reset code for:', email);
    const isValid = verifyResetCode(email, code);
    console.log('Reset code verification result:', isValid);
    
    if (!isValid) {
      // Get user ID for logging (if available)
      const userId = getUserIdForResetCode(email);
      
      // Log failed attempt
      logSecurityEvent('PASSWORD_RESET_FAILED', {
        email,
        reason: 'invalid_or_expired_code',
        userId: userId || 'unknown',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { error: 'Invalid or expired reset code. Please check the code and try again, or request a new code.' },
        { status: 400 }
      );
    }

    // Find user
    let user = null;
    const userId = getUserIdForResetCode(email);
    
    if (!isFirebaseConfigured()) {
      console.error('Firebase not configured for password reset');
      return NextResponse.json(
        { error: 'Password reset service not configured' },
        { status: 503 }
      );
    }

    if (!userId) {
      console.error('No user ID found for reset code:', email);
      return NextResponse.json(
        { error: 'Invalid reset code' },
        { status: 400 }
      );
    }

    try {
      user = await usersService.getById(userId);
    } catch (error) {
      console.error('Error fetching user from Firebase:', error);
      return NextResponse.json(
        { error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 400 }
      );
    }

    // Hash new password
    let hash, salt;
    try {
      const passwordData = await hashPassword(newPassword);
      hash = passwordData.hash;
      salt = passwordData.salt;
    } catch (error) {
      console.error('Error hashing password:', error);
      return NextResponse.json(
        { error: 'Failed to process password. Please try again.' },
        { status: 500 }
      );
    }

    // Update user password
    try {
      await usersService.update(user.id || 'unknown', {
        passwordHash: hash,
        passwordSalt: salt,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error updating user password in Firebase:', error);
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Remove used reset code
    removeResetCode(email);

    // Log successful password reset
    logSecurityEvent('PASSWORD_RESET_SUCCESSFUL', {
      email: user.email,
      userId: user.id || 'unknown',
      success: true,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
