import { NextRequest, NextResponse } from 'next/server';
// import { generateToken } from '@/lib/auth';
import { sendForgotPasswordEmail } from '@/lib/email';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { storeResetCode } from '@/lib/reset-codes';

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
    const { email } = await request.json();

    // Enhanced email validation
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    // Find user by email
    let user = null;
    
    if (isFirebaseConfigured()) {
      try {
        user = await usersService.getByEmail(trimmedEmail);
      } catch (error) {
        console.error('Error fetching user from Firebase:', error);
        // Don't throw error, just log it and continue with user as null
      }
    } else {
      // Firebase not configured - log for monitoring
      console.warn('Firebase not configured for forgot password request');
    }

    // Don't reveal if email exists or not for security
    if (!user || user.status !== 'active') {
      // Log the attempt for security monitoring
      logSecurityEvent('FORGOT_PASSWORD_ATTEMPT', {
        email: trimmedEmail,
        success: false,
        reason: 'user_not_found_or_inactive',
        timestamp: new Date().toISOString()
      });

      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    }

    // Generate reset code (6 digits)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store reset code
    storeResetCode(trimmedEmail, resetCode, user.id || 'unknown');

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(trimmedEmail)}`;
    
    try {
      const emailSent = await sendForgotPasswordEmail(
        user.email,
        user.name || user.email.split('@')[0],
        resetCode,
        resetUrl
      );

      if (emailSent) {
        // Log successful password reset request
        logSecurityEvent('FORGOT_PASSWORD_REQUESTED', {
          userId: user.id || 'unknown',
          userName: user.name || user.email.split('@')[0],
          userEmail: user.email,
          success: true,
          timestamp: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          message: 'Password reset code has been sent to your email. Please check your inbox (and spam folder).'
        });
      } else {
        // Log email sending failure
        logSecurityEvent('FORGOT_PASSWORD_EMAIL_FAILED', {
          userId: user.id || 'unknown',
          userName: user.name || user.email.split('@')[0],
          userEmail: user.email,
          success: false,
          reason: 'email_send_failed',
          timestamp: new Date().toISOString()
        });

        return NextResponse.json(
          { error: 'Failed to send password reset email. Please check your email configuration and try again.' },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Log email sending failure
      logSecurityEvent('FORGOT_PASSWORD_EMAIL_ERROR', {
        userId: user.id || 'unknown',
        userName: user.name || user.email.split('@')[0],
        userEmail: user.email,
        success: false,
        reason: 'email_send_exception',
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { error: 'Email service is currently unavailable. Please try again later or contact support.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
