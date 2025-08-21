# Testing Documentation

This document provides comprehensive information about the testing setup and test coverage for the Cambria Portal application.

## 🧪 Test Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Running Tests

#### All Tests
```bash
npm test
```

#### Watch Mode (Development)
```bash
npm run test:watch
```

#### Coverage Report
```bash
npm run test:coverage
```

#### CI Mode (No Watch)
```bash
npm run test:ci
```

## 📁 Test Structure

```
__tests__/
├── lib/
│   ├── auth.test.ts              # Authentication utilities
│   └── reset-codes.test.ts       # Reset codes storage
├── app/
│   ├── api/auth/
│   │   ├── login.test.ts         # Login API route
│   │   ├── forgot-password.test.ts # Forgot password API
│   │   └── reset-password.test.ts # Reset password API
│   └── login.test.tsx            # Login page component
└── components/                   # Component tests (future)
```

## 🎯 Test Coverage

### Authentication Utilities (`lib/auth.test.ts`)

#### Password Hashing & Verification
- ✅ Hash passwords with salt and pepper
- ✅ Generate unique hashes for same password
- ✅ Handle empty and special character passwords
- ✅ Verify correct passwords
- ✅ Reject incorrect passwords
- ✅ Handle case sensitivity
- ✅ Handle missing salt/hash gracefully

#### Token Generation & Validation
- ✅ Generate tokens of specified length
- ✅ Generate unique tokens
- ✅ Create session tokens with user data
- ✅ Validate correct session tokens
- ✅ Reject invalid token formats
- ✅ Reject tokens with wrong hash
- ✅ Reject expired tokens (>24 hours)
- ✅ Accept valid tokens (<24 hours)
- ✅ Handle malformed tokens gracefully

### Reset Codes Storage (`lib/reset-codes.test.ts`)

#### Code Storage & Retrieval
- ✅ Store reset codes with expiration
- ✅ Set 15-minute expiration time
- ✅ Overwrite existing codes for same email
- ✅ Retrieve stored reset codes
- ✅ Return null for non-existent emails
- ✅ Clean up expired codes automatically
- ✅ Handle file read errors gracefully

#### Code Verification & Management
- ✅ Verify correct reset codes
- ✅ Reject incorrect codes
- ✅ Reject expired codes
- ✅ Remove expired codes after verification
- ✅ Get user ID for valid codes
- ✅ Handle missing user IDs gracefully
- ✅ List all reset codes for debugging

### Login API Route (`app/api/auth/login.test.ts`)

#### Successful Authentication
- ✅ Authenticate valid user credentials
- ✅ Set session cookie on success
- ✅ Return user data on success
- ✅ Log successful login attempts
- ✅ Work with mock user for testing

#### Input Validation
- ✅ Reject invalid email format
- ✅ Reject missing email
- ✅ Reject missing password
- ✅ Reject empty credentials
- ✅ Handle malformed JSON requests

#### Error Handling
- ✅ Reject incorrect passwords
- ✅ Reject inactive users
- ✅ Reject users without password hash
- ✅ Reject users without password salt
- ✅ Handle password verification errors
- ✅ Handle malformed JSON gracefully

### Forgot Password API (`app/api/auth/forgot-password.test.ts`)

#### Successful Password Reset Request
- ✅ Send reset code for valid user
- ✅ Generate 6-digit reset codes
- ✅ Include reset URL in email
- ✅ Log successful requests
- ✅ Work with mock user for testing

#### Security Features
- ✅ Handle non-existent users gracefully (no enumeration)
- ✅ Handle inactive users gracefully
- ✅ Log failed attempts for security
- ✅ Handle Firebase errors gracefully

#### Error Handling
- ✅ Reject missing email
- ✅ Reject empty email
- ✅ Handle email sending failures
- ✅ Handle email sending exceptions
- ✅ Handle malformed JSON requests

### Reset Password API (`app/api/auth/reset-password.test.ts`)

#### Successful Password Reset
- ✅ Reset password with valid code
- ✅ Hash new password before storing
- ✅ Remove used reset code
- ✅ Log successful resets
- ✅ Work with mock user for testing

#### Input Validation
- ✅ Reject missing email/code/password
- ✅ Reject weak passwords (<8 chars)
- ✅ Validate all required fields

#### Error Handling
- ✅ Reject invalid reset codes
- ✅ Reject expired reset codes
- ✅ Reject inactive users
- ✅ Handle Firebase update errors
- ✅ Handle Firebase lookup errors
- ✅ Handle malformed JSON requests
- ✅ Log failed attempts for security

### Login Page Component (`app/login.test.tsx`)

#### Initial Render
- ✅ Render login form with all fields
- ✅ Show default credentials section
- ✅ Show forgot password link

#### Form Validation
- ✅ Require email and password fields
- ✅ Have correct input types
- ✅ Have proper autocomplete attributes

#### User Interaction
- ✅ Update form state when typing
- ✅ Show loading state during submission
- ✅ Handle form submission with Enter key

#### Authentication Flow
- ✅ Redirect on successful login
- ✅ Send correct login data
- ✅ Show error messages on failure
- ✅ Handle network errors gracefully
- ✅ Clear errors on new attempts

#### Session Management
- ✅ Redirect if already authenticated
- ✅ Handle session check errors gracefully

#### Accessibility
- ✅ Have proper form labels
- ✅ Have proper button text
- ✅ Have proper focus management

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: jsdom for React testing
- **Coverage**: 70% threshold for all metrics
- **Path Mapping**: Supports `@/` aliases
- **Test Patterns**: `__tests__/**/*` and `*.{test,spec}.{js,jsx,ts,tsx}`

### Setup File (`jest.setup.js`)
- **Testing Library**: Jest DOM matchers
- **Mocks**: Next.js router, fetch, console methods
- **Environment**: Test environment variables

## 📊 Coverage Requirements

### Global Coverage Threshold: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Exclusions
- Type definition files (`*.d.ts`)
- Node modules
- Next.js build files
- Configuration files

## 🚀 Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the requirement
3. **Comment each test** with the specific requirement being tested
4. **Follow AAA pattern**: Arrange, Act, Assert

### Mocking Strategy
1. **Mock external dependencies** (APIs, databases, file system)
2. **Use realistic mock data** that matches production
3. **Reset mocks** between tests using `beforeEach`
4. **Verify mock calls** to ensure correct interaction

### Error Testing
1. **Test both success and failure scenarios**
2. **Verify error messages** are user-friendly
3. **Test edge cases** (empty inputs, malformed data)
4. **Ensure graceful degradation** on errors

### Security Testing
1. **Test authentication flows** thoroughly
2. **Verify input validation** prevents attacks
3. **Test rate limiting** and security measures
4. **Ensure sensitive data** is not exposed

## 🐛 Debugging Tests

### Common Issues
1. **Mock not working**: Check import paths and mock setup
2. **Async test failures**: Use `waitFor` for async operations
3. **Component not rendering**: Check for missing dependencies
4. **API route errors**: Verify request/response mocking

### Debug Commands
```bash
# Run specific test file
npm test auth.test.ts

# Run tests in verbose mode
npm test -- --verbose

# Run tests with coverage for specific file
npm test -- --coverage --collectCoverageFrom="lib/auth.ts"

# Debug failing test
npm test -- --testNamePattern="should verify correct password"
```

## 📈 Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test:ci"
```

## 🔄 Test Maintenance

### Regular Tasks
1. **Update tests** when adding new features
2. **Review coverage reports** monthly
3. **Refactor tests** for better maintainability
4. **Update mocks** when dependencies change

### Adding New Tests
1. **Follow existing patterns** and naming conventions
2. **Add comprehensive coverage** for new functionality
3. **Include edge cases** and error scenarios
4. **Update documentation** with new test requirements

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new features or fixing bugs:

1. **Write tests first** (TDD approach)
2. **Ensure all tests pass** before submitting
3. **Maintain or improve coverage** thresholds
4. **Update this documentation** if needed
5. **Follow the established patterns** and conventions
