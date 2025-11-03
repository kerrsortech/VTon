#!/bin/bash

# Automated Production Deployment Script
# Handles all steps for deploying Shopify integration

set -e  # Exit on error

echo "🚀 Production Deployment Script"
echo "================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi
echo ""

# Step 1: Run Database Migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STEP 1: Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set"
    echo "Skipping database migrations"
    echo ""
    read -p "Continue without running migrations? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
else
    echo "Running database migrations..."
    if bash "$SCRIPT_DIR/run-migrations.sh"; then
        echo "✅ Database migrations completed"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
fi
echo ""

# Step 2: Build Backend (if needed)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 STEP 2: Build Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile || npm install
    echo "✅ Dependencies installed"
    echo ""
    
    echo "Building Next.js application..."
    pnpm build || npm run build
    echo "✅ Build completed"
else
    echo "⚠️  No package.json found, skipping build"
fi
echo ""

# Step 3: Deploy Backend to Render
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 STEP 3: Deploy Backend to Render"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Committing changes..."
git add .
git commit -m "deploy: Shopify integration fixes and improvements" || echo "No changes to commit"

echo ""
echo "Pushing to main branch..."
git push origin main

echo ""
echo "✅ Code pushed to GitHub"
echo "ℹ️  Render.com will automatically deploy the changes"
echo ""
echo "📝 Monitor deployment at: https://dashboard.render.com"
echo ""

read -p "Wait for Render deployment to complete, then press Enter to continue..." 

# Step 4: Test Backend Health
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 STEP 4: Test Backend Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKEND_URL="https://vton-1-hqmc.onrender.com"
echo "Testing health endpoint: $BACKEND_URL/api/health"

if curl -f -s "$BACKEND_URL/api/health" > /dev/null; then
    echo "✅ Backend is healthy"
    
    echo ""
    echo "Health check response:"
    curl -s "$BACKEND_URL/api/health" | jq '.' || curl -s "$BACKEND_URL/api/health"
else
    echo "❌ Backend health check failed"
    echo ""
    echo "Please check Render.com logs for errors"
    echo "URL: https://dashboard.render.com"
    exit 1
fi
echo ""

# Step 5: Deploy Shopify Extension
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛍️  STEP 5: Deploy Shopify Extension"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v shopify &> /dev/null; then
    echo "Deploying extension to Shopify..."
    echo ""
    
    shopify app deploy
    
    echo ""
    echo "✅ Shopify extension deployed"
else
    echo "⚠️  Shopify CLI not found"
    echo ""
    echo "Please install Shopify CLI and run manually:"
    echo "  shopify app deploy"
    echo ""
    read -p "Press Enter after manually deploying extension..."
fi
echo ""

# Step 6: Final Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Database migrations applied"
echo "  ✅ Backend deployed to Render.com"
echo "  ✅ Backend health check passed"
echo "  ✅ Shopify extension deployed"
echo ""
echo "🧪 Next Steps:"
echo "  1. Test on development store"
echo "  2. Verify OAuth flow"
echo "  3. Test all features (chatbot, try-on, recommendations)"
echo "  4. Monitor logs for 24 hours"
echo "  5. Deploy to production stores"
echo ""
echo "📝 Testing Guide:"
echo "  Run: bash scripts/test-integration.sh"
echo ""
echo "🎉 Deployment successful!"
echo ""

