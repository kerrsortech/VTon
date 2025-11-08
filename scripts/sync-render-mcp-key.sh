#!/bin/bash

# Script to sync RENDER_API_KEY from .env.local to Cursor MCP configuration
# This ensures the MCP config stays in sync with your environment variables

set -e

# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.local"
MCP_CONFIG="${HOME}/.cursor/mcp.json"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env.local file not found at $ENV_FILE"
    exit 1
fi

# Extract RENDER_API_KEY from .env.local
RENDER_API_KEY=$(grep "^RENDER_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)

if [ -z "$RENDER_API_KEY" ]; then
    echo "Error: RENDER_API_KEY not found in .env.local"
    exit 1
fi

# Check if mcp.json exists
if [ ! -f "$MCP_CONFIG" ]; then
    echo "Error: MCP configuration file not found at $MCP_CONFIG"
    exit 1
fi

# Create a backup of the current MCP config
cp "$MCP_CONFIG" "${MCP_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Update the MCP config using Python for reliable JSON manipulation
python3 << EOF
import json
import sys
import os

mcp_config_path = "$MCP_CONFIG"
api_key = "$RENDER_API_KEY"

try:
    # Read current MCP config
    with open(mcp_config_path, 'r') as f:
        config = json.load(f)
    
    # Update the Render API key
    if 'mcpServers' in config and 'render' in config['mcpServers']:
        config['mcpServers']['render']['headers']['Authorization'] = f'Bearer {api_key}'
        
        # Write updated config
        with open(mcp_config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Successfully updated Render API key in MCP configuration")
        print(f"   Location: {mcp_config_path}")
    else:
        print("⚠️  Warning: 'render' server not found in MCP configuration")
        print("   Please ensure the render server is configured in mcp.json")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Error updating MCP configuration: {e}")
    sys.exit(1)
EOF

echo ""
echo "📝 Note: Please restart Cursor for the changes to take effect."

