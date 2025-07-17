#!/bin/bash

# Start script for subscription management server
echo "🚀 Starting Subscription Management Server..."

# Set working directory
cd /app

# Ensure data directory exists for persistent storage
if [ ! -d "/app/data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p /app/data
fi

# Set database path environment variable
export DATABASE_PATH="/app/data/database.sqlite"

# Database initialization and migration
if [ ! -f "$DATABASE_PATH" ]; then
    echo "🔧 Initializing database..."
    node server/db/init.js || {
        echo "❌ Database initialization failed!"
        exit 1
    }
    echo "✅ Database initialized successfully!"
else
    echo "📂 Running database migrations..."
    node server/db/migrate.js || {
        echo "❌ Database migrations failed!"
        exit 1
    }
    echo "✅ Database migrations completed!"
fi

# Environment validation
if [ -z "$API_KEY" ]; then
    echo "⚠️  WARNING: API_KEY not set. Server functionality may be limited."
fi

if [ -z "$TIANAPI_KEY" ]; then
    echo "ℹ️  INFO: TIANAPI_KEY not set. Exchange rate updates disabled."
fi

# Start the application server
echo "🌟 Starting server on port ${PORT:-3001}..."
exec node server/server.js
