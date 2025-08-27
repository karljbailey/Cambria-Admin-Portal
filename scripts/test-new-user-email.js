const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Load environment variables
require('dotenv').config();

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Load and compile email template
const loadTemplate = (templateName) => {
  const templatePath = path.join(process.cwd(), 'email-templates', `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(templateSource);
};

// Test new user welcome email
async function testNewUserWelcomeEmail() {
  console.log('🧪 Testing New User Welcome Email...\n');

  // Check email configuration
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.error('❌ Email configuration missing: SMTP_USER or SMTP_PASS not set');
    console.log('\nPlease set the following environment variables:');
    console.log('- SMTP_USER: Your email address');
    console.log('- SMTP_PASS: Your email password or app password');
    console.log('- SMTP_HOST: SMTP server (default: smtp.gmail.com)');
    console.log('- SMTP_PORT: SMTP port (default: 587)');
    console.log('- NEXT_PUBLIC_BASE_URL: Your application URL (default: http://localhost:3000)');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransporter(emailConfig);

  try {
    // Verify connection
    console.log('🔍 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email configuration is valid\n');

    // Test data
    const testData = {
      userEmail: process.env.SMTP_USER, // Send to yourself for testing
      userName: 'John Doe',
      password: 'TestPassword123!',
      userRole: 'Admin',
      loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login`
    };

    console.log('📧 Sending test welcome email...');
    console.log(`To: ${testData.userEmail}`);
    console.log(`User: ${testData.userName}`);
    console.log(`Role: ${testData.userRole}\n`);

    // Load template
    const template = loadTemplate('new-user-welcome');
    
    // Generate HTML
    const html = template({
      userEmail: testData.userEmail,
      userName: testData.userName,
      password: testData.password,
      userRole: testData.userRole,
      loginUrl: testData.loginUrl,
    });

    // Send email
    const mailOptions = {
      from: `"Cambria Portal" <${emailConfig.auth.user}>`,
      to: testData.userEmail,
      subject: 'Test: Welcome to Cambria Portal - Your Account Details',
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test welcome email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Check your inbox at: ${testData.userEmail}`);
    console.log('\n📋 Email Details:');
    console.log(`- From: ${mailOptions.from}`);
    console.log(`- To: ${mailOptions.to}`);
    console.log(`- Subject: ${mailOptions.subject}`);
    console.log(`- Template: new-user-welcome.hbs`);

  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 Authentication failed. Please check:');
      console.error('- SMTP_USER and SMTP_PASS are correct');
      console.error('- If using Gmail, use an App Password instead of your regular password');
      console.error('- Enable 2-factor authentication and generate an App Password');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🌐 Connection failed. Please check:');
      console.error('- SMTP_HOST and SMTP_PORT are correct');
      console.error('- Your internet connection');
      console.error('- Firewall settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n⏰ Connection timeout. Please check:');
      console.error('- SMTP_HOST and SMTP_PORT are correct');
      console.error('- Network connectivity');
    }
  }
}

// Run the test
testNewUserWelcomeEmail().catch(console.error);


