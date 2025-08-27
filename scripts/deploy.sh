#!/bin/bash

# Cambria Dashboard Docker Deployment Script

set -e

echo "🐳 Deploying Cambria Dashboard with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating a template..."
    cat > .env << EOF
# Cambria Dashboard Environment Variables
# Please fill in your actual values

# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Email Configuration
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password

# Application Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
    print_warning "Please edit .env file with your actual configuration values"
    print_warning "Then run this script again"
    exit 1
fi

print_status "Environment file found"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans || true

# Clean up old images (optional)
read -p "Do you want to clean up old Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleaning up old images..."
    docker system prune -f || true
fi

# Build and start containers
print_status "Building and starting containers..."
docker-compose up -d --build

# Wait for container to be healthy
print_status "Waiting for container to be healthy..."
timeout=120
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "healthy"; then
        print_status "Container is healthy!"
        break
    fi
    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    print_error "Container failed to become healthy within $timeout seconds"
    print_status "Checking container logs..."
    docker-compose logs --tail=50
    exit 1
fi

# Show container status
print_status "Container status:"
docker-compose ps

# Show logs
print_status "Recent logs:"
docker-compose logs --tail=20

print_status "Deployment completed successfully!"
print_status "Application should be available at: http://localhost:3000"
print_status "To view logs: docker-compose logs -f"
print_status "To stop: docker-compose down"
