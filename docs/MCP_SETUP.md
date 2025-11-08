# MCP (Model Context Protocol) Setup Guide

This guide explains how to set up MCP servers for Cursor IDE without exposing API keys in version control.

## Security Notice ⚠️

**NEVER commit your actual `mcp.json` file or API keys to git.** The MCP configuration file contains sensitive API keys and should remain on your local machine only.

## Setup Instructions

### 1. Prerequisites

- Cursor IDE installed
- API keys for the services you want to use (Neon, Render, etc.)

### 2. Create MCP Configuration

The MCP configuration file should be created at `~/.cursor/mcp.json` (outside your project directory).

**Option A: Manual Setup**

1. Copy the example template:
   ```bash
   cp mcp.json.example ~/.cursor/mcp.json
   ```

2. Edit `~/.cursor/mcp.json` and replace placeholder values:
   - `YOUR_NEON_API_KEY_HERE` → Your actual Neon API key
   - `YOUR_RENDER_API_KEY_HERE` → Your actual Render API key

**Option B: Automated Setup (Recommended)**

1. Add your API keys to `.env.local`:
   ```bash
   RENDER_API_KEY=your_actual_render_api_key_here
   ```

2. Run the sync script:
   ```bash
   ./scripts/sync-render-mcp-key.sh
   ```

### 3. Restart Cursor

After updating the MCP configuration, restart Cursor IDE for changes to take effect.

## File Locations

- **MCP Config**: `~/.cursor/mcp.json` (local only, never committed)
- **Template**: `mcp.json.example` (safe to commit, contains placeholders)
- **Environment Variables**: `.env.local` (gitignored, contains actual keys)
- **Sync Script**: `scripts/sync-render-mcp-key.sh` (safe to commit)

## Updating API Keys

### If using the sync script:

1. Update `RENDER_API_KEY` in `.env.local`
2. Run: `./scripts/sync-render-mcp-key.sh`
3. Restart Cursor

### Manual update:

1. Edit `~/.cursor/mcp.json` directly
2. Update the API key values
3. Restart Cursor

## Security Checklist

- ✅ `mcp.json` is in `.gitignore`
- ✅ `.env.local` is in `.gitignore`
- ✅ Only `mcp.json.example` (with placeholders) is committed
- ✅ API keys are stored in `.env.local`, not hardcoded
- ✅ MCP config file is outside the project directory (`~/.cursor/`)

## Troubleshooting

### MCP server not working

1. Verify the API key is correct in `~/.cursor/mcp.json`
2. Check that the JSON syntax is valid
3. Ensure Cursor has been restarted after configuration changes
4. Check Cursor's MCP server logs for errors

### Sync script fails

1. Verify `.env.local` exists and contains `RENDER_API_KEY`
2. Check file permissions on the script: `chmod +x scripts/sync-render-mcp-key.sh`
3. Ensure Python 3 is installed: `python3 --version`

## Available MCP Servers

### Render
- **URL**: `https://mcp.render.com/mcp`
- **Purpose**: Monitor backend logs, view metrics, manage deployments
- **API Key**: Get from https://dashboard.render.com/account

### Neon
- **URL**: `https://mcp.neon.tech/mcp`
- **Purpose**: Manage Neon databases, run SQL queries
- **API Key**: Get from your Neon account

## Example Usage

After setup, you can use natural language commands in Cursor:

- "Show me the latest logs from my Render services"
- "What's the CPU usage for my services?"
- "List my recent deployments"
- "Run a query on my Render Postgres database"

