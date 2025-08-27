# Email Setup for Cambria Portal

This document explains how to set up email functionality for sending welcome emails to new users.

## Overview

When a new user is created in the Cambria Portal, the system will automatically send them a welcome email containing their login credentials. This feature helps administrators provide secure access to new users.

## Email Configuration

### Required Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Application URL (for login links in emails)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Navigate to Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### Other Email Providers

You can use any SMTP provider. Common configurations:

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Testing Email Configuration

### Test Basic Email Setup
```bash
npm run test:email
```

### Test New User Welcome Email
```bash
npm run test:new-user-email
```

This will send a test welcome email to your configured email address.

## Email Templates

### New User Welcome Email (`new-user-welcome.hbs`)

The welcome email template includes:
- User's name and email
- Their password (plain text for initial access)
- Their role in the system
- Security recommendations
- Login link

### Template Variables

The welcome email template uses these variables:
- `{{userName}}` - User's full name
- `{{userEmail}}` - User's email address
- `{{password}}` - User's password (plain text)
- `{{userRole}}` - User's role (Admin/Basic)
- `{{loginUrl}}` - Login page URL

## Security Considerations

### Password Security
- Passwords are sent in plain text in the welcome email
- Users are encouraged to change their password after first login
- Consider implementing a password change requirement on first login

### Email Security
- Use App Passwords instead of regular passwords for Gmail
- Enable 2-Factor Authentication on the sending email account
- Consider using a dedicated email account for system emails

## Troubleshooting

### Common Issues

#### Authentication Failed (EAUTH)
- Check that `SMTP_USER` and `SMTP_PASS` are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Verify 2-Factor Authentication is enabled

#### Connection Failed (ECONNECTION)
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify your internet connection
- Check firewall settings

#### Connection Timeout (ETIMEDOUT)
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify network connectivity
- Try a different SMTP port

### Debug Mode

To enable detailed email logging, add this to your environment:
```bash
DEBUG=nodemailer:*
```

## Email Flow

1. **User Creation**: Admin creates a new user via the API
2. **Password Hashing**: Password is hashed and stored securely
3. **Welcome Email**: System sends welcome email with credentials
4. **Audit Log**: User creation is logged in audit trail
5. **User Login**: User can login with provided credentials

## Customization

### Modifying Email Templates

Email templates are located in `email-templates/` directory:
- `new-user-welcome.hbs` - Welcome email for new users
- `forgot-password.hbs` - Password reset email

Templates use Handlebars syntax and can be customized as needed.

### Styling

Email templates include inline CSS for consistent rendering across email clients. The styling is designed to work with most modern email clients.

## Production Deployment

### Environment Variables

For production, ensure all email environment variables are properly set:
```bash
SMTP_USER=your-production-email@domain.com
SMTP_PASS=your-production-app-password
SMTP_HOST=your-production-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Email Provider Recommendations

For production, consider using:
- **SendGrid** - Reliable email delivery service
- **Mailgun** - Developer-friendly email API
- **Amazon SES** - Cost-effective for high volume
- **Postmark** - Transactional email specialist

### Monitoring

Monitor email delivery rates and bounce rates to ensure reliable delivery. Most email providers offer delivery analytics and webhook support for tracking email events.


