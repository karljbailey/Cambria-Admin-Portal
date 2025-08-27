# 🐳 Cambria Dashboard - Docker Deployment Guide

This guide provides instructions for deploying the Cambria Dashboard using Docker.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Environment variables configured

## 🚀 Quick Start

### 1. Production Deployment

```bash
# Build and start the production container
docker-compose up -d

# View logs
docker-compose logs -f cambria-dashboard

# Stop the container
docker-compose down
```

### 2. Development Deployment

```bash
# Build and start the development container with hot reloading
docker-compose --profile dev up -d

# View logs
docker-compose logs -f cambria-dashboard-dev

# Stop the container
docker-compose down
```

## 🔧 Manual Docker Commands

### Build the Image

```bash
# Production build
docker build -t cambria-dashboard:latest .

# Development build
docker build -f Dockerfile.dev -t cambria-dashboard:dev .
```

### Run the Container

```bash
# Production
docker run -d \
  --name cambria-dashboard \
  -p 3000:3000 \
  --env-file .env \
  cambria-dashboard:latest

# Development
docker run -d \
  --name cambria-dashboard-dev \
  -p 3001:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  --env-file .env.local \
  cambria-dashboard:dev
```

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following variables:

```env
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
```

## 🔍 Health Checks

The container includes health checks that monitor the application:

- **Endpoint**: `/api/auth/session`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3
- **Start Period**: 5 seconds

Check container health:

```bash
docker ps
docker inspect cambria-dashboard
```

## 📊 Monitoring

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f cambria-dashboard

# View last 100 lines
docker-compose logs --tail=100
```

### Container Stats

```bash
# View resource usage
docker stats cambria-dashboard

# View detailed container info
docker inspect cambria-dashboard
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Use a different port
   docker run -p 3001:3000 cambria-dashboard:latest
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Build Failures**
   ```bash
   # Clean build cache
   docker system prune -a
   
   # Rebuild without cache
   docker build --no-cache -t cambria-dashboard:latest .
   ```

4. **Environment Variables Not Loading**
   ```bash
   # Check environment variables
   docker exec cambria-dashboard env
   
   # Verify .env file format
   cat .env
   ```

### Debug Mode

```bash
# Run container in interactive mode
docker run -it --rm \
  -p 3000:3000 \
  --env-file .env \
  cambria-dashboard:latest /bin/sh

# Access running container
docker exec -it cambria-dashboard /bin/sh
```

## 🚀 Production Deployment

### Using Docker Compose

```bash
# Start in detached mode
docker-compose up -d

# Scale to multiple instances
docker-compose up -d --scale cambria-dashboard=3
```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml cambria
```

### Using Kubernetes

```bash
# Apply deployment
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

## 🔒 Security Considerations

1. **Non-root User**: Container runs as non-root user `nextjs`
2. **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
3. **Health Checks**: Monitors application health automatically
4. **Environment Variables**: Sensitive data stored in environment variables
5. **Network Isolation**: Uses custom Docker network

## 📈 Performance Optimization

1. **Multi-stage Build**: Reduces final image size
2. **Layer Caching**: Optimizes build times
3. **Standalone Output**: Next.js standalone mode for better performance
4. **Alpine Linux**: Lightweight base image
5. **Production Dependencies**: Only production dependencies in final image

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t cambria-dashboard:${{ github.sha }} .
      
      - name: Deploy to server
        run: |
          docker-compose down
          docker-compose up -d
```

## 📝 Additional Commands

```bash
# Update application
docker-compose pull
docker-compose up -d

# Backup data
docker exec cambria-dashboard tar -czf /tmp/backup.tar.gz /app/data

# Restore data
docker cp backup.tar.gz cambria-dashboard:/tmp/
docker exec cambria-dashboard tar -xzf /tmp/backup.tar.gz -C /app/

# View container resources
docker stats

# Clean up unused resources
docker system prune -f
```

## 🆘 Support

For issues related to Docker deployment:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure ports are available
4. Check Docker daemon status: `docker info`

---

**Note**: Always test your deployment in a staging environment before deploying to production.



