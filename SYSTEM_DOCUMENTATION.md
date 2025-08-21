# Cambria Dashboard - System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Setup & Installation](#setup--installation)
5. [Configuration](#configuration)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Security](#security)

## Overview

Cambria Dashboard is a comprehensive client management system designed for Amazon sellers. It provides robust client management, file processing capabilities, audit logging, and seamless integration with Google Sheets.

### Key Capabilities
- **Client Management**: Add, edit, and manage client information with Google Sheets integration
- **File Processing**: Support for Excel (.xlsx, .xls), CSV, and Google Sheets with advanced parsing
- **Security**: User authentication, password management, and comprehensive audit logging
- **Responsive Design**: Mobile-friendly interface with modern UI/UX
- **Settings Management**: Configurable user preferences and system settings

## Architecture

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with TypeScript
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **File Storage**: Google Drive API
- **Data Processing**: Google Sheets API, XLSX library
- **Testing**: Jest with comprehensive E2E, unit, and integration tests

### System Components

```
cambria-dashboard/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── audit/         # Audit logging
│   │   ├── clients/       # Client management
│   │   └── file/          # File processing
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utility functions and helpers
│   └── __tests__/        # Test files
```

### Data Flow
1. **Authentication**: User login → Firebase Auth → Session management
2. **Client Management**: CRUD operations → Google Sheets sync → Real-time updates
3. **File Processing**: Upload → Google Drive → Parse → Store results
4. **Audit Logging**: User actions → Firebase → Audit trail

## Features

### 1. Client Management
- **Add Clients**: Create new client records with required information
- **Edit Clients**: Update client details, goals, and status
- **Search & Filter**: Advanced search capabilities across all client fields
- **Status Management**: Toggle active/inactive client status
- **Google Sheets Integration**: Automatic synchronization with Google Sheets

### 2. File Processing
- **Supported Formats**: Excel (.xlsx, .xls), CSV, Google Sheets
- **Multi-tab Processing**: Handle complex Excel files with multiple worksheets
- **Data Extraction**: Parse profit & loss data, product performance, payouts
- **Error Handling**: Robust error recovery and fallback mechanisms
- **Download Verification**: Comprehensive download and processing validation

### 3. Authentication & Security
- **User Authentication**: Email/password login with Firebase
- **Password Management**: Secure password reset functionality
- **Session Management**: Secure session tokens with automatic expiration
- **Audit Logging**: Comprehensive tracking of all user actions
- **Role-based Access**: User role management and permissions

### 4. User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Navigation**: Enhanced navigation with settings and help integration
- **Settings Management**: User-configurable preferences
- **Help System**: Comprehensive user guide and troubleshooting

## Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Google Cloud project with APIs enabled

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd cambria-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create `.env.local` file with required environment variables:
   ```env
   # Firebase Configuration
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id

   # Google Sheets Configuration
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   GOOGLE_PRIVATE_KEY=your_private_key
   GOOGLE_SHEETS_ID=your_spreadsheet_id

   # Email Configuration (optional)
   EMAIL_SERVICE_API_KEY=your_email_service_key
   ```

4. **Firebase Setup**
   - Create Firebase project
   - Enable Authentication (Email/Password)
   - Enable Firestore database
   - Configure security rules

5. **Google Cloud Setup**
   - Create Google Cloud project
   - Enable Google Sheets API
   - Enable Google Drive API
   - Create service account and download credentials

6. **Run Development Server**
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FIREBASE_API_KEY` | Firebase API key | Yes |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email | Yes |
| `GOOGLE_PRIVATE_KEY` | Google service account private key | Yes |
| `GOOGLE_SHEETS_ID` | Google Sheets spreadsheet ID | Yes |

### Google Sheets Structure
The system expects the following column structure in Google Sheets:
- Column A: Folder ID
- Column B: Client Code
- Column C: Client Name
- Column D: Full Name
- Column E: Active Status
- Column F: ACOS Goal
- Column G: TACOS Goal

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### POST /api/auth/logout
Logout user and clear session.

#### POST /api/auth/forgot-password
Send password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
Reset password with reset code.

**Request:**
```json
{
  "email": "user@example.com",
  "resetCode": "123456",
  "newPassword": "newpassword123"
}
```

### Client Management Endpoints

#### GET /api/clients
Retrieve all clients from Google Sheets.

**Response:**
```json
{
  "clients": [
    {
      "folderId": "folder_id",
      "clientCode": "CLIENT001",
      "clientName": "Client Name",
      "fullName": "Full Client Name",
      "active": true,
      "acosGoal": "15%",
      "tacosGoal": "20%"
    }
  ]
}
```

#### POST /api/clients
Add new client to Google Sheets.

**Request:**
```json
{
  "clientCode": "CLIENT001",
  "clientName": "Client Name",
  "fullName": "Full Client Name",
  "folderId": "folder_id",
  "acosGoal": "15%",
  "tacosGoal": "20%"
}
```

#### PATCH /api/clients
Update client status.

**Request:**
```json
{
  "clientCode": "CLIENT001",
  "active": false
}
```

#### PUT /api/clients
Update client information.

**Request:**
```json
{
  "originalCode": "CLIENT001",
  "clientCode": "CLIENT001",
  "clientName": "Updated Name",
  "fullName": "Updated Full Name",
  "folderId": "folder_id"
}
```

### File Processing Endpoints

#### GET /api/file/[id]
Process file from Google Drive.

**Response:**
```json
{
  "profitLoss": {
    "revenue": 100000,
    "costOfSales": -60000,
    "grossProfit": 40000
  },
  "productPerformance": [
    {
      "product": "Product Name",
      "sales": 50000,
      "costs": -30000
    }
  ],
  "payouts": [
    {
      "date": "2024-01-01",
      "amount": 10000
    }
  ]
}
```

### Audit Endpoints

#### GET /api/audit
Retrieve audit logs.

#### POST /api/audit
Add audit log entry.

**Request:**
```json
{
  "action": "USER_LOGIN",
  "userId": "user_id",
  "details": "User logged in successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Testing

### Test Structure
- **E2E Tests**: End-to-end API testing with Jest
- **Unit Tests**: Individual function testing
- **Integration Tests**: Component and service integration testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test __tests__/e2e/clients-get-api.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Categories
1. **Authentication Tests**: Login, logout, password reset
2. **Client Management Tests**: CRUD operations, validation
3. **File Processing Tests**: Upload, parsing, error handling
4. **Audit Tests**: Logging, retrieval
5. **Integration Tests**: End-to-end workflows

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Considerations
- Set `NODE_ENV=production`
- Configure production Firebase project
- Set up production Google Cloud credentials
- Configure domain and SSL certificates

### Deployment Platforms
- **Vercel**: Recommended for Next.js applications
- **Netlify**: Alternative deployment option
- **AWS**: For enterprise deployments

## Troubleshooting

### Common Issues

#### Authentication Problems
- Verify Firebase configuration
- Check environment variables
- Ensure Firebase Authentication is enabled

#### Google Sheets Integration Issues
- Verify service account permissions
- Check spreadsheet ID and structure
- Ensure Google Sheets API is enabled

#### File Processing Errors
- Check file format compatibility
- Verify file size limits (50MB)
- Ensure Google Drive API access

#### Performance Issues
- Monitor API rate limits
- Optimize database queries
- Implement caching strategies

### Error Codes
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource already exists
- `500`: Internal Server Error - Server error
- `503`: Service Unavailable - External service error

## Security

### Security Features
- **Authentication**: Firebase Authentication with secure session management
- **Authorization**: Role-based access control
- **Data Protection**: Input validation and sanitization
- **Audit Logging**: Comprehensive security event tracking
- **HTTPS**: Secure communication protocols

### Best Practices
- Regular security updates
- Environment variable protection
- API rate limiting
- Input validation
- Error message sanitization
- Regular security audits

### Compliance
- GDPR compliance for data handling
- SOC 2 compliance for security standards
- Industry-standard encryption
- Regular security assessments

---

## Support

For technical support or questions:
1. Check the user guide at `/guide`
2. Review troubleshooting section
3. Contact system administrator
4. Check system logs for detailed error information

## Version History

### v1.0.0 (Current)
- Initial release with core functionality
- Client management with Google Sheets integration
- File processing for Excel, CSV, and Google Sheets
- Comprehensive authentication and security
- Responsive UI with modern design
- Complete test coverage
- Settings and user guide integration
