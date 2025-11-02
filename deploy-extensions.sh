#!/bin/bash

echo "🚀 Deploying Shopify Theme App Extensions"
echo "=========================================="

# Change to project directory
cd /Users/gautam/Documents/VTon

echo "📁 Current directory: $(pwd)"
echo "📦 Extensions found:"
ls -la shopify-app/extensions/

echo ""
echo "⚠️  IMPORTANT: Make sure you've enabled 'Development Store Preview' in Partner Dashboard:"
echo "   1. Go to Shopify Partner Dashboard"
echo "   2. Apps → Your App → Extensions"
echo "   3. Toggle ON 'Development Store Preview' for both extensions"
echo ""

read -p "Have you enabled Development Store Preview? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please enable Development Store Preview first, then run this script again."
    exit 1
fi

echo ""
echo "🔧 Step 1: Clean Shopify CLI config (if needed)"
echo "rm -rf ~/Library/Preferences/shopify-cli-*"

echo ""
echo "🚀 Step 2: Deploy extensions (test deployment)"
echo "shopify app deploy --no-release --force"

echo ""
echo "📊 Step 3: Check deployment status"
echo "shopify app versions list"

echo ""
echo "✨ Step 4: If successful, release to production"
echo "shopify app release"

echo ""
echo "🧪 Step 5: Test locally"
echo "shopify app dev"

echo ""
echo "🎯 Ready to deploy! Run these commands in your terminal:"
echo ""
echo "1. cd /Users/gautam/Documents/VTon"
echo "2. shopify app deploy --no-release --force"
echo "3. shopify app versions list"
echo "4. shopify app release (if deployment successful)"
echo "5. shopify app dev (to test locally)"
echo ""

# Make script executable
chmod +x deploy-extensions.sh
