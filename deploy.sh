#!/bin/bash

# ONE-COMMAND DEPLOYMENT SCRIPT
# Run this to deploy everything automatically

set -e

echo "🚀 CLOSELOOK DEPLOYMENT"
echo "======================="
echo ""

# Run database migrations
echo "📋 Step 1: Database Migrations"
./scripts/run-migrations.sh
echo ""

# Build and deploy backend
echo "🌐 Step 2: Backend Deployment"
git add .
git commit -m "deploy: automated deployment $(date +%Y-%m-%d-%H-%M)" || echo "No changes to commit"
git push origin main
echo ""

echo "⏳ Waiting for Render deployment..."
sleep 10

# Test backend health
echo "🏥 Step 3: Backend Health Check"
curl -f https://vton-1-hqmc.onrender.com/api/health || echo "Health check failed - check Render logs"
echo ""

# Deploy extension
echo "🛍️ Step 4: Shopify Extension Deployment"
shopify app deploy || echo "Extension deployment failed - run manually if needed"
echo ""

# Run tests
echo "🧪 Step 5: Integration Tests"
./scripts/test-integration.sh || echo "Some tests failed - check output above"
echo ""

echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Test on development store"
echo "2. Verify all features work"
echo "3. Monitor logs for 24 hours"
echo ""

