# Quick Local Development Setup

## 🚀 Get Started in 3 Steps

### Step 1: Create `.env.local`
```bash
cp .env.local.example .env.local
# Then edit .env.local with your actual API keys and secrets
```

### Step 2: Enable Development Store Preview
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Apps → Closelook Virtual Try-On → Extensions
3. Toggle ON "Development Store Preview" for your extension

### Step 3: Start Development
```bash
./scripts/dev-local.sh
```

That's it! The script will:
- Start your Next.js server on port 3000
- Launch Shopify CLI with automatic tunneling
- Show you the tunnel URL to use in your extension settings

## 📝 Next Steps After Starting

1. **Get the tunnel URL** from the Shopify CLI output
2. **Open your development store** → Online Store → Themes → Customize
3. **Go to App Embeds** → Closelook AI Widgets
4. **Set Backend API URL** to your tunnel URL (e.g., `https://abc123.app.sh`)
5. **Save** and refresh your storefront

## ✨ Benefits

- ✅ Test changes instantly without deploying
- ✅ No need to push to GitHub or redeploy backend
- ✅ See changes immediately in your Shopify store
- ✅ Safe testing environment

## 📚 Full Documentation

See `LOCAL_DEVELOPMENT.md` for detailed setup instructions and troubleshooting.

