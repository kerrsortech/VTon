#!/bin/bash

# Automated Local Development Setup
# Sets up everything for local testing - NO manual steps required!

set -e

echo "🚀 Automated Local Development Setup"
echo "===================================="
echo ""

# Ensure Next.js is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Starting Next.js server..."
    cd /Users/gautam/Documents/VTon
    nohup npm run dev:local > /tmp/nextjs-local.log 2>&1 &
    sleep 5
    echo "✅ Next.js started"
else
    echo "✅ Next.js is running on port 3000"
fi

# Kill existing cloudflared tunnels to port 3000
pkill -f "cloudflared tunnel --url http://localhost:3000" 2>/dev/null || true
sleep 2

# Start cloudflared tunnel
echo ""
echo "📡 Starting tunnel (this is free, no signup required)..."
echo ""

# Start cloudflared and capture output
cd /Users/gautam/Documents/VTon
cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared-output.log 2>&1 &
CF_PID=$!
echo "✅ Tunnel process started (PID: $CF_PID)"

# Wait for tunnel to establish
echo "⏳ Waiting for tunnel to establish (this takes ~10 seconds)..."
sleep 12

# Extract tunnel URL from logs
TUNNEL_URL=$(cat /tmp/cloudflared-output.log 2>/dev/null | grep -o "https://[a-zA-Z0-9-]*\.trycloudflare\.com" | head -1)

# Alternative extraction method
if [ -z "$TUNNEL_URL" ]; then
    TUNNEL_URL=$(cat /tmp/cloudflared-output.log 2>/dev/null | grep -i "https://" | grep -i "trycloudflare" | head -1 | awk '{for(i=1;i<=NF;i++){if($i~/https:\/\//){print $i;exit}}}')
fi

# Another method - check the actual log output
if [ -z "$TUNNEL_URL" ]; then
    TUNNEL_URL=$(tail -20 /tmp/cloudflared-output.log 2>/dev/null | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
fi

if [ -z "$TUNNEL_URL" ]; then
    echo ""
    echo "❌ Could not automatically get tunnel URL"
    echo ""
    echo "Please check the tunnel output manually:"
    echo "  cat /tmp/cloudflared-output.log"
    echo ""
    echo "Or start manually:"
    echo "  cloudflared tunnel --url http://localhost:3000"
    echo ""
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 YOUR TUNNEL URL (copy this):"
echo ""
echo "   $TUNNEL_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 NEXT STEP: Configure Extension Backend URL"
echo ""
echo "1. Open your Shopify admin:"
echo "   https://vt-test-5.myshopify.com/admin/themes/149121138874/editor"
echo ""
echo "2. Click 'App Embeds' → 'Closelook AI Widgets'"
echo ""
echo "3. Set 'Backend API URL' to: $TUNNEL_URL"
echo ""
echo "4. Click 'Save'"
echo ""
echo "5. Press 'p' in your Shopify CLI terminal to preview!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 The tunnel URL is saved to: /tmp/tunnel-url.txt"
echo "$TUNNEL_URL" > /tmp/tunnel-url.txt
echo ""
echo "✅ Everything is running!"
echo "   - Next.js: http://localhost:3000"
echo "   - Tunnel: $TUNNEL_URL"
echo ""
echo "Edit your code → Save → Refresh browser → See changes instantly!"

