#!/bin/bash

# Get ngrok tunnel URL
# This script gets the public URL from ngrok's web interface

sleep 2
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c 'import sys, json; data = json.load(sys.stdin); tunnels = [t for t in data.get("tunnels", []) if t.get("proto") == "https"]; print(tunnels[0]["public_url"] if tunnels else "")' 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    # Try alternative method
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -n "$NGROK_URL" ]; then
    echo "$NGROK_URL"
    exit 0
else
    echo ""
    exit 1
fi

