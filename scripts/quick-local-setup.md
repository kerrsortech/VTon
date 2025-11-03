# Quick Local Development Setup

## Step 1: Authenticate ngrok (One-time setup)

Since ngrok v3 requires authentication, you need to set it up once:

```bash
# Open ngrok web interface
open http://localhost:4040

# OR if ngrok is not running, start it first:
ngrok http 3000

# Then open the web interface
open http://localhost:4040
```

In the browser:
1. Sign up for a free ngrok account (if you don't have one)
2. Copy your authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN`

## Step 2: Run the setup script

```bash
./scripts/setup-local-dev.sh
```

This will:
- ✅ Check if Next.js is running
- ✅ Start ngrok tunnel
- ✅ Get your tunnel URL
- ✅ Show you exactly where to configure it

## Step 3: Configure Extension Backend URL

When the script gives you the tunnel URL:

1. Go to your Shopify admin: https://vt-test-5.myshopify.com/admin/themes/149121138874/editor
2. Click "App Embeds" → "Closelook AI Widgets"
3. Set "Backend API URL" to the tunnel URL (e.g., `https://abc123.ngrok.io`)
4. Save

## Step 4: Test

Press `p` in your Shopify CLI terminal to preview - it should now work locally!

---

**Alternative: If you don't want to use ngrok**, you can use `localhost:3000` in the backend URL if you're testing from the same machine, but this won't work if the extension JavaScript runs on the Shopify store (browser can't access localhost).

