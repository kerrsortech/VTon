# Closelook Deployment Guide

Complete deployment guide for the Closelook Virtual Try-On Shopify Plugin and Analytics Dashboard.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Shopify Plugin Deployment](#shopify-plugin-deployment)
3. [Dashboard Deployment](#dashboard-deployment)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Build & Deploy](#build--deploy)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

1. **Shopify Partner Account**
   - Sign up at https://partners.shopify.com
   - Create a new app in the Partners Dashboard
   - 📘 **Detailed setup guide**: [SHOPIFY_ACCOUNT_SETUP.md](./SHOPIFY_ACCOUNT_SETUP.md)

2. **Hosting Provider** (Choose one):
   - Render (recommended for simplicity)
   - Vercel (recommended for Next.js)
   - Railway
   - AWS/Azure/GCP

3. **Database Provider**:
   - Neon (recommended for serverless)
   - Vercel Postgres (if using Vercel)
   - Supabase
   - Any PostgreSQL provider

4. **Storage Provider**:
   - Vercel Blob Storage (recommended)
   - AWS S3
   - Cloudinary

### Required API Keys

- **Shopify API Key & Secret** (from Partners Dashboard)
- **Google Gemini API Key** (for AI chatbot)
- **Replicate API Token** (for try-on generation)
- **Blob Storage Token** (Vercel Blob or alternative)

---

## Shopify Plugin Deployment

### Step 1: Create Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Click "Apps" → "Create app"
3. Choose "Create app manually"
4. Enter app details:
   - Name: "Closelook Virtual Try-On"
   - App URL: `https://your-app-domain.com` (will update after deployment)
5. Note your **API Key** and **API Secret**

### Step 2: Configure App Settings

In your Shopify app settings:

1. **App URL**: `https://your-app-domain.com`
2. **Allowed redirection URLs**:
   ```
   https://your-app-domain.com/api/shopify/auth/oauth
   ```
3. **Required Scopes**:
   ```
   read_products,read_content,read_orders,read_customers,write_customers
   ```
4. **Theme app extensions**: Enabled

### Step 3: Deploy Application

See [Build & Deploy](#build--deploy) section below.

### Step 4: Update App Configuration

After deployment, update:
- App URL in Shopify Partners Dashboard
- OAuth redirect URL
- Update `shopify-app/shopify.app.toml` with your app URL

### Step 5: Install App in Store

1. Get install URL: `https://your-app-domain.com/api/shopify/auth/install?shop=your-store.myshopify.com`
2. Visit URL in browser
3. Authorize the app
4. You'll be redirected to admin dashboard

### Step 6: Add Widgets to Theme

1. Go to Shopify Admin → Online Store → Themes
2. Click "Customize" on your active theme
3. Navigate to a product page
4. Click "Add block"
5. Find and add:
   - **Closelook Try-On Widget**
   - **Closelook Chatbot**
6. Configure blocks:
   - Set API URL: `https://your-app-domain.com`
   - Configure positioning and styling
7. Save theme

### Step 7: Configure Webhooks

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Create webhook:
   - **Event**: Order creation
   - **Format**: JSON
   - **URL**: `https://your-app-domain.com/api/shopify/webhooks/orders-create`
   - Enable HMAC verification (if implemented)
3. Save webhook

---

## Dashboard Deployment

The analytics dashboard can be deployed in two ways:

### Option A: Same Domain (Recommended)

Deploy dashboard on the same domain as the main app:
- Main app: `https://your-app-domain.com`
- Dashboard: `https://your-app-domain.com/dashboard`

This is the default setup - no additional configuration needed.

### Option B: Separate Portal

Deploy dashboard on a separate subdomain/port:
- Main app: `https://your-app-domain.com`
- Dashboard: `https://dashboard.your-app-domain.com` or `https://your-app-domain.com:3001`

For separate portal deployment:

1. Update `app/dashboard/page.tsx` API URL:
   ```typescript
   const apiUrl = 'https://your-app-domain.com' // Update this
   ```

2. Configure CORS if needed (for cross-domain requests)

3. Access dashboard: `https://dashboard.your-app-domain.com/dashboard?shop=your-store.myshopify.com`

### Dashboard Access

Store owners access the dashboard at:
```
https://your-app-domain.com/dashboard?shop=your-store.myshopify.com
```

Or from the Shopify admin app interface (if embedded).

---

## Database Setup

### Step 1: Create Database

**Option A: Neon (Recommended)**

1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy connection string (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

**Option B: Vercel Postgres (if using Vercel)**

```bash
vercel postgres create
```

**Option C: Any PostgreSQL Provider**

- Supabase
- Railway
- AWS RDS
- Azure Database

### Step 2: Run Migrations

1. Set `DATABASE_URL` environment variable
2. Run initialization:

```bash
pnpm run db:init
```

This creates:
- `user_images` table (for user photo storage)
- `stores` table (for analytics)
- `try_on_events` table (for tracking)
- `orders` table (for conversion tracking)
- `order_conversions` table (for matching)

Or run manually:

```bash
# Run all migrations
pnpm run db:migrate

# Or use psql directly
psql $DATABASE_URL < lib/db/migrations/001_create_user_images.sql
psql $DATABASE_URL < lib/db/migrations/002_create_analytics_schema.sql
```

### Step 3: Verify Database

Test connection by uploading a photo in the widget. Check database for records.

---

## Environment Variables

### Required Variables

Create `.env.local` for development or set in your hosting provider:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app-domain.com
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers
SHOPIFY_SESSION_SECRET=generate_a_random_secret_key_here

# AI Services
REPLICATE_API_TOKEN=your_replicate_api_token
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Optional
NODE_ENV=production
USE_SERVERLESS=true
ENABLE_STRUCTURED_LOGGING=true
```

### Environment Variable Descriptions

- **SHOPIFY_API_KEY**: Your Shopify app API key
- **SHOPIFY_API_SECRET**: Your Shopify app API secret
- **SHOPIFY_APP_URL**: Your deployed app URL
- **SHOPIFY_SCOPES**: Required Shopify API permissions
- **SHOPIFY_SESSION_SECRET**: Random secret for session encryption (generate with `openssl rand -base64 32`)
- **REPLICATE_API_TOKEN**: Get from https://replicate.com
- **GOOGLE_GEMINI_API_KEY**: Get from https://ai.google.dev
- **DATABASE_URL**: PostgreSQL connection string
- **BLOB_READ_WRITE_TOKEN**: Vercel Blob storage token

---

## Build & Deploy

### Build Widgets

Before deployment, build the widget bundles:

```bash
# Install dependencies
pnpm install

# Build Next.js app
pnpm run build

# Build widget bundles (if using webpack)
# Widgets are already built during Next.js build if configured
```

Widget bundles are output to:
- `public/widgets/try-on-widget.js`
- `public/widgets/chatbot-widget.js`

### Deploy to Render

1. **Connect Repository**:
   - Go to https://render.com
   - New → Web Service
   - Connect your GitHub/GitLab repository

2. **Configure Service**:
   - **Name**: closelook-app
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm start`
   - **Node Version**: 18 or higher

3. **Set Environment Variables**:
   - Add all variables from [Environment Variables](#environment-variables) section

4. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy automatically

5. **Update URLs**:
   - Note your Render URL (e.g., `https://closelook-app.onrender.com`)
   - Update Shopify app settings with this URL
   - Update `shopify-app/shopify.app.toml`

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Configure Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from [Environment Variables](#environment-variables) section

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

5. **Update URLs**:
   - Note your Vercel URL
   - Update Shopify app settings
   - Update `shopify-app/shopify.app.toml`

### Deploy to Other Providers

The application is a standard Next.js app. Deploy using your provider's Next.js deployment guide:

- **Railway**: Connect repo, set environment variables, deploy
- **AWS**: Use Amplify or Elastic Beanstalk
- **Azure**: Use Azure App Service
- **GCP**: Use Cloud Run or App Engine

---

## Post-Deployment

### 1. Verify Deployment

- [ ] App is accessible at your domain
- [ ] Widget bundles are accessible: `https://your-domain.com/widgets/try-on-widget.js`
- [ ] API routes respond: `https://your-domain.com/api/products`

### 2. Test OAuth Flow

1. Visit: `https://your-domain.com/api/shopify/auth/install?shop=your-store.myshopify.com`
2. Complete OAuth authorization
3. Verify redirect to admin dashboard
4. Check session storage (database/Redis)

### 3. Test Widgets

1. Visit a product page in your Shopify store
2. Verify widgets load (check browser console)
3. Test try-on functionality
4. Test chatbot functionality

### 4. Test Analytics

1. Perform a try-on in your store
2. Visit dashboard: `https://your-domain.com/dashboard?shop=your-store.myshopify.com`
3. Verify analytics data appears

### 5. Configure Custom Domain (Optional)

If using a custom domain:

1. Add domain to your hosting provider
2. Update DNS records
3. Update Shopify app settings with new domain
4. Update `shopify-app/shopify.app.toml`

**Note**: The plugin works on any domain (custom or myshopify.com) as long as `window.Shopify.shop` is available.

---

## Troubleshooting

### OAuth Issues

**Problem**: OAuth redirect fails

**Solutions**:
- Verify redirect URL matches exactly in Shopify app settings
- Check API Key and Secret are correct
- Ensure HTTPS is enabled (required for OAuth)
- Check server logs for detailed errors

### Widget Not Loading

**Problem**: Widgets don't appear on product pages

**Solutions**:
- Verify widgets are built and accessible: `https://your-domain.com/widgets/try-on-widget.js`
- Check browser console for errors
- Verify API URL in block settings matches your domain
- Check theme compatibility (some themes may need customization)

### Database Connection Errors

**Problem**: Database connection fails

**Solutions**:
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from your hosting provider
- Ensure SSL is enabled (most cloud databases require it)
- Verify database migrations have been run

### API Errors

**Problem**: API endpoints return errors

**Solutions**:
- Check environment variables are set
- Verify API keys are valid
- Check server logs for detailed errors
- Ensure shop is authenticated (session exists)

### Widget Bundle Errors

**Problem**: Widgets fail to load or have errors

**Solutions**:
- Rebuild widgets: `pnpm run build:widgets` (if separate build step)
- Check webpack/build configuration
- Verify widget files are in `public/widgets/`
- Check browser console for specific errors

### Analytics Not Tracking

**Problem**: Dashboard shows no data

**Solutions**:
- Verify database migrations ran successfully
- Check try-on events are being tracked (check `try_on_events` table)
- Verify webhooks are configured and working
- Check dashboard API: `https://your-domain.com/api/analytics/dashboard?shop=your-store.myshopify.com`

### Session Storage Issues

**Problem**: Shopify features don't work after restart

**Solutions**:
- **Critical**: Use database or Redis for session storage in production
- Current in-memory storage won't persist across restarts
- See `lib/shopify/session-storage.ts` for implementation
- For production, implement database-backed session storage

---

## Production Checklist

### Before Going Live

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Widget bundles built and accessible
- [ ] OAuth flow tested end-to-end
- [ ] Widgets tested on product pages
- [ ] Analytics tracking verified
- [ ] Webhooks configured and tested
- [ ] Error handling tested
- [ ] Session storage implemented (database/Redis)
- [ ] HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and logging set up
- [ ] Rate limiting considered
- [ ] Backup strategy in place

### Security Checklist

- [ ] Environment variables are secure (not in code)
- [ ] API keys are rotated if exposed
- [ ] HTTPS is enforced
- [ ] Session encryption is enabled
- [ ] Database credentials are secure
- [ ] Input validation is enabled
- [ ] XSS protection is enabled
- [ ] SQL injection protection (parameterized queries)

---

## Support

For issues:
- Check server logs on your hosting provider
- Check browser console for client errors
- Review this deployment guide
- Check [Troubleshooting](#troubleshooting) section

---

## Additional Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Neon Database Docs](https://neon.tech/docs)
- [Vercel Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)

