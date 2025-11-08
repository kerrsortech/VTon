# Local Development Setup Guide

This guide will help you set up local development for your Shopify plugin so you can test changes immediately without deploying to production.

## 🎯 Quick Start

```bash
# Option 1: Use the automated script (Recommended)
./scripts/dev-local.sh

# Option 2: Run manually
npm run dev:local      # Terminal 1: Next.js server
shopify app dev        # Terminal 2: Shopify CLI
```

## 📋 Prerequisites

1. **Shopify CLI** - Should already be installed (check with `shopify --version`)
2. **Node.js & npm** - For running the Next.js server
3. **Shopify Partner Account** - For access to development stores
4. **Development Store** - A test store to install and test your app

## 🚀 Step-by-Step Setup

### Step 1: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your actual values:
   - `SHOPIFY_API_KEY` - Your app's API key (already in shopify.app.toml)
   - `SHOPIFY_API_SECRET` - Your app's API secret (from Shopify Partner Dashboard)
   - `SHOPIFY_SESSION_SECRET` - Generate a random string for local development
   - `REPLICATE_API_TOKEN` - Your Replicate API token
   - `GOOGLE_GEMINI_API_KEY` - Your Gemini API key
   - `DATABASE_URL` - Your database connection string

### Step 2: Enable Development Store Preview

**CRITICAL:** This must be done before testing locally!

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Navigate to **Apps** → **Closelook Virtual Try-On** → **Extensions**
3. Find your extension (`closelook-widgets-extension`)
4. **Toggle ON "Development Store Preview"**
5. Save changes

This allows you to see extension changes in your development store without deploying.

### Step 3: Start Local Development

#### Using the Automated Script (Recommended)

```bash
./scripts/dev-local.sh
```

This script will:
- ✅ Check if Shopify CLI is installed
- ✅ Create `.env.local` if it doesn't exist
- ✅ Start Next.js server on `http://localhost:3000`
- ✅ Launch Shopify CLI dev mode with automatic tunneling
- ✅ Show you the tunnel URL for your extension

#### Manual Setup (Alternative)

**Terminal 1 - Next.js Server:**
```bash
npm run dev:local
```

**Terminal 2 - Shopify CLI:**
```bash
shopify app dev
```

When prompted:
1. Select your development store
2. Shopify CLI will create a secure tunnel
3. Note the tunnel URL shown (you'll need this)

### Step 4: Configure Extension Backend URL

1. Go to your development store's Shopify Admin
2. Navigate to **Online Store** → **Themes** → **Customize**
3. In the theme editor, go to **App Embeds**
4. Find **Closelook AI Widgets**
5. Click to open settings
6. Set **Backend API URL** to your tunnel URL (from Shopify CLI output)
   - Example: `https://abc123.app.sh` (Shopify CLI tunnel)
   - Or: `https://abc123.ngrok.io` (if using ngrok)

### Step 5: Test Your Changes

1. Make changes to files in `extensions/closelook-widgets-extension/`
2. Changes should auto-reload in your development store
3. Refresh your storefront to see updates
4. No deployment needed! 🎉

## 🔧 Troubleshooting

### Extension Not Appearing

1. **Check Development Store Preview**: Must be enabled in Partner Dashboard
2. **Verify Extension is Active**: In theme editor, ensure the extension is toggled ON
3. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. **Check Console Logs**: Open browser DevTools to see any errors

### Backend Not Connecting

1. **Verify Tunnel URL**: Make sure the extension's backend URL matches your tunnel URL
2. **Check Next.js is Running**: Ensure `npm run dev:local` is running
3. **CORS Issues**: The backend should automatically allow your store domain. Check `lib/cors-headers.ts`
4. **Network Tab**: Check browser Network tab to see if API calls are being made

### Shopify CLI Issues

```bash
# Reset Shopify CLI
shopify app dev --reset

# Check CLI version
shopify --version

# Update CLI if needed
npm update -g @shopify/cli @shopify/theme
```

### Port Already in Use

If port 3000 is already in use:

```bash
# Option 1: Kill the process
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm run dev:local
```

Then update your extension's backend URL accordingly.

## 📝 Development Workflow

### Daily Development Flow

1. **Start Development:**
   ```bash
   ./scripts/dev-local.sh
   ```

2. **Make Changes:**
   - Edit extension files (`.liquid`, `.js`, `.css`)
   - Changes auto-reload in development store
   - Test immediately in browser

3. **When Ready:**
   - Deploy once to production: `shopify app deploy`
   - Push to GitHub
   - Deploy backend if needed

### File Locations

- **Extension Liquid Template**: `extensions/closelook-widgets-extension/blocks/closelook-widgets.liquid`
- **Extension JavaScript**: `extensions/closelook-widgets-extension/assets/closelook-widgets.js`
- **Extension CSS**: `extensions/closelook-widgets-extension/assets/closelook-widgets.css`
- **Backend API Routes**: `app/api/`

### Hot Reload

- **Extension Files**: Auto-reload via Shopify CLI
- **Backend Files**: Auto-reload via Next.js (save and refresh browser)
- **Widget Files**: Need to rebuild: `npm run build:widgets`

## 🌐 Using ngrok (Alternative to Shopify CLI Tunnel)

If you prefer using ngrok instead of Shopify CLI's built-in tunneling:

1. **Install ngrok:**
   ```bash
   brew install ngrok
   ```

2. **Start Next.js:**
   ```bash
   npm run dev:local
   ```

3. **Start ngrok in another terminal:**
   ```bash
   ngrok http 3000
   ```

4. **Use the ngrok URL** in your extension settings:
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Paste it in extension's "Backend API URL" setting

## ✅ Verification Checklist

Before starting development, ensure:

- [ ] Shopify CLI is installed (`shopify --version`)
- [ ] `.env.local` exists with all required values
- [ ] Development Store Preview is enabled in Partner Dashboard
- [ ] Development store is accessible
- [ ] App is installed on development store
- [ ] Extension is enabled in theme editor
- [ ] Backend URL is configured correctly

## 🎉 Benefits of Local Development

✅ **Instant Feedback** - See changes immediately  
✅ **No Deployment Needed** - Test before deploying  
✅ **Fast Iteration** - Edit → Save → Test cycle  
✅ **Safe Testing** - Won't affect production  
✅ **Cost Effective** - No need to deploy for every small change  

## 📚 Additional Resources

- [Shopify CLI Documentation](https://shopify.dev/docs/apps/tools/cli)
- [Theme App Extensions Guide](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Local Development Best Practices](https://shopify.dev/docs/apps/tools/cli/configuration#local-development)

---

**Need Help?** Check the troubleshooting section above or review the console logs for specific errors.

