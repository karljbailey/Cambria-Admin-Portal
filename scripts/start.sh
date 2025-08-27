#!/bin/sh

# Cambria Dashboard Docker Startup Script

set -e

echo "🚀 Starting Cambria Dashboard..."

# Check if required environment variables are set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    echo "⚠️  NODE_ENV not set, defaulting to production"
fi

if [ -z "$PORT" ]; then
    export PORT=3000
    echo "⚠️  PORT not set, defaulting to 3000"
fi

if [ -z "$HOSTNAME" ]; then
    export HOSTNAME=0.0.0.0
    echo "⚠️  HOSTNAME not set, defaulting to 0.0.0.0"
fi

# Ensure telemetry is disabled
export NEXT_TELEMETRY_DISABLED=1

# Check if server.js exists (standalone mode)
if [ -f "server.js" ]; then
    echo "✅ Found server.js, starting in standalone mode"
    exec node server.js
else
    echo "❌ server.js not found. Make sure to build with 'npm run build:docker'"
    echo "📁 Current directory contents:"
    ls -la
    exit 1
fi
