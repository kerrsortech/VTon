# Quick Start: Local Development

## 🚀 One Command Setup

```bash
cd /Users/gautam/Documents/VTon
shopify app dev
```

That's it! The CLI will:
1. ✅ Start your local server
2. ✅ Create a secure tunnel
3. ✅ Show you the preview URL
4. ✅ Open your store with the app embedded

## 📋 What Happens

1. **Select your store** when prompted
2. **Get the preview URL** - shown in terminal output
3. **Press `p` in terminal** to open preview in browser
4. **Edit your code** → Save → Changes appear instantly!

## 🔄 Daily Workflow

```bash
# Terminal 1 - Run this and keep it running
shopify app dev

# Terminal 2 - Edit your files
# Make changes to:
# - extensions/closelook-widgets-extension/
# - app/
# - components/
# Save → Refresh browser → See changes!
```

## 💡 Key Points

- ✅ **No deployment needed** - Changes appear immediately
- ✅ **Secure tunnel** - Shopify CLI creates tunnel automatically
- ✅ **Hot reload** - Extension files auto-update
- ✅ **Preview link** - CLI shows URL or press `p` to open

## 🌐 Alternative: Localhost Only

If you want to use localhost (no tunnel):
```bash
shopify app dev --use-localhost
```

⚠️ Note: Won't work for webhooks or testing from other devices

## 📍 Important URLs

- **Local Next.js**: http://localhost:3000
- **Extension Preview**: http://127.0.0.1:9293 (when CLI is running)
- **Tunnel URL**: Shown in CLI output (e.g., `https://xxx.app.sh`)

## 🎯 Next Steps After Starting

1. **Copy the tunnel URL** from CLI output
2. **Go to your store** → Online Store → Themes → Customize
3. **App Embeds** → Closelook AI Widgets
4. **Set Backend API URL** to your tunnel URL
5. **Save and refresh** - Your plugin is now running locally!

---

**That's it!** Start with `shopify app dev` and you're ready to develop locally.

