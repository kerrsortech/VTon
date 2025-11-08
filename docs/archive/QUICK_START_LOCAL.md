# 🚀 Quick Start: Local Development Setup

## One-Time Setup: Authenticate ngrok

Since ngrok v3 requires authentication, you need to do this once:

### Step 1: Sign up for ngrok (free)
1. Go to: https://dashboard.ngrok.com/signup
2. Create a free account (or log in if you have one)

### Step 2: Get your authtoken
1. After login, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abc123def456ghi789jkl012_3mN4oP5qR6sT7uV8wX9yZ0`)

### Step 3: Install authtoken
Run this command (replace `YOUR_TOKEN` with the token you copied):

```bash
ngrok config add-authtoken YOUR_TOKEN
```

You'll see: `Authtoken saved to configuration file: /Users/yourusername/.ngrok2/ngrok.yml`

## Daily Development

After the one-time setup above, just run:

```bash
./setup-complete-local-dev.sh
```

This script will:
- ✅ Check if Next.js is running (start it if not)
- ✅ Start ngrok tunnel
- ✅ Get your tunnel URL
- ✅ Show you exactly where to configure it

## Configure Extension Backend URL

After the script gives you the tunnel URL:

1. **Open Shopify Admin:**
   ```
   https://vt-test-5.myshopify.com/admin/themes/149121138874/editor
   ```

2. **In Theme Editor:**
   - Click **"App Embeds"** (left sidebar)
   - Click **"Closelook AI Widgets"**
   - Set **"Backend API URL"** to your tunnel URL (e.g., `https://abc123.ngrok.io`)
   - Click **"Save"**

3. **Test:**
   - Press `p` in your Shopify CLI terminal
   - Your extension will now connect to your local backend!

## Done! ✅

Now you can:
- Edit files in `extensions/closelook-widgets-extension/`
- Save → Refresh browser → See changes instantly!
- No deployment needed!

---

**That's it!** After the one-time ngrok authentication, just run `./setup-complete-local-dev.sh` every time you want to develop locally.

