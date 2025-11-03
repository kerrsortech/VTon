#!/bin/bash

# Local Development Script for Shopify Plugin
# This script sets up local development environment with Shopify CLI tunneling

set -e

echo "🚀 Starting Local Development Environment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Shopify CLI is installed
if ! command -v shopify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Shopify CLI not found${NC}"
    echo "Installing Shopify CLI..."
    npm install -g @shopify/cli @shopify/theme || {
        echo "❌ Failed to install Shopify CLI. Please install manually:"
        echo "   npm install -g @shopify/cli @shopify/theme"
        echo "   Or: brew install shopify-cli"
        exit 1
    }
fi

echo -e "${GREEN}✅ Shopify CLI found${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "Creating .env.local from .env (if exists) or creating template..."
    
    if [ -f .env ]; then
        cp .env .env.local
        echo "✅ Copied .env to .env.local"
    else
        cat > .env.local << 'EOF'
# Local Development Environment Variables
# Copy your production .env values here and update URLs for local development

# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers,read_themes
SHOPIFY_SESSION_SECRET=generate_a_random_secret_key_for_local

# Backend URL - Shopify CLI will handle tunneling automatically
# But you can also use ngrok if preferred
# LOCAL_BACKEND_URL=http://localhost:3000

# AI Services
REPLICATE_API_TOKEN=your_replicate_token
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Database (use your local/dev database URL)
DATABASE_URL=your_database_url

# Optional
ENABLE_STRUCTURED_LOGGING=true
EOF
        echo "✅ Created .env.local template"
        echo -e "${YELLOW}⚠️  Please edit .env.local with your actual values${NC}"
    fi
    echo ""
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install || pnpm install || yarn install
fi

echo ""
echo -e "${BLUE}📋 Starting Services...${NC}"
echo "   • Next.js server will run on http://localhost:3000"
echo "   • Shopify CLI will create a tunnel and start dev mode"
echo "   • Your extension will be available in your development store"
echo ""

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo "Please stop the process using port 3000 or use a different port"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🎯 Starting Next.js development server..."
echo "   (This will run in the background)"
echo ""

# Start Next.js in background
npm run dev:local > /tmp/nextjs-dev.log 2>&1 &
NEXT_PID=$!

# Wait for Next.js to start
echo "⏳ Waiting for Next.js to start..."
sleep 5

# Check if Next.js started successfully
if ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "❌ Next.js failed to start. Check /tmp/nextjs-dev.log for errors"
    exit 1
fi

echo -e "${GREEN}✅ Next.js server started (PID: $NEXT_PID)${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $NEXT_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "🛍️  Starting Shopify CLI dev mode..."
echo "   (This will prompt you to select a development store)"
echo ""
echo -e "${YELLOW}📌 IMPORTANT:${NC}"
echo "   1. Select your development store when prompted"
echo "   2. Shopify CLI will create a secure tunnel to your local server"
echo "   3. Your extension will be available in the development store"
echo "   4. Changes to extension files will auto-reload"
echo ""
echo "   To view Next.js logs: tail -f /tmp/nextjs-dev.log"
echo ""

# Start Shopify CLI dev mode (this is interactive, so we can't background it)
shopify app dev

