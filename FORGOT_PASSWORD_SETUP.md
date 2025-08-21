# Forgot Password Feature Setup

This guide explains how to set up the forgot password feature with email recovery functionality.

## Features

- **Email-based password reset**: Users can request a password reset via email
- **Secure 6-digit codes**: Time-limited reset codes (15 minutes)
- **Professional email templates**: Beautiful HTML emails using Handlebars
- **Security logging**: All password reset attempts are logged for security
- **Email enumeration protection**: Doesn't reveal if an email exists or not

## Email Configuration

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App URL (for reset links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### 3. Alternative Email Providers

You can use any SMTP provider. Here are some common configurations:

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
```

## Testing the Setup

### 1. Test Email Configuration

Visit `/test-email` to verify your email configuration:

```bash
npm run dev
# Then visit http://localhost:3000/test-email
```

### 2. Test Forgot Password Flow

1. Go to `/login`
2. Click "Forgot your password?"
3. Enter your email address
4. Check your email for the reset code
5. Use the code to reset your password

## File Structure

```
cambria-dashboard/
├── app/
│   ├── api/auth/
│   │   ├── forgot-password/route.ts    # Request password reset
│   │   └── reset-password/route.ts     # Reset password with code
│   ├── forgot-password/page.tsx        # Request reset page
│   ├── reset-password/page.tsx         # Reset password page
│   └── test-email/page.tsx             # Email testing page
├── email-templates/
│   └── forgot-password.hbs             # Email template
├── lib/
│   └── email.ts                        # Email service
└── FORGOT_PASSWORD_SETUP.md            # This file
```

## Security Features

### 1. Code Expiration
- Reset codes expire after 15 minutes
- Expired codes are automatically cleaned up

### 2. Rate Limiting
- Consider implementing rate limiting for production
- Log all attempts for security monitoring

### 3. Email Enumeration Protection
- Always returns success message regardless of email existence
- Prevents attackers from discovering valid email addresses

### 4. Secure Code Generation
- 6-digit numeric codes
- Cryptographically secure random generation
- One-time use only

## Production Considerations

### 1. Database Storage
Replace the in-memory storage with a database:

```typescript
// In forgot-password/route.ts
// Replace the Map with database calls
const resetCodes = new Map<string, { code: string; expiresAt: number; userId: string }>();

// Example with Firebase:
await db.collection('password_resets').add({
  email,
  code: resetCode,
  expiresAt: new Date(expiresAt),
  userId: user.id,
  used: false
});
```

### 2. Rate Limiting
Implement rate limiting to prevent abuse:

```typescript
// Example with a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
```

### 3. Email Templates
Customize the email template in `email-templates/forgot-password.hbs`:

- Update branding and colors
- Add your company logo
- Modify the email content
- Add additional security warnings

### 4. Monitoring
Set up monitoring for:

- Failed password reset attempts
- Email delivery failures
- Suspicious activity patterns

## Troubleshooting

### Email Not Sending

1. **Check SMTP configuration**:
   - Verify host, port, and credentials
   - Test with `/test-email` page

2. **Gmail issues**:
   - Ensure 2FA is enabled
   - Use app password, not regular password
   - Check if "Less secure app access" is disabled

3. **Firewall/Network issues**:
   - Ensure port 587 is not blocked
   - Check if your hosting provider allows SMTP

### Reset Codes Not Working

1. **Check code expiration**:
   - Codes expire after 15 minutes
   - Request a new code if expired

2. **Verify email address**:
   - Ensure the email matches exactly
   - Check for typos

3. **Check server logs**:
   - Look for errors in the console
   - Verify the reset code is stored correctly

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your environment variables
3. Test email configuration with `/test-email`
4. Check server logs for detailed error messages

## Security Best Practices

1. **Never log sensitive data**: Don't log reset codes or passwords
2. **Use HTTPS in production**: Ensure all communication is encrypted
3. **Implement proper session management**: Clear sessions after password reset
4. **Monitor for suspicious activity**: Log and alert on unusual patterns
5. **Regular security audits**: Review and update security measures regularly
