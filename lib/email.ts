import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Load and compile email templates
const loadTemplate = (templateName: string): handlebars.TemplateDelegate => {
  const templatePath = path.join(process.cwd(), 'email-templates', `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(templateSource);
};

// Send forgot password email
export const sendForgotPasswordEmail = async (
  userEmail: string,
  userName: string,
  resetCode: string,
  resetUrl: string
): Promise<boolean> => {
  try {
    // Verify email configuration first
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error('Email configuration missing: SMTP_USER or SMTP_PASS not set');
      return false;
    }

    const template = loadTemplate('forgot-password');
    
    const html = template({
      userEmail,
      userName,
      resetCode,
      resetUrl,
    });

    const mailOptions = {
      from: `"Cambria Portal" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Password Reset Request - Cambria Portal',
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending forgot password email:', error);
    
    // Provide more specific error information
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'EAUTH') {
        console.error('Authentication failed - check SMTP credentials');
      } else if (error.code === 'ECONNECTION') {
        console.error('Connection failed - check SMTP host and port');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection timeout - check network or SMTP settings');
      }
    }
    
    return false;
  }
};

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

// Test email sending
export const sendTestEmail = async (toEmail: string): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"Cambria Portal" <${emailConfig.auth.user}>`,
      to: toEmail,
      subject: 'Test Email - Cambria Portal',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify that the email configuration is working correctly.</p>
        <p>If you received this email, the email service is properly configured.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
};

// Send new user welcome email with credentials
export const sendNewUserWelcomeEmail = async (
  userEmail: string,
  userName: string,
  password: string,
  userRole: string,
  loginUrl: string = '/login'
): Promise<boolean> => {
  try {
    // Verify email configuration first
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error('Email configuration missing: SMTP_USER or SMTP_PASS not set');
      return false;
    }

    const template = loadTemplate('new-user-welcome');
    
    const html = template({
      userEmail,
      userName,
      password,
      userRole: userRole.charAt(0).toUpperCase() + userRole.slice(1), // Capitalize role
      loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${loginUrl}`,
    });

    const mailOptions = {
      from: `"Cambria Portal" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Welcome to Cambria Portal - Your Account Details',
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    
    // Provide more specific error information
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'EAUTH') {
        console.error('Authentication failed - check SMTP credentials');
      } else if (error.code === 'ECONNECTION') {
        console.error('Connection failed - check SMTP host and port');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection timeout - check network or SMTP settings');
      }
    }
    
    return false;
  }
};

// Send password update notification email
export const sendPasswordUpdateEmail = async (
  userEmail: string,
  userName: string,
  password: string,
  loginUrl: string = '/login'
): Promise<boolean> => {
  try {
    // Verify email configuration first
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error('Email configuration missing: SMTP_USER or SMTP_PASS not set');
      return false;
    }

    const template = loadTemplate('password-updated');
    
    const html = template({
      userEmail,
      userName,
      password,
      loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${loginUrl}`,
    });

    const mailOptions = {
      from: `"Cambria Portal" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Password Updated - Cambria Portal',
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password update email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending password update email:', error);
    
    // Provide more specific error information
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'EAUTH') {
        console.error('Authentication failed - check SMTP credentials');
      } else if (error.code === 'ECONNECTION') {
        console.error('Connection failed - check SMTP host and port');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection timeout - check network or SMTP settings');
      }
    }
    
    return false;
  }
};
