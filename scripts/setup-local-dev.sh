#!/bin/bash

# Complete Local Development Setup Script
# This sets up ngrok and provides the URL for extension configuration

set -e

echo "🚀 Setting up Local Development Environment"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Next.js not running on port 3000${NC}"
    echo "Starting Next.js..."
    cd /Users/gautam/Documents/VTon
    npm run dev:local > /tmp/nextjs-local.log 2>&1 &
    sleep 5
    echo -e "${GREEN}✅ Next.js started${NC}"
else
    echo -e "${GREEN}✅ Next.js is running on port 3000${NC}"
fi

# Kill existing ngrok
pkill -f "ngrok http" 2>/dev/null || true
sleep 2

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok not found. Installing...${NC}"
    brew install ngrok || {
        echo "❌ Failed to install ngrok. Please install manually:"
        echo "   brew install ngrok"
        exit 1
    }
fi

echo -e "${BLUE}📡 Starting ngrok tunnel...${NC}"
echo ""

# Start ngrok in background
cd /Users/gautam/Documents/VTon
nohup ngrok http 3000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "ngrok started (PID: $NGROK_PID)"

# Wait for ngrok to start
echo -e "${BLUE}⏳ Waiting for ngrok to establish tunnel...${NC}"
sleep 8

# Get tunnel URL
NGROK_URL=""
for i in {1..10}; do
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
    # Try alternative method
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -z "$NGROK_URL" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Could not get ngrok URL automatically${NC}"
    echo ""
    echo "Please check if ngrok requires authentication:"
    echo "  1. Open http://localhost:4040 in your browser"
    echo "  2. Follow the signup/login instructions"
    echo "  3. After authenticating, restart this script"
    echo ""
    echo "Or manually start ngrok:"
    echo "  ngrok http 3000"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✅ ngrok tunnel is active!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 YOUR TUNNEL URL:${NC}"
echo -e "${GREEN}$NGROK_URL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. Copy the tunnel URL above: $NGROK_URL"
echo ""
echo "2. Open your Shopify store admin:"
echo "   https://vt-test-5.myshopify.com/admin/themes/149121138874/editor"
echo ""
echo "3. In the theme editor:"
echo "   → Click 'App Embeds' (left sidebar)"
echo "   → Click 'Closelook AI Widgets'"
echo "   → Set 'Backend API URL' to: $NGROK_URL"
echo "   → Click 'Save'"
echo ""
echo "4. Press 'p' in your Shopify CLI terminal to preview"
echo ""
echo "5. Your extension will now connect to your local backend!"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Tunnel URL saved to: /tmp/ngrok-url.txt"
echo "$NGROK_URL" > /tmp/ngrok-url.txt
echo ""
echo "To stop ngrok: pkill -f 'ngrok http'"

