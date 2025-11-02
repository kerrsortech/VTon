# Shopify Account Setup Guide

Complete guide to setting up your Shopify Partner account and deploying the Closelook Virtual Try-On plugin.

---

## Table of Contents

1. [Overview](#overview)
2. [Step 1: Create Shopify Partners Account](#step-1-create-shopify-partners-account)
3. [Step 2: Create Your App](#step-2-create-your-app)
4. [Step 3: Get API Credentials](#step-3-get-api-credentials)
5. [Step 4: Configure App Settings](#step-4-configure-app-settings)
6. [Step 5: Create Development Store](#step-5-create-development-store)
7. [Next Steps](#next-steps)

---

## Overview

To deploy the Closelook Virtual Try-On plugin, you need:

1. **Shopify Partners Account** (Free) - Required to develop and distribute apps
2. **App Created in Partners Dashboard** - Your app configuration
3. **API Key & Secret** - Authentication credentials
4. **Development Store** - Testing environment

**Time Required**: 15-20 minutes  
**Cost**: Free (for development)

---

## Step 1: Create Shopify Partners Account

### 1.1 Sign Up

1. Go to **https://partners.shopify.com**
2. Click **"Sign up"** (top right)
3. Choose **"Create Partner Account"**

### 1.2 Fill Out Registration

You'll need to provide:
- **First Name** & **Last Name**
- **Email Address** (use one you have access to)
- **Phone Number**
- **Country**
- **Company Name** (can be your personal name)

### 1.3 Complete Your Profile

1. Verify your email (check your inbox)
2. Answer a few questions about your development goals
3. Accept the Partner Terms of Service
4. Click **"Complete"**

### 1.4 Access Partners Dashboard

You should now see the Partners Dashboard with sections for:
- **Apps** - Your applications
- **Development stores** - Test stores
- **Payments** - Payout settings (if monetizing)
- **Resources** - Documentation and tools

✅ **Step 1 Complete!** You now have a Shopify Partners account.

---

## Step 2: Create Your App

### 2.1 Navigate to Apps

1. In Partners Dashboard, click **"Apps"** in the left sidebar
2. Click **"Create app"** button (top right)

### 2.2 Choose App Creation Method

You'll see two options:
- **"Create app manually"** ← Choose this (recommended)
- **"Create app with CLI"** (for advanced developers)

Select **"Create app manually"**.

### 2.3 Enter App Details

Fill in the form:
- **App name**: `Closelook Virtual Try-On` (or your preferred name)
- **App URL**: Leave blank for now (we'll update after deployment)
- **Developer email**: Your email address

Click **"Create app"**.

### 2.4 Wait for Setup

Shopify will create your app configuration. This takes 10-30 seconds.

✅ **Step 2 Complete!** Your app is created.

---

## Step 3: Get API Credentials

### 3.1 Find Your Credentials

After creating the app, you'll see the **"Overview"** tab with your app details.

Look for the **"API credentials"** section. You should see:

- **Client ID** - This is your `SHOPIFY_API_KEY`
- **Client secret** - This is your `SHOPIFY_API_SECRET` (click "Reveal" to show it)

**⚠️ Important**: Copy these values immediately and keep them secure!

### 3.2 Save Your Credentials

Save them in a safe place - you'll need them for:
- Environment variables in your hosting provider
- Local development setup
- OAuth configuration

**Format:**
```
SHOPIFY_API_KEY=abc123def456...
SHOPIFY_API_SECRET=xyz789...
```

✅ **Step 3 Complete!** You have your API credentials.

---

## Step 4: Configure App Settings

### 4.1 Open App Setup

1. Click **"App setup"** in the left sidebar
2. You'll see several configuration sections

### 4.2 Configure URLs

**Current App URL:**
- Set this after you deploy to hosting (Render, Vercel, etc.)
- For now: Leave blank or use `https://localhost` as placeholder

**Allowed redirection URLs:**
- Add this URL: `https://your-app.onrender.com/api/shopify/auth/oauth`
- **Replace `your-app.onrender.com` with your actual hosting URL**
- We'll come back to update this after deployment

### 4.3 Configure Scopes

Click on **"Configuration"** tab, then **"Scopes"**:

**Add these scopes:**

- ✅ `read_products` - Read product information
- ✅ `read_content` - Read store content
- ✅ `read_orders` - Read order information (for analytics)
- ✅ `read_customers` - Read customer information (optional)
- ✅ `write_customers` - Write customer data (optional)

**Note**: You can add more scopes later if needed.

Click **"Save"** if prompted.

### 4.4 Enable Extensions (Optional)

If you see **"Theme app extensions"** or **"App extensions"**:
- Enable them (they're needed for the widgets to appear in store themes)

### 4.5 Save Configuration

Make sure to click **"Save"** for any changes you make.

✅ **Step 4 Complete!** Your app is configured (URLs will be updated after deployment).

---

## Step 5: Create Development Store

### 5.1 Navigate to Development Stores

1. In Partners Dashboard, click **"Development stores"** in left sidebar
2. Click **"Add store"** button

### 5.2 Choose Store Details

Fill in the form:

**Store preferences:**
- **Store name**: `My Test Store` (or any name)
- **Store purpose**: Select **"Development store"**
- **Your role**: Select **"Administrator"** or **"Collaborator"**

Click **"Create store"**.

### 5.3 Wait for Store Creation

Shopify will create your development store. This takes 1-2 minutes.

**Note**: You'll receive an email when your store is ready.

### 5.4 Access Your Store

Once created, you can:
1. **View Store**: Click **"View store"** to see the storefront
2. **Manage Store**: Click **"Manage"** to access Shopify Admin

### 5.5 Store Information

Your store will have a URL like:
```
your-store-name.myshopify.com
```

**Save this URL** - you'll need it for:
- Installing your app
- Testing widgets
- OAuth installation flow

✅ **Step 5 Complete!** You have a development store ready for testing.

---

## Next Steps

### Immediate Next Steps

Now that your Shopify account is set up, follow these guides in order:

1. **📘 [DEPLOY.md](./DEPLOY.md)** - Complete deployment guide
   - Deploy your app to hosting (Render/Vercel)
   - Configure environment variables
   - Update Shopify app URLs

2. **📊 [DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database configuration
   - Set up PostgreSQL (Neon recommended)
   - Run migrations
   - Configure analytics tracking

3. **📈 [DASHBOARD_SETUP.md](./DASHBOARD_SETUP.md)** - Analytics dashboard
   - Configure dashboard access
   - Set up webhooks
   - Test tracking

### Quick Reference

**Your Shopify App:**
- Partners Dashboard: https://partners.shopify.com
- App ID: See in Overview tab
- API Key: See in Overview tab (Client ID)
- API Secret: See in Overview tab (Client secret)

**Environment Variables Needed:**
```bash
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-app.onrender.com
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers
SHOPIFY_SESSION_SECRET=generate_random_secret
```

**Generate Session Secret:**
```bash
openssl rand -base64 32
```

### Coming Back After Deployment

After you deploy your app to hosting, come back to Shopify Partners Dashboard:

1. **Update App URL** in App Setup → Application URL
2. **Update Redirect URL** in App Setup → Allowed redirection URLs
3. **Test Installation** using install URL

---

## Common Issues

### Issue: "Email already registered"

**Solution**: You already have a Partners account. Use "Sign in" instead.

### Issue: Can't find API credentials

**Solution**: 
1. Make sure you're in the correct app
2. Check "Overview" tab (not "App setup")
3. Click "Reveal" to show the Client secret

### Issue: Development store creation fails

**Solution**:
1. Wait a few minutes and try again
2. Make sure your Partners account is fully verified
3. Check if you have too many development stores (limit is 100)

### Issue: Can't enable scopes

**Solution**:
- Some scopes require additional verification
- Make sure you're saving after selecting scopes
- Try refreshing the page

---

## Useful Links

- **Partners Dashboard**: https://partners.shopify.com
- **App Documentation**: https://shopify.dev/docs/apps
- **API Reference**: https://shopify.dev/docs/api
- **Community**: https://community.shopify.com

---

## Security Notes

1. **Never share your API Secret** publicly or in code
2. **Keep API credentials secure** - use environment variables
3. **Rotate secrets** if you suspect compromise
4. **Use HTTPS** for all production URLs
5. **Follow OAuth best practices** for authentication

---

## Support

If you encounter issues:

1. Check this guide's "Common Issues" section
2. Review [Shopify Partners Help](https://help.shopify.com/en/partners)
3. Contact Shopify Support through Partners Dashboard
4. Check the [Troubleshooting](#troubleshooting) section in DEPLOY.md

---

## Summary Checklist

- [ ] Created Shopify Partners account
- [ ] Verified email address
- [ ] Created app in Partners Dashboard
- [ ] Copied API Key and Secret
- [ ] Configured app scopes
- [ ] Enabled theme app extensions
- [ ] Created development store
- [ ] Saved store URL (myshopify.com)
- [ ] Ready for deployment

---

**✅ Setup Complete!** 

Proceed to [DEPLOY.md](./DEPLOY.md) to deploy your app.


