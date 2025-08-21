# Cambria Dashboard

A comprehensive client management system designed for Amazon sellers, featuring robust file processing, Google Sheets integration, and modern UI/UX.

![Cambria Dashboard](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tests](https://img.shields.io/badge/tests-538%20passing-green)

## 🚀 Features

### ✨ Core Functionality
- **Client Management**: Add, edit, and manage client information with Google Sheets integration
- **File Processing**: Support for Excel (.xlsx, .xls), CSV, and Google Sheets with advanced parsing
- **Authentication**: Secure user authentication with Firebase
- **Audit Logging**: Comprehensive tracking of all user actions
- **Settings Management**: User-configurable preferences and system settings

### 🎨 User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Enhanced Navigation**: Improved navigation with settings and help integration
- **User Guide**: Comprehensive help system with troubleshooting

### 🔧 Technical Features
- **Robust Error Handling**: Comprehensive error recovery and validation
- **Download Verification**: Enhanced file download and processing validation
- **Security**: Input validation, audit logging, and secure session management
- **Testing**: Complete test coverage with E2E, unit, and integration tests

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cambria-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Google Cloud project with APIs enabled

### Step-by-Step Setup

1. **Firebase Setup**
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Enable Firestore database
   - Download Firebase configuration

2. **Google Cloud Setup**
   - Create a Google Cloud project
   - Enable Google Sheets API
   - Enable Google Drive API
   - Create a service account and download credentials

3. **Environment Configuration**
   Create `.env.local` with the following variables:
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
   ```

## ⚙️ Configuration

### Google Sheets Structure

The system expects the following column structure in your Google Sheets:

| Column | Field | Description |
|--------|-------|-------------|
| A | Folder ID | Google Drive folder ID |
| B | Client Code | Unique client identifier |
| C | Client Name | Short client name |
| D | Full Name | Complete client name |
| E | Active | TRUE/FALSE status |
| F | ACOS Goal | Advertising Cost of Sales goal |
| G | TACOS Goal | Total Advertising Cost of Sales goal |

### File Processing

The system supports the following file formats:
- **Excel**: .xlsx, .xls files with multiple tabs
- **CSV**: Comma-separated values
- **Google Sheets**: Direct integration with Google Sheets

## 📖 Usage

### Getting Started

1. **Login**: Use your email and password to access the system
2. **Dashboard**: View your client list and system overview
3. **Add Clients**: Use the "Add Client" button to create new client records
4. **File Processing**: Upload Excel/CSV files for data analysis
5. **Settings**: Configure your preferences in the Settings page
6. **Help**: Access the comprehensive user guide at `/guide`

### Key Features

#### Client Management
- Add new clients with required information
- Edit existing client details and goals
- Search and filter clients
- Toggle active/inactive status
- Automatic Google Sheets synchronization

#### File Processing
- Upload Excel, CSV, or Google Sheets files
- Automatic parsing of profit & loss data
- Product performance analysis
- Payout tracking
- Error handling and validation

#### Settings & Preferences
- Theme customization (Light/Dark/Auto)
- Notification preferences
- Display settings
- Integration configuration

## 🔌 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User authentication |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/reset-password` | Password reset |

### Client Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | Retrieve all clients |
| POST | `/api/clients` | Add new client |
| PATCH | `/api/clients` | Update client status |
| PUT | `/api/clients` | Update client information |

### File Processing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/file/[id]` | Process file from Google Drive |

### Audit Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | Retrieve audit logs |
| POST | `/api/audit` | Add audit log entry |

For detailed API documentation, see [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md).

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- __tests__/e2e/          # E2E tests
npm test -- __tests__/unit/         # Unit tests
npm test -- __tests__/integration/  # Integration tests

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- **538 tests** across 22 test suites
- **E2E Tests**: API endpoint testing
- **Unit Tests**: Individual function testing
- **Integration Tests**: Component and service testing

### Test Categories

1. **Authentication Tests**: Login, logout, password reset
2. **Client Management Tests**: CRUD operations, validation
3. **File Processing Tests**: Upload, parsing, error handling
4. **Audit Tests**: Logging, retrieval
5. **Integration Tests**: End-to-end workflows

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Deployment Platforms

- **Vercel** (Recommended): Optimized for Next.js
- **Netlify**: Alternative deployment option
- **AWS**: Enterprise deployments

### Environment Considerations

- Set `NODE_ENV=production`
- Configure production Firebase project
- Set up production Google Cloud credentials
- Configure domain and SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style

## 📞 Support

### Getting Help

1. **User Guide**: Visit `/guide` for comprehensive help
2. **Settings**: Configure system preferences at `/settings`
3. **Documentation**: Check [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)
4. **Troubleshooting**: See the troubleshooting section in the user guide

### Common Issues

- **Authentication Problems**: Verify Firebase configuration
- **Google Sheets Issues**: Check service account permissions
- **File Processing Errors**: Ensure file format compatibility
- **Performance Issues**: Monitor API rate limits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- **Next.js** for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Firebase** for authentication and database services
- **Google Cloud** for APIs and services
- **Jest** for comprehensive testing framework

## 📈 Version History

### v1.0.0 (Current)
- ✅ Initial release with core functionality
- ✅ Client management with Google Sheets integration
- ✅ File processing for Excel, CSV, and Google Sheets
- ✅ Comprehensive authentication and security
- ✅ Responsive UI with modern design
- ✅ Complete test coverage (538 tests)
- ✅ Settings and user guide integration
- ✅ Enhanced navigation and UI improvements
- ✅ Robust error handling and validation
- ✅ Download verification and processing validation

---

**Cambria Dashboard** - Empowering Amazon sellers with comprehensive client management and data processing capabilities.
