#!/bin/bash

# Build Shopify Widgets Script
# Builds the widget JavaScript from React components

set -e

echo "🔨 Building Shopify Widgets"
echo "================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Build chatbot widget
echo "▶️  Building chatbot widget..."
cd widgets/chatbot-widget

if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install --silent
    
    echo "Building widget..."
    npm run build
    
    if [ -f "dist/chatbot-widget.js" ]; then
        echo "✅ Chatbot widget built successfully"
        
        # Copy to extension assets
        echo "📦 Copying to extension assets..."
        cp dist/chatbot-widget.js ../../extensions/closelook-widgets-extension/assets/
        
        echo "✅ Widget copied to extension"
    else
        echo "❌ Build failed - dist/chatbot-widget.js not found"
        exit 1
    fi
else
    echo "❌ package.json not found in widgets/chatbot-widget"
    exit 1
fi

cd "$PROJECT_ROOT"

# Build try-on widget
echo ""
echo "▶️  Building try-on widget..."
cd widgets/try-on-widget

if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install --silent
    
    echo "Building widget..."
    npm run build
    
    if [ -f "dist/try-on-widget.js" ]; then
        echo "✅ Try-on widget built successfully"
        
        # Copy to extension assets
        echo "📦 Copying to extension assets..."
        cp dist/try-on-widget.js ../../extensions/closelook-widgets-extension/assets/
        
        echo "✅ Widget copied to extension"
    else
        echo "❌ Build failed - dist/try-on-widget.js not found"
        exit 1
    fi
else
    echo "❌ package.json not found in widgets/try-on-widget"
    exit 1
fi

cd "$PROJECT_ROOT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All widgets built successfully!"
echo ""
echo "Files created:"
echo "  - extensions/closelook-widgets-extension/assets/chatbot-widget.js"
echo "  - extensions/closelook-widgets-extension/assets/try-on-widget.js"
echo ""
echo "Next step: Deploy extension with 'shopify app deploy'"
echo ""

