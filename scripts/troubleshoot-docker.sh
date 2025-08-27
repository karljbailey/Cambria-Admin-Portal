#!/bin/bash

# Cambria Dashboard Docker Troubleshooting Script

set -e

echo "🔧 Cambria Dashboard Docker Troubleshooting"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check Docker installation
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_status "Docker and Docker Compose are installed"

# Check Docker daemon
print_info "Checking Docker daemon..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker daemon is not running"
    print_info "Please start Docker Desktop or run: sudo systemctl start docker"
    exit 1
fi

print_status "Docker daemon is running"

# Check available resources
print_info "Checking available resources..."
docker system df

# Check if containers are running
print_info "Checking running containers..."
if docker ps | grep -q cambria; then
    print_status "Cambria containers are running"
    docker ps --filter "name=cambria"
else
    print_warning "No Cambria containers are running"
fi

# Check container logs
print_info "Checking container logs..."
if docker-compose logs --tail=20 2>/dev/null; then
    print_status "Container logs retrieved"
else
    print_warning "No container logs available"
fi

# Check port availability
print_info "Checking port 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    print_warning "Port 3000 is in use"
    lsof -i :3000
else
    print_status "Port 3000 is available"
fi

# Check environment file
print_info "Checking environment file..."
if [ -f ".env" ]; then
    print_status ".env file exists"
    if [ -s ".env" ]; then
        print_status ".env file is not empty"
    else
        print_warning ".env file is empty"
    fi
else
    print_warning ".env file does not exist"
fi

# Check Docker images
print_info "Checking Docker images..."
if docker images | grep -q cambria; then
    print_status "Cambria images found"
    docker images | grep cambria
else
    print_warning "No Cambria images found"
fi

# Check Docker networks
print_info "Checking Docker networks..."
if docker network ls | grep -q cambria; then
    print_status "Cambria network found"
    docker network ls | grep cambria
else
    print_warning "No Cambria network found"
fi

# Check file permissions
print_info "Checking file permissions..."
if [ -r "Dockerfile" ] && [ -r "docker-compose.yml" ]; then
    print_status "Docker files are readable"
else
    print_error "Docker files are not readable"
fi

# Check Node.js version compatibility
print_info "Checking Node.js version compatibility..."
if [ -f "package.json" ]; then
    print_status "package.json found"
    # Extract Node.js version requirement if specified
    if grep -q '"node"' package.json; then
        print_info "Node.js version requirement found in package.json"
    fi
fi

# Provide common solutions
print_info "Common solutions for Docker issues:"

echo "1. If containers won't start:"
echo "   docker-compose down --remove-orphans"
echo "   docker system prune -f"
echo "   docker-compose up -d --build"

echo "2. If port 3000 is in use:"
echo "   lsof -i :3000"
echo "   kill -9 <PID>"
echo "   Or change port in docker-compose.yml"

echo "3. If environment variables are missing:"
echo "   Copy .env.example to .env and fill in values"

echo "4. If build fails:"
echo "   docker build --no-cache -t cambria-dashboard ."

echo "5. To view real-time logs:"
echo "   docker-compose logs -f"

echo "6. To access container shell:"
echo "   docker exec -it cambria-dashboard /bin/sh"

print_status "Troubleshooting complete!"
