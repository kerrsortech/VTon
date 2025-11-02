# Complete Guide: Making Your App Available on Shopify

This guide will walk you through making your Closelook Virtual Try-On app available for Shopify store owners to install.

## 📋 Prerequisites

✅ Your app is running on Render: `https://vton-1-hqmc.onrender.com`  
✅ You have Shopify API credentials (stored in your `.env.local` file):
- API Key (Client ID): Your Shopify App API Key
- API Secret: Your Shopify App API Secret

## 🚀 Step-by-Step Setup

### Step 1: Update Shopify Partner Dashboard

1. **Go to Shopify Partners Dashboard**
   - Visit: https://partners.shopify.com
   - Log in with your Shopify Partner account
   - If you don't have one, create it at: https://partners.shopify.com/signup

2. **Navigate to Your App**
   - Go to "Apps" in the left sidebar
   - Find your app (use your Client ID from `.env.local`)
   - Click on it to open settings

3. **Configure App Setup**
   - Click on "App setup" in the left sidebar

4. **Set App URL**
   - **App URL**: `https://vton-1-hqmc.onrender.com`
   - This is your main app URL

5. **Configure Allowed redirection URL(s)**
   - Click on "Allowed redirection URL(s)"
   - Add: `https://vton-1-hqmc.onrender.com/api/shopify/auth/oauth`
   - This is where Shopify redirects after OAuth authorization

6. **Configure Preferences**
   - **Embedded app**: Enable this (your app runs inside Shopify admin)
   - **App proxy**: You can enable this if needed
     - Subpath prefix: `closelook`
     - Subpath: `apps`

### Step 2: Configure API Access Scopes

1. In your app settings, go to "API access scopes"
2. Add the following scopes:
   - `read_products` - Read product information
   - `read_content` - Read store content
   - `read_orders` - Read order information
   - `read_customers` - Read customer information
   - `write_customers` - Write customer notes (for support tickets)

### Step 3: Test Installation

1. **Create a Development Store** (for testing)
   - In Partners Dashboard → "Stores" → "Add store"
   - Choose "Development store"
   - This gives you a test store to install your app

2. **Install Your App**
   - Go to: `https://vton-1-hqmc.onrender.com/install?shop=YOUR-DEV-STORE.myshopify.com`
   - Replace `YOUR-DEV-STORE` with your development store name
   - Click "Install App"
   - You'll be redirected to Shopify OAuth
   - Authorize the app
   - You'll be redirected back to your admin dashboard

### Step 4: Publish Your App (Optional - for Shopify App Store)

If you want to list your app in the Shopify App Store:

1. **Go to "Distribution" in your app settings**
2. **Complete App Store listing**
   - App name: "Closelook Virtual Try-On"
   - App description: Describe your app's features
   - Screenshots: Add screenshots of your app
   - Pricing: Set your pricing model
   - Support information: Add support email/URL

3. **Submit for Review**
   - Complete all required information
   - Submit for Shopify review
   - This process can take 2-4 weeks

## 📝 Installation Flow for Store Owners

### Option 1: Direct Installation URL (Recommended)

Share this URL with store owners:
```
https://vton-1-hqmc.onrender.com/install?shop=STORE-NAME.myshopify.com
```

Replace `STORE-NAME` with their Shopify store name.

**What happens:**
1. Store owner visits the install page
2. Clicks "Install App"
3. Redirected to Shopify OAuth
4. Authorizes permissions
5. Redirected to admin dashboard at `/admin?shop=STORE-NAME.myshopify.com`

### Option 2: Custom Install Button

You can create a custom landing page with an install button that uses this format:
```html
<a href="https://vton-1-hqmc.onrender.com/install?shop=THEIR-STORE.myshopify.com">
  Install Closelook Virtual Try-On
</a>
```

### Option 3: Shopify App Store (After Approval)

Once approved, store owners can:
1. Go to Shopify Admin → Apps
2. Search "Closelook Virtual Try-On"
3. Click "Add app"
4. Complete OAuth flow

## 🎯 After Installation

Once installed, store owners can:

1. **Access Admin Dashboard**
   - URL: `https://vton-1-hqmc.onrender.com/admin?shop=STORE-NAME.myshopify.com`
   - View analytics, try-on stats, and conversions

2. **Add Theme Blocks**
   - Go to Shopify Admin → Online Store → Themes
   - Click "Customize" on their theme
   - In the theme editor, they can add:
     - "Closelook Virtual Try-On Widget"
     - "Closelook Chatbot"
   - These blocks will appear in the theme customizer

3. **Configure Settings**
   - Store owners can configure widget appearance
   - Set chatbot preferences
   - View analytics and reports

## 🔧 Troubleshooting

### "Failed to initiate OAuth flow" Error

If you see this error when clicking "Install App":

1. **Check Environment Variables**
   - Ensure `SHOPIFY_API_KEY` is set in your Render environment
   - Ensure `SHOPIFY_API_SECRET` is set in your Render environment
   - Ensure `SHOPIFY_APP_URL` or `RENDER_EXTERNAL_URL` is set to your deployed URL
   - In Render dashboard: Environment → Environment Variables

2. **Verify Shop Parameter**
   - Ensure the URL includes a valid shop parameter: `/install?shop=your-store.myshopify.com`
   - The shop must end with `.myshopify.com`
   - Example: `https://vton-1-hqmc.onrender.com/install?shop=your-dev-store.myshopify.com`

3. **Check App Configuration**
   - Verify your app is created in Shopify Partners Dashboard
   - Ensure API credentials match between Render and Partners Dashboard
   - Check that the App URL in Partners Dashboard matches your Render URL

4. **Review Logs**
   - Check Render logs for detailed error messages
   - The error response will now include more specific details about what failed

### OAuth Redirect Errors

If you see "Redirect URI mismatch":
1. Double-check the redirect URL in Partners Dashboard
2. Ensure it's exactly: `https://vton-1-hqmc.onrender.com/api/shopify/auth/oauth`
3. No trailing slashes, no typos

### App Not Showing in Theme Customizer

1. Verify the app is installed (check session storage)
2. Ensure theme app extensions are deployed
3. Store owners may need to refresh the theme editor

### Build/Deployment Issues

If Render deployment fails:
1. Verify all environment variables are set in Render
2. Check build logs in Render dashboard
3. Ensure `SHOPIFY_APP_URL` is set to your Render URL

## 📚 Quick Reference URLs

- **Installation Page**: `https://vton-1-hqmc.onrender.com/install?shop=STORE.myshopify.com`
- **Admin Dashboard**: `https://vton-1-hqmc.onrender.com/admin?shop=STORE.myshopify.com`
- **OAuth Callback**: `https://vton-1-hqmc.onrender.com/api/shopify/auth/oauth`
- **Shopify Partners**: https://partners.shopify.com

## ✅ Checklist

- [ ] Updated `shopify.app.toml` with Render URL
- [ ] Set App URL in Shopify Partners Dashboard
- [ ] Added OAuth redirect URL in Partners Dashboard
- [ ] Configured API access scopes
- [ ] Created installation landing page
- [ ] Tested installation on development store
- [ ] Verified admin dashboard works after installation
- [ ] (Optional) Submitted app for Shopify App Store review

## 🎉 Next Steps

1. **Share your installation URL** with beta testers
2. **Collect feedback** and iterate
3. **Prepare for App Store submission** (if desired)
4. **Set up support channels** for store owners
5. **Monitor analytics** to see installation rates

Your app is now ready for Shopify store owners to install! 🚀

