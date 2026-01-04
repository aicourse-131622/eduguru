#!/bin/bash

# EduGuru Deployment Script
# Usage: ./deploy.sh [environment]

ENV=${1:-production}
echo "🚀 Starting deployment for environment: $ENV"

# 1. Install Dependencies (Full install needed for build tools)
echo "📚 Installing dependencies..."
npm install

# 2. Fix Permissions (Crucial for some VPS environments)
echo "🔧 Fixing permissions..."
if [ -d "node_modules/.bin" ]; then
  chmod +x node_modules/.bin/*
fi

# Fix specifically for esbuild (Vite dependency)
if [ -f "node_modules/@esbuild/linux-x64/bin/esbuild" ]; then
  echo "🔧 Fixing esbuild permissions..."
  chmod +x node_modules/@esbuild/linux-x64/bin/esbuild
fi

# 3. Build Frontend
echo "🏗️  Building frontend..."
npm run build

# 4. Check Build
if [ ! -d "dist" ]; then
  echo "❌ Build failed! 'dist' directory not found."
  exit 1
fi

# 5. Restart Application
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
    # Check if app is running
    if pm2 list | grep -q "eduguru"; then
        pm2 reload eduguru --update-env
        echo "✅ Application reloaded."
    else
        # Try to use ecosystem, fallback to simple start
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js --env $ENV
        else
            pm2 start server.js --name eduguru
        fi
        echo "✅ Application started."
    fi
    
    pm2 save
else
    echo "⚠️  PM2 not found. Starting with node..."
    nohup npm run start:prod > app.log 2>&1 &
    echo "✅ Application started in background."
fi

echo "✨ Deployment successfully completed!"
echo "📊 Logs available at: pm2 logs eduguru"
