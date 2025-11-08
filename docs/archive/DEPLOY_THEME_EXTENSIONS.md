# Complete Guide: Deploying Theme App Extensions to Shopify Stores

This guide explains how your Closelook app works and how store owners can add your widgets to their Shopify stores.

## 🏗️ Architecture Overview

Your application has **two separate parts** that work independently:

### 1. **Demo Website** (What you see at root URL)
- **URL**: `https://vton-1-hqmc.onrender.com/`
- **Purpose**: Showcase your app, testing, demonstration
- **Contains**: Full demo store UI with products, chatbot, try-on features
- **Who sees this**: Anyone who visits your root URL directly

### 2. **Shopify App** (For store owners to install)
- **Install URL**: `https://vton-1-hqmc.onrender.com/install?shop=STORE.myshopify.com`
- **Admin Dashboard**: `https://vton-1-hqmc.onrender.com/admin?shop=STORE.myshopify.com`
- **Theme Extensions**: Blocks that store owners add to their Shopify themes
- **Who sees this**: Store owners who install your app on their Shopify stores

**Important**: The demo website and Shopify app are completely separate. The demo site won't interfere with store installations.

## 🎯 How It Works

### Step 1: Store Owner Installs Your App

1. Store owner visits: `https://vton-1-hqmc.onrender.com/install?shop=THEIR-STORE.myshopify.com`
2. Clicks "Install App"
3. Authorizes your app via Shopify OAuth
4. Gets redirected to admin dashboard
5. Your app is now installed on their store

### Step 2: Store Owner Adds Widgets to Their Theme

After installation, store owners can add your widgets to their store theme:

1. **Go to Shopify Admin** → **Online Store** → **Themes**
2. Click **"Customize"** on their theme
3. In the theme editor, they'll see:
   - **"Closelook Try-On Widget"** block
   - **"Closelook Chatbot"** block
4. They can drag and drop these blocks onto product pages
5. Configure settings (position, API URL)
6. **Save** the theme
7. Widgets now appear on their live store product pages!

### Step 3: Widgets Work on Their Store

When customers visit product pages on the store:
- The theme block loads your widget JavaScript
- Widget connects to your API at `https://vton-1-hqmc.onrender.com/api`
- Virtual try-on and chatbot features work seamlessly
- All data is processed through your backend

## 📦 Building and Deploying Theme Extensions

### Prerequisites

1. **Shopify CLI** must be installed:
   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. **Shopify Partners Account** with app created

### Build Widgets

Before deploying, build your widgets:

```bash
# Build both widgets
pnpm run build:widgets

# Or build individually
cd widgets/try-on-widget && npm run build
cd widgets/chatbot-widget && npm run build
```

The built widget files will be in:
- `widgets/try-on-widget/dist/` → Should be copied to `public/widgets/try-on-widget.js`
- `widgets/chatbot-widget/dist/` → Should be copied to `public/widgets/chatbot-widget.js`

### Deploy Theme Extensions

Theme extensions need to be deployed via Shopify CLI:

```bash
# Link to your Shopify app
shopify app deploy

# Or deploy only theme extensions
cd shopify-app
shopify theme push --development
```

**Important**: Theme extensions are deployed separately from your Next.js app. They're bundled and uploaded to Shopify's CDN.

## 🔧 How Theme Extensions Work

### File Structure

```
shopify-app/
├── blocks/
│   ├── closelook-widget/
│   │   ├── block.liquid          # Template for widget
│   │   └── block.schema.json     # Configuration schema
│   └── closelook-chatbot/
│       ├── block.liquid          # Template for chatbot
│       └── block.schema.json     # Configuration schema
└── extensions.json               # Extension manifest
```

### Block.liquid Files

These Liquid templates:
1. Create a container div for the widget
2. Load your widget JavaScript from your Render URL
3. Pass product data to the widget
4. Handle positioning and styling

### Widget JavaScript Files

Your widgets are loaded from:
- `https://vton-1-hqmc.onrender.com/widgets/try-on-widget.js`
- `https://vton-1-hqmc.onrender.com/widgets/chatbot-widget.js`

These files must be:
1. **Built** (via webpack in widget directories)
2. **Copied** to `public/widgets/` directory
3. **Served** by Next.js from the public folder

### Deployment Checklist

- [ ] Widgets are built (`pnpm run build:widgets`)
- [ ] Built widget files are in `public/widgets/` directory
- [ ] Theme extensions are configured with correct API URLs
- [ ] Next.js serves files from `public/` directory
- [ ] Theme extensions deployed via Shopify CLI

## 🚀 Deployment Process

### 1. Build Your Widgets

```bash
# Install widget dependencies if needed
cd widgets/try-on-widget && npm install
cd widgets/chatbot-widget && npm install

# Build widgets
pnpm run build:widgets
```

### 2. Copy Built Files to Public Directory

After building, copy the built files:

```bash
# Copy try-on widget
cp widgets/try-on-widget/dist/*.js public/widgets/try-on-widget.js

# Copy chatbot widget  
cp widgets/chatbot-widget/dist/*.js public/widgets/chatbot-widget.js
```

### 3. Deploy to Render

Your Render deployment will:
1. Build your Next.js app
2. Serve the `public/` directory statically
3. Widgets will be accessible at `/widgets/*.js`

### 4. Deploy Theme Extensions to Shopify

```bash
# Install Shopify CLI if not already installed
npm install -g @shopify/cli @shopify/theme

# Navigate to your app
cd shopify-app

# Authenticate with Shopify
shopify app auth

# Deploy theme extensions
shopify app deploy
```

## ✅ Verification Steps

### Test Widget Files Are Accessible

Visit these URLs on your Render deployment:
- `https://vton-1-hqmc.onrender.com/widgets/try-on-widget.js` → Should load JavaScript
- `https://vton-1-hqmc.onrender.com/widgets/chatbot-widget.js` → Should load JavaScript

### Test Theme Extensions

1. Install app on a development store
2. Go to theme customizer
3. Look for "Closelook Try-On Widget" and "Closelook Chatbot" in blocks
4. Add to a product page
5. Preview the page - widgets should load

### Test Widget Functionality

1. Visit a product page on the test store
2. Widgets should appear (try-on widget, chatbot)
3. Test try-on feature - should connect to your API
4. Test chatbot - should work with your backend

## 🎨 Store Owner Experience

### After Installation

Store owners will:

1. **Access Admin Dashboard**
   - URL: `https://vton-1-hqmc.onrender.com/admin?shop=THEIR-STORE.myshopify.com`
   - View analytics and try-on statistics

2. **Add Widgets to Theme**
   - Go to Shopify Admin → Themes → Customize
   - Find "Closelook Try-On Widget" and "Closelook Chatbot"
   - Add to product pages
   - Configure settings

3. **Widgets Appear on Live Store**
   - Customers see try-on button on product pages
   - Chatbot appears for product assistance
   - Everything connects to your backend API

## 📝 Important Notes

### Demo Website vs Shopify App

- **Demo Website** (`/`): Just for showcasing - doesn't interfere
- **Shopify App** (`/install`, `/admin`): Real app for store owners
- **Theme Extensions**: Blocks that appear on store owners' themes
- **Widgets**: JavaScript loaded from your Render deployment

### Widget URLs

Your widgets must be accessible at:
```
https://vton-1-hqmc.onrender.com/widgets/try-on-widget.js
https://vton-1-hqmc.onrender.com/widgets/chatbot-widget.js
```

These are loaded by the theme extension blocks when customers visit product pages.

### API Endpoints

Your widgets connect to:
```
https://vton-1-hqmc.onrender.com/api/try-on
https://vton-1-hqmc.onrender.com/api/chat
https://vton-1-hqmc.onrender.com/api/products
```

Make sure these endpoints work correctly for authenticated stores.

## 🐛 Troubleshooting

### Widgets Not Loading

1. Check widget files exist in `public/widgets/`
2. Verify files are accessible at Render URL
3. Check browser console for errors
4. Verify API URLs in theme extension blocks

### Theme Extensions Not Appearing

1. Ensure extensions are deployed via Shopify CLI
2. Check `extensions.json` configuration
3. Verify app is properly installed on test store
4. Try refreshing theme customizer

### Widgets Not Working

1. Check API endpoints are accessible
2. Verify store session is properly stored
3. Check API authentication/authorization
4. Review browser console for errors

## 🎉 You're Ready!

Once everything is configured:

1. ✅ Store owners can install your app
2. ✅ Widgets appear in theme customizer
3. ✅ Widgets work on live product pages
4. ✅ Everything connects to your Render deployment

Your app is ready to be published to the Shopify App Store! 🚀

