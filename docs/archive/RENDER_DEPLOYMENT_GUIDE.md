# Render Deployment Guide - VTon Virtual Try-On Platform

**Last Updated**: November 3, 2025  
**Status**: PRODUCTION READY

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Deployment](#step-by-step-deployment)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Shopify Configuration](#shopify-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

### Required Accounts
- [ ] Render account (https://render.com) - free tier works
- [ ] Neon Postgres account (https://neon.tech) - free tier sufficient
- [ ] Shopify Partners account (https://partners.shopify.com)
- [ ] Shopify test store or live store
- [ ] Google Gemini API key
- [ ] Replicate API token
- [ ] Vercel Blob storage (integrated with Vercel)

### Required Tools
- [ ] Git installed
- [ ] Node.js 18+ installed locally
- [ ] npm/pnpm package manager

---

## Step-by-Step Deployment

### Step 1: Prepare Your Local Code

```bash
# Navigate to project directory
cd /Users/gautam/Documents/VTon

# Install dependencies
npm install

# Build widgets first (required for production)
npm run build:widgets

# Build the Next.js app
npm run build

# Verify no build errors
echo "Build completed successfully!"
```

### Step 2: Create Neon Postgres Database

1. Go to https://console.neon.tech/
2. Click "New Project"
3. Configure:
   - Project name: `closelook-prod` (or your choice)
   - Region: Select closest to your location
   - Database name: `closelook`
   - Role name: `postgres`

4. Copy the connection string (looks like):
   ```
   postgresql://user:password@host:5432/dbname
   ```

5. Copy this as your `DATABASE_URL` - you'll need it for Render

### Step 3: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select "Build and deploy from a Git repository"
4. Connect your GitHub repository
5. Fill in the form:

   **Basic Settings:**
   - Name: `vton` (or your preferred name)
   - Runtime: `Node`
   - Region: Select closest to your users
   - Branch: `main` (or your deploy branch)

   **Build Settings:**
   - Build Command:
     ```
     npm run build:widgets && npm run build
     ```
   - Start Command:
     ```
     npm start
     ```

   **Plan:** Select "Free" tier (sufficient for testing)

6. Don't click "Create Web Service" yet - proceed to Step 4

### Step 4: Add Environment Variables in Render

**Before deploying**, add ALL environment variables:

1. In Render dashboard, scroll down to "Environment"
2. Add each variable from `.env.example`:

**Critical Variables:**
```
GOOGLE_GEMINI_API_KEY=<your_api_key>
REPLICATE_API_TOKEN=<your_token>
BLOB_READ_WRITE_TOKEN=<your_token>
DATABASE_URL=<from_neon>
SHOPIFY_API_KEY=<from_shopify>
SHOPIFY_API_SECRET=<from_shopify>
SHOPIFY_SESSION_SECRET=<generate_random_secret>
SHOPIFY_STOREFRONT_TOKEN=<from_shopify>
SHOPIFY_APP_URL=https://<your-render-url>.onrender.com
NODE_ENV=production
```

### Step 5: Deploy to Render

1. Click "Create Web Service"
2. Render will automatically:
   - Pull your code from GitHub
   - Install dependencies
   - Run build commands
   - Start the application

3. Monitor the logs:
   - Click "Logs" tab
   - Watch for any build or runtime errors
   - Typical build time: 5-10 minutes

4. Once deployed, get your public URL:
   - Copy from top of dashboard
   - Format: `https://vton-abc123.onrender.com`

### Step 6: Run Database Migrations

After deployment:

```bash
# Option A: Via Render shell (if available)
# In Render dashboard, click "Shell" and run:
npm run db:migrate

# Option B: Via terminal (if you have database access)
DATABASE_URL="your_neon_connection_string" npm run db:migrate
```

### Step 7: Configure Shopify App

1. Go to Shopify Partners dashboard
2. Click your app → Settings
3. Update these settings:

   **App URLs:**
   - App URL: `https://vton-abc123.onrender.com`
   - Allowed redirect URLs: 
     ```
     https://vton-abc123.onrender.com/api/shopify/auth/oauth
     ```

4. Save and reinstall the app on your test store

---

## Environment Variables

### Critical Variables (Must Set)

| Variable | Source | Example |
|----------|--------|---------|
| `GOOGLE_GEMINI_API_KEY` | https://aistudio.google.com/app/apikeys | `AIzaSyDx...` |
| `REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens | `r8_xxx...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard | `vercel_blob_rw_xxx...` |
| `DATABASE_URL` | Neon console | `postgresql://...` |
| `SHOPIFY_API_KEY` | Shopify app settings | `95615e8665...` |
| `SHOPIFY_API_SECRET` | Shopify app settings | `shpca_xxx...` |
| `SHOPIFY_STOREFRONT_TOKEN` | Shopify admin | `90ef052...` |
| `SHOPIFY_SESSION_SECRET` | Generate random | Random 32+ char string |
| `SHOPIFY_APP_URL` | Your Render URL | `https://vton-abc.onrender.com` |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Log verbosity | `info` |
| `USE_SERVERLESS` | Neon serverless | `true` |
| `CORS_ALLOWED_ORIGINS` | CORS whitelist | `localhost:3000` |

---

## Database Setup

### Create Tables on First Deploy

The database tables are defined in `lib/db/user-images.ts`:

```typescript
// Tables automatically created by migration script:
// - user_images (stores user upload metadata)
// - shopify_sessions (stores OAuth sessions) - NEEDS MIGRATION
// - analytics (stores usage data)
```

### Manual Migration (if automatic fails)

```bash
# Connect to Neon database
psql "your_database_url"

# Run SQL from lib/db/user-images.ts
-- Create user_images table
CREATE TABLE IF NOT EXISTS user_images (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  shopify_customer_id VARCHAR(255),
  image_type VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  blob_filename TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, image_type)
);

CREATE INDEX idx_user_images_user_id ON user_images(user_id);
CREATE INDEX idx_user_images_shopify_customer_id ON user_images(shopify_customer_id);
```

---

## Shopify Configuration

### 1. Get Credentials

**API Key & Secret:**
1. Shopify Partners → Your Apps
2. Click your app
3. Configuration tab
4. Copy Client ID and Client secret

**Storefront Token:**
1. Shopify Admin Dashboard
2. Settings → Apps and Integrations
3. Develop Apps section
4. Click your app
5. Configuration tab
6. Admin API access scopes section
7. Generate token

### 2. Test OAuth Flow

```bash
# Visit this URL in your browser:
https://vton-abc123.onrender.com/api/shopify/auth/install?shop=your-store.myshopify.com

# You should be redirected to Shopify OAuth
# After authorizing, you'll be redirected back to your app
```

### 3. Verify Installation

Check that:
- Session is stored in database
- App appears in your Shopify store's apps list
- Widgets load on product pages

---

## Troubleshooting

### Build Fails

**Error**: `Failed to build widgets`
```bash
# Fix: Install widget dependencies first
npm run build:widgets

# Check for Node version
node --version  # Should be 18+
```

**Error**: `npm ERR! Cannot find module`
```bash
# Fix: Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails

**Error**: `Build command timed out`
- Increase timeout in Render dashboard (build times can be 10-15 mins)
- Or split build into smaller chunks

**Error**: `Database connection refused`
- Verify DATABASE_URL is correct
- Check Neon database is running
- Ensure IP whitelist includes Render's IPs (usually automatic)

### Runtime Errors

**Error**: `GOOGLE_GEMINI_API_KEY not set`
- Check environment variable is set in Render dashboard
- Verify there are no typos in variable name
- Restart web service after adding variables

**Error**: `SHOPIFY_API_KEY missing`
- Go to Shopify Partners dashboard
- Verify API credentials are correct
- Re-enter them in Render environment

### API Timeouts

**Error**: `Try-on generation timeout`
- Image generation can take 2-3 minutes
- Ensure API route has `maxDuration: 300` (5 minutes)
- Check that all routes have config set (see main code)

**Error**: `Product fetch timeout`
- Shopify API is slow with large catalogs
- Ensure route has `maxDuration: 60` (minimum 1 minute)
- Check internet connection on Render

### Image Upload Fails

**Error**: `Blob storage not configured`
- Verify BLOB_READ_WRITE_TOKEN is set
- Token should have write permissions
- Check Vercel account has sufficient storage

**Error**: `Image not saved to database`
- Check DATABASE_URL is correct
- Verify user_images table exists
- Check logs for SQL errors

---

## Post-Deployment Verification

### Checklist

After deployment, verify these features work:

- [ ] **Chatbot Loads**
  ```
  Visit: https://vton-abc123.onrender.com
  Should see chat widget in bottom right
  ```

- [ ] **Products Fetch**
  ```
  Chat: "Show me products"
  Should display product list
  ```

- [ ] **Image Upload Works**
  ```
  Click upload button in chatbot
  Select an image
  Should upload successfully
  ```

- [ ] **Try-On Generates**
  ```
  Click "Try on this product"
  Wait for image generation
  Should display generated image
  ```

- [ ] **Order History Works**
  ```
  Chat: "What are my orders?"
  Should fetch and display orders
  ```

- [ ] **Policies Display**
  ```
  Chat: "What's your return policy?"
  Should show store policies
  ```

- [ ] **User Personalization**
  ```
  Chat: "What's my name?"
  If logged in as customer, should use their name
  ```

- [ ] **No Console Errors**
  ```
  Open browser console (F12)
  Should have no red errors
  Only warnings/info is fine
  ```

### Monitoring

Check Render logs regularly for:

```
✅ Healthy signs:
- "[INFO] Try-on request started"
- "[INFO] Product analysis successful"
- "Listening on port 3000"

❌ Error signs:
- "[ERROR]" messages
- "Database connection failed"
- "Timeout" errors
- "ENOENT" file not found
```

---

## Maintenance

### Regular Checks

**Weekly:**
- Monitor error logs
- Check storage usage
- Verify all APIs responding

**Monthly:**
- Review performance metrics
- Update dependencies: `npm outdated`
- Backup database (Neon automatic)

### Scaling

If traffic increases:

1. **Upgrade Render plan** from Free to Starter
   - More reliable
   - Better performance
   - Better support

2. **Add caching**
   - Redis for session storage
   - CloudFlare for CDN

3. **Optimize database**
   - Add indexes
   - Archive old analytics

### Redeployment

To redeploy after code changes:

```bash
# Push to GitHub
git add .
git commit -m "Production update"
git push origin main

# Render will automatically redeploy
# Monitor in Render dashboard
```

---

## Support

### Documentation
- `PRODUCTION_REVIEW.md` - Complete system review
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `.env.example` - All environment variables

### Getting Help

**Render Support:**
- https://render.com/docs
- https://render.com/support

**Shopify Support:**
- https://shopify.dev
- https://shopify.com/partners/support

**Database Support:**
- Neon docs: https://neon.tech/docs
- PostgreSQL: https://www.postgresql.org/docs

---

## Security Reminders

- ⚠️ Never commit `.env.local` with real values
- ⚠️ Rotate API keys every 3 months
- ⚠️ Use strong session secret (32+ characters)
- ⚠️ Enable HTTPS (Render does this automatically)
- ⚠️ Monitor for unusual API usage
- ⚠️ Validate all Shopify webhooks with HMAC

---

## Production Readiness Checklist

- [ ] All environment variables set
- [ ] Database migrations completed
- [ ] Shopify app configured
- [ ] OAuth flow tested
- [ ] All features verified
- [ ] Error handling working
- [ ] Logs monitored
- [ ] Backups configured
- [ ] Team notified
- [ ] Monitoring alerts set

---

**Ready to Deploy!**

If you encounter any issues, check the Troubleshooting section or review the `PRODUCTION_REVIEW.md` document for detailed system architecture and fixes.
