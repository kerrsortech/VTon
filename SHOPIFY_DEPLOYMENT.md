# Shopify Plugin Deployment Guide

This guide covers deploying the Closelook Virtual Try-On Shopify App.

## Prerequisites

1. Shopify Partner account
2. Render account (or another hosting provider)
3. Shopify development store for testing

## Setup Steps

### 1. Create Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Create a new app
3. Note your API Key and API Secret
4. Configure OAuth redirect URL: `https://your-app.onrender.com/api/shopify/auth/oauth`
5. Set required scopes: `read_products`, `read_content`

### 2. Configure Environment Variables

Set the following environment variables in Render (or your hosting provider):

```bash
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app.onrender.com
SHOPIFY_SCOPES=read_products,read_content
SHOPIFY_SESSION_SECRET=generate_a_random_secret_key
REPLICATE_API_TOKEN=your_replicate_token
GOOGLE_GEMINI_API_KEY=your_gemini_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
NODE_ENV=production
```

### 3. Build Widget Bundles

Before deploying, build the widget bundles:

```bash
npm install
npm run build:widgets
```

This will create:
- `public/widgets/try-on-widget.js`
- `public/widgets/chatbot-widget.js`

### 4. Deploy to Render

1. Connect your repository to Render
2. Create a new Web Service
3. Configure:
   - **Build Command**: `npm install && npm run build && npm run build:widgets`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Node Version**: 18 or higher

4. Set environment variables (from step 2)

5. Deploy

### 5. Update Shopify App Configuration

1. In your Shopify app settings, update:
   - **Application URL**: `https://your-app.onrender.com`
   - **Allowed redirection URLs**: `https://your-app.onrender.com/api/shopify/auth/oauth`

2. Update `shopify-app/shopify.app.toml` with your app URL

### 6. Install App in Development Store

1. Get the install URL: `https://your-app.onrender.com/api/shopify/auth/install?shop=your-store.myshopify.com`
2. Visit the URL to initiate OAuth
3. Authorize the app
4. You should be redirected to the admin dashboard

### 7. Add App Blocks to Theme

1. Go to Shopify Admin → Online Store → Themes
2. Click "Customize" on your theme
3. Navigate to a product page
4. Click "Add block" → Find "Closelook Try-On Widget" and "Closelook Chatbot"
5. Add blocks to desired positions
6. Configure block settings (API URL, position)
7. Save theme

### 8. Test

1. Visit a product page on your storefront
2. Verify widgets load correctly
3. Test try-on functionality
4. Test chatbot functionality

## Widget CDN Setup (Optional)

For better performance, host widget bundles on a CDN:

1. Upload `public/widgets/*.js` to your CDN
2. Update `WIDGET_CDN_URL` environment variable
3. Update App Block configuration to use CDN URL

## Troubleshooting

### OAuth Issues

- Verify redirect URL matches exactly
- Check API Key and Secret are correct
- Ensure HTTPS is enabled

### Widget Not Loading

- Check browser console for errors
- Verify widget bundles are built and accessible
- Check API URL in block settings

### API Errors

- Verify environment variables are set
- Check server logs for detailed errors
- Ensure shop is authenticated (session exists)

## Production Checklist

- [ ] Environment variables configured
- [ ] Widget bundles built and deployed
- [ ] OAuth flow tested end-to-end
- [ ] Widgets tested on product pages
- [ ] Error handling tested
- [ ] Webhook handlers tested
- [ ] GDPR compliance verified (data cleanup on uninstall)

## App Store Submission

1. Complete app listing details
2. Prepare screenshots and demo video
3. Test on multiple themes
4. Submit for review

## Support

For issues, check:
- Server logs on Render
- Browser console errors
- Shopify Partner Dashboard → App Analytics

