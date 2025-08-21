import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailConfig, sendTestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Verify email configuration
    const configValid = await verifyEmailConfig();
    
    if (!configValid) {
      return NextResponse.json(
        { error: 'Email configuration is invalid. Please check your SMTP settings.' },
        { status: 500 }
      );
    }

    // Send test email
    const emailSent = await sendTestEmail(email);

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully. Please check your inbox.'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email. Please check your SMTP settings.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verify email configuration
    const configValid = await verifyEmailConfig();
    
    return NextResponse.json({
      success: true,
      configValid,
      message: configValid 
        ? 'Email configuration is valid' 
        : 'Email configuration is invalid'
    });

  } catch (error) {
    console.error('Email config check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
