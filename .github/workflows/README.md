# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing and CI/CD.

## Automated Tests Workflow (`test.yml`)

### Triggers
- Push to `main` or `master` branch
- Pull requests to `main` or `master` branch

### What it does

#### Test Job
1. **Setup**: Uses Ubuntu latest with Node.js 18.x and 20.x (matrix strategy)
2. **Dependencies**: Installs npm dependencies with caching
3. **Linting**: Runs ESLint to check code quality
4. **Type Checking**: Runs TypeScript compiler to check types
5. **Unit Tests**: Runs Jest tests with coverage reporting
6. **Coverage Upload**: Uploads test coverage to Codecov
7. **Build**: Ensures the application builds successfully

#### Security Job
1. **Security Audit**: Runs `npm audit` to check for vulnerabilities
2. **Dependencies**: Only runs after the test job completes successfully

### Test Coverage Requirements
The workflow enforces minimum coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Environment Variables
- `CI=true`: Ensures tests run in CI mode
- Uses npm caching for faster builds

### Dependencies
- Node.js 18.x and 20.x
- npm packages from `package-lock.json`
- Jest for testing
- ESLint for linting
- TypeScript for type checking
