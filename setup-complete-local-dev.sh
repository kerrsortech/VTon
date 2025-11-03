#!/bin/bash

# Complete Automated Local Development Setup
# This script sets up everything for local development

set -e

echo "🚀 Complete Local Development Setup"
echo "===================================="
echo ""

# Check ngrok authentication
if ! ngrok config check > /dev/null 2>&1; then
    echo "❌ ngrok requires authentication"
    echo ""
    echo "📋 Quick Setup (One-time):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Sign up for free ngrok account:"
    echo "   https://dashboard.ngrok.com/signup"
    echo ""
    echo "2. Get your authtoken:"
    echo "   https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    echo "3. Run this command (replace YOUR_TOKEN with your actual token):"
    echo "   ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    echo "4. Then run this script again!"
    echo ""
    exit 1
fi

echo "✅ ngrok is authenticated"
echo ""

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Starting Next.js server..."
    cd /Users/gautam/Documents/VTon
    npm run dev:local > /tmp/nextjs-local.log 2>&1 &
    sleep 5
    echo "✅ Next.js started"
else
    echo "✅ Next.js is running on port 3000"
fi

# Kill existing ngrok
pkill -f "ngrok http" 2>/dev/null || true
sleep 2

# Start ngrok
echo ""
echo "📡 Starting ngrok tunnel..."
nohup ngrok http 3000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "✅ ngrok started (PID: $NGROK_PID)"
echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Get tunnel URL
NGROK_URL=""
for i in {1..5}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = [t for t in data.get('tunnels', []) if t.get('proto') == 'https']
    if tunnels:
        print(tunnels[0]['public_url'])
except:
    pass
" 2>/dev/null)
    
    if [ -n "$NGROK_URL" ]; then
        break
    fi
    sleep 2
done

if [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL"
    echo "Check /tmp/ngrok.log for errors"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 YOUR TUNNEL URL (copy this):"
echo ""
echo "   $NGROK_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Configure Extension Backend URL:"
echo ""
echo "1. Open your Shopify admin:"
echo "   https://vt-test-5.myshopify.com/admin/themes/149121138874/editor"
echo ""
echo "2. Click 'App Embeds' → 'Closelook AI Widgets'"
echo ""
echo "3. Set 'Backend API URL' to:"
echo "   $NGROK_URL"
echo ""
echo "4. Click 'Save'"
echo ""
echo "5. Press 'p' in your Shopify CLI terminal to preview!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tip: The tunnel URL is saved to /tmp/ngrok-url.txt"
echo "$NGROK_URL" > /tmp/ngrok-url.txt
echo ""
echo "✅ Everything is running! Edit your code and refresh browser to see changes!"

