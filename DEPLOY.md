# Complete Deployment Guide for Closelook Virtual Try-On

**Follow this guide from start to finish to deploy your Closelook plugin to Shopify stores.**

---

## Prerequisites

Before you begin, you need:

1. **Shopify Partners Account** (free)
   - Sign up at: https://partners.shopify.com

2. **Hosting Account** (choose one):
   - **Render** (recommended, free tier available): https://render.com
   - **Heroku** (paid): https://heroku.com
   - **Vercel** (limited Next.js features): https://vercel.com

3. **API Keys**:
   - **Google Gemini API Key**: Get from https://makersuite.google.com/app/apikey
   - **Replicate API Token**: Get from https://replicate.com/account/api-tokens

4. **Optional but Recommended**:
   - **Neon Database** (free PostgreSQL): https://neon.tech (for analytics)
   - **Vercel Blob** (for image storage): https://vercel.com/docs/storage/vercel-blob

---

## Part 1: Local Setup (5 minutes)

### Step 1: Install Dependencies

Open terminal in your project folder and run:

```bash
# Install main dependencies
npm install

# Install chatbot widget dependencies
cd widgets/chatbot-widget
npm install
cd ../..

# Install try-on widget dependencies
cd widgets/try-on-widget
npm install
cd ../..
```

### Step 2: Create Environment File

Create a file called `.env.local` in the root folder with:

```bash
# Replace YOUR_ values with your actual keys

# Shopify (you'll create the app in Part 2)
SHOPIFY_API_KEY=YOUR_API_KEY
SHOPIFY_API_SECRET=YOUR_API_SECRET
SHOPIFY_APP_URL=http://localhost:3000
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers
SHOPIFY_SESSION_SECRET=any_random_string_here

# AI Services
GOOGLE_GEMINI_API_KEY=YOUR_GEMINI_KEY
REPLICATE_API_TOKEN=YOUR_REPLICATE_TOKEN

# For local testing (optional)
BLOB_READ_WRITE_TOKEN=YOUR_BLOB_TOKEN
DATABASE_URL=YOUR_DATABASE_URL
```

**Important**: Don't commit this file to Git! It contains secrets.

### Step 3: Test Locally

```bash
# Start development server
npm run dev

# In another terminal, build widgets
npm run build:widgets

# Visit http://localhost:3000
```

You should see the demo store. If it works, you're ready to deploy!

---

## Part 2: Create Shopify App (10 minutes)

### Step 1: Create App in Partners Dashboard

1. Go to https://partners.shopify.com
2. Log in to your account
3. Click **"Apps"** in the left menu
4. Click **"Create app"**
5. Choose **"Create app manually"**
6. Fill in:
   - **App name**: Closelook Virtual Try-On
   - **App URL**: Leave blank for now
   - Click **"Create app"**

### Step 2: Get Your API Keys

1. In your app settings, you'll see:
   - **API key** (Client ID)
   - **API secret** (Client secret)
2. Copy both values
3. Update your `.env.local` file with these values

### Step 3: Configure OAuth Settings

1. In your app settings, find **"App setup"** section
2. Under **"Allowed redirection URLs"**, add:
   ```
   https://your-app.onrender.com/api/shopify/auth/oauth
   ```
   (Replace `your-app` with your hosting URL - you'll update this later)

3. Click **"Save"**

---

## Part 3: Deploy to Hosting (15 minutes)

We'll use **Render** as example. If using Heroku or Vercel, the process is similar.

### Step 1: Push Code to GitHub

1. Make sure you've committed all files:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin shopify
   ```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Choose the repository that contains your code
4. Configure:

   **Basic Settings**:
   - **Name**: `closelook-virtual-tryon` (or any name you like)
   - **Region**: Choose closest to your users
   - **Branch**: `shopify` (or `main` if that's your main branch)
   - **Runtime**: `Node`

   **Build & Deploy**:
   - **Build Command**:
     ```bash
     npm install && cd widgets/chatbot-widget && npm install && cd ../try-on-widget && npm install && cd ../../ && npm run build:widgets && npm run build
     ```
   - **Start Command**: `npm start`

   Click **"Advanced"**:
   - **Node Version**: `18` or `20`

5. Click **"Create Web Service"**

### Step 4: Add Environment Variables

1. In your Render service dashboard, go to **"Environment"**
2. Click **"Add Environment Variable"**
3. Add each variable from your `.env.local`:

   ```
   SHOPIFY_API_KEY = your_shopify_api_key
   SHOPIFY_API_SECRET = your_shopify_api_secret
   SHOPIFY_APP_URL = https://closelook-virtual-tryon.onrender.com
   SHOPIFY_SCOPES = read_products,read_content,read_orders,read_customers,write_customers
   SHOPIFY_SESSION_SECRET = any_random_string_here
   GOOGLE_GEMINI_API_KEY = your_gemini_key
   REPLICATE_API_TOKEN = your_replicate_token
   BLOB_READ_WRITE_TOKEN = your_blob_token
   DATABASE_URL = your_database_url
   NODE_ENV = production
   NEXT_PUBLIC_APP_URL = https://closelook-virtual-tryon.onrender.com
   ```

   **Important**: 
   - Replace `closelook-virtual-tryon.onrender.com` with YOUR actual Render URL
   - Replace all `your_*` values with actual keys

4. Click **"Save Changes"**

### Step 5: Deploy

1. Render will automatically start deploying
2. Wait 5-10 minutes for the first deployment
3. Watch the logs to ensure it completes successfully
4. Once deployed, note your app URL (e.g., `https://closelook-virtual-tryon.onrender.com`)

---

## Part 4: Connect Shopify to Your App (10 minutes)

### Step 1: Update Shopify App Settings

1. Go back to https://partners.shopify.com
2. Open your app
3. In **"App setup"**, update:
   - **Application URL**: `https://closelook-virtual-tryon.onrender.com`
   - **Allowed redirection URLs**: `https://closelook-virtual-tryon.onrender.com/api/shopify/auth/oauth`
   - Replace with YOUR actual URL
4. Click **"Save"**

### Step 2: Create Development Store

1. In Partners Dashboard, click **"Development stores"**
2. Click **"Add store"**
3. Fill in:
   - **Store name**: My Test Store
   - **Store purpose**: Development store
   - **Your role**: Administrator
4. Click **"Create store"**

### Step 3: Install Your App

1. Copy your store URL (e.g., `my-test-store.myshopify.com`)
2. Visit:
   ```
   https://closelook-virtual-tryon.onrender.com/api/shopify/auth/install?shop=my-test-store.myshopify.com
   ```
   (Replace with YOUR app URL and store name)

3. You'll be redirected to Shopify to authorize the app
4. Click **"Install app"**
5. You should be redirected to your admin dashboard

**Success!** Your app is installed! 🎉

---

## Part 5: Add Widgets to Your Store (5 minutes)

### Step 1: Open Theme Editor

1. In your Shopify admin, go to **"Online Store"** → **"Themes"**
2. Find your active theme
3. Click **"Customize"**

### Step 2: Add Chatbot Widget

1. Navigate to any **Product Page** (or Product Default)
2. Click **"Add block"**
3. Find **"Closelook Chatbot"**
4. Click to add it
5. Configure:
   - **Widget Position**: Bottom Right
   - **API URL**: `https://closelook-virtual-tryon.onrender.com/api`
   - (Replace with YOUR app URL)

### Step 3: Add Try-On Widget (Optional)

1. Still in Product Page customization
2. Click **"Add block"** again
3. Find **"Closelook Try-On Widget"**
4. Add it (same settings as chatbot)
5. Note: Both widgets can be in the same page

### Step 4: Save

1. Click **"Save"** in the top right
2. **Close** the editor

---

## Part 6: Test Your Installation (5 minutes)

### Step 1: Visit Your Store

1. Go to **"Online Store"** → **"Themes"**
2. Click **"Actions"** → **"Preview"**
3. Navigate to any product page

### Step 2: Test Chatbot

1. You should see a chat button in the bottom right
2. Click it to open
3. The chatbot should open smoothly
4. Try sending a message like "Show me products"
5. You should get a response

### Step 3: Test Try-On

1. In the chatbot, you should see a "Try on this product" button
2. It should be enabled (not grayed out)
3. Click it
4. Upload a photo
5. Try-on should generate

### Step 4: Check for Errors

1. Open browser console (F12)
2. Look for any red errors
3. If you see errors, check Part 8: Troubleshooting

---

## Part 7: Important Information

### How Widgets Work

**Product Pages**:
- Both widgets appear on product pages
- "Try on this product" button is **enabled**
- Full functionality works

**Other Pages** (if somehow accessed):
- Chatbot still works for general questions
- "Try on this product" button is **disabled** (grayed out)
- No errors or broken UI
- This is intentional and safe

### Widget Isolation

Your widgets are properly isolated:
- High z-index (999999) to appear above all content
- CSS isolation to prevent theme conflicts
- Won't break existing store functionality
- Works with any Shopify theme

---

## Part 8: Troubleshooting

### Problem: "Failed to load widget"

**Solution**:
1. Check that widgets were built: `ls public/widgets/*.js` (should show files)
2. Verify your API URL in widget settings is correct
3. Check browser console for specific error

### Problem: "OAuth error: redirect_uri_mismatch"

**Solution**:
1. Go to Shopify Partners → Your App → App Setup
2. Make sure redirect URL **exactly** matches: `https://your-app.onrender.com/api/shopify/auth/oauth`
3. Check for typos or trailing slashes
4. Save and try again

### Problem: Widgets not appearing

**Solution**:
1. Make sure you added blocks in Theme Editor
2. Make sure you saved the theme
3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
4. Check browser console for errors

### Problem: "Database connection error"

**Solution**:
- You can ignore this if you're not using analytics
- Or set up a Neon database (free) and add DATABASE_URL

### Problem: Chatbot doesn't respond

**Solution**:
1. Check Render logs for errors
2. Verify GOOGLE_GEMINI_API_KEY is set correctly
3. Check that SHOPIFY_APP_URL matches your Render URL

### Problem: Try-on generates errors

**Solution**:
1. Check REPLICATE_API_TOKEN is set correctly
2. Verify BLOB_READ_WRITE_TOKEN is set (for image storage)
3. Check Render logs for specific errors

---

## Part 9: Launch Checklist

Before giving to customers, verify:

- [ ] Widgets load on product pages
- [ ] Chatbot responds to messages
- [ ] Try-on works
- [ ] No console errors
- [ ] Mobile works
- [ ] Tested on 2-3 different products
- [ ] Admin dashboard loads
- [ ] App can be installed/uninstalled

---

## Part 10: Going Live

### For Multiple Stores

1. Each store needs to install the app separately
2. Use the install URL from Part 4, Step 3
3. Replace `my-test-store.myshopify.com` with the actual store

### For Shopify App Store (Optional)

1. In Partners Dashboard, complete app listing:
   - App description
   - Screenshots
   - Demo video
   - Privacy policy
   - Terms of service

2. Submit for review
3. Once approved, customers can install from App Store

---

## Quick Reference

### Important URLs

- **Partners Dashboard**: https://partners.shopify.com
- **Your App**: `https://closelook-virtual-tryon.onrender.com`
- **Install URL**: `https://your-app.onrender.com/api/shopify/auth/install?shop=STORE.myshopify.com`

### Key Commands

```bash
# Build widgets
npm run build:widgets

# Start dev server
npm run dev

# Build production
npm run build && npm run build:widgets

# Check logs in Render
# View logs in your Render dashboard
```

### Environment Variables Summary

```
SHOPIFY_API_KEY          → From Shopify Partners
SHOPIFY_API_SECRET       → From Shopify Partners
SHOPIFY_APP_URL          → Your Render URL
SHOPIFY_SCOPES           → read_products,read_content...
GOOGLE_GEMINI_API_KEY    → From makersuite.google.com
REPLICATE_API_TOKEN      → From replicate.com
BLOB_READ_WRITE_TOKEN    → From Vercel (optional)
DATABASE_URL             → From Neon (optional)
NODE_ENV                 → production
```

---

## Need Help?

1. Check this guide's troubleshooting section
2. Look at browser console for errors (F12)
3. Check Render logs in your dashboard
4. Verify all environment variables are set
5. Make sure you're on a product page to test try-on

---

## You're Done! 🎉

Your Closelook Virtual Try-On plugin is now live! 

Once installed, customers can:
- Chat with AI assistant on product pages
- Try on products virtually
- Get product recommendations
- All without leaving your store!

**Good luck with your launch!** 🚀

