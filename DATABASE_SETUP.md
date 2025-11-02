# Database Setup

Complete database setup guide for Closelook Virtual Try-On application.

## Overview

The application uses PostgreSQL for:
- **User Image Storage**: Persistent user photo storage across sessions
- **Analytics Tracking**: Try-on events, orders, and conversion tracking
- **Session Management**: Store Shopify OAuth sessions (production)

## Database Schema

### User Images Table

Stores user photos for try-on feature:
- `user_id`: User identifier (Shopify customer ID or anonymous ID)
- `shopify_customer_id`: Shopify customer ID (when available)
- `image_type`: Type (`fullBody` or `halfBody`)
- `image_url`: Public URL from blob storage
- `blob_filename`: Filename in blob storage
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Analytics Schema

Stores analytics data for dashboard:
- `stores`: Merchant/store information with plan details
- `try_on_events`: All try-on events per store and product
- `orders`: Shopify orders for conversion tracking
- `order_conversions`: Links try-ons to orders

## Quick Setup

### Step 1: Choose Database Provider

**Recommended: Neon (Serverless Postgres)**

1. Go to https://neon.tech
2. Create a new project
3. Copy connection string

**Alternative Providers:**
- Vercel Postgres (if using Vercel)
- Supabase
- Railway
- AWS RDS / Azure Database / GCP Cloud SQL

### Step 2: Set Environment Variable

```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

For Neon, connection string includes `?sslmode=require`.

### Step 3: Initialize Database

Run the initialization script:

```bash
pnpm run db:init
```

This will:
- Test database connection
- Create `user_images` table
- Create analytics tables (`stores`, `try_on_events`, `orders`, `order_conversions`)
- Set up indexes and triggers

### Step 4: Verify Setup

1. Upload a photo in the try-on widget
2. Check database for records in `user_images` table
3. Visit dashboard to verify analytics tracking

## Migration File

The migration file is located at:
```
lib/db/migrations/001_create_user_images.sql
```

You can run it manually against your database using any Postgres client.

## Graceful Degradation

The system is designed to work even without a database configured:
- Image uploads will still work and save to blob storage
- Database errors are logged but don't fail the upload
- The GET endpoint returns empty results if database is not configured
- Users can still use the try-on feature without database

## Environment Variables

Required (one of):
- `POSTGRES_URL` - For Vercel Postgres
- `DATABASE_URL` - For standard Postgres connection string

## Security Notes

1. **User Identification:**
   - Supports Shopify customer ID (when user is authenticated)
   - Falls back to anonymous user ID stored in HTTP-only cookie
   - User IDs are securely generated and validated

2. **Data Access:**
   - Images are stored in Vercel Blob Storage (public URLs)
   - Database only stores metadata (URLs and user mappings)
   - All database operations are parameterized to prevent SQL injection

3. **Privacy:**
   - User images are associated with user IDs
   - Shopify customer IDs are optional and only stored when available
   - Anonymous user IDs are session-based and stored in secure cookies

## Testing Without Database

The system will work without a database, but user images won't persist across sessions. To test:

1. Upload images - they'll be saved to blob storage
2. Images will be available in the current session
3. After session ends, images won't be automatically retrieved (user will need to re-upload)

## Troubleshooting

### "No database connection configured" error

This means neither `POSTGRES_URL` nor `DATABASE_URL` is set. Either:
- Set up a database and configure the environment variable, OR
- The system will work without database but won't persist images

### Module not found errors

Install the required package:
```bash
# For Vercel Postgres:
pnpm add @vercel/postgres

# For standard Postgres:
pnpm add pg
pnpm add -D @types/pg
```

### Migration errors

Ensure you have the correct permissions on your database and that the migration hasn't already been run (check if the table exists).

## Production Checklist

- [ ] Database is set up and configured
- [ ] Environment variables are set in production
- [ ] Migration has been run successfully
- [ ] Database connection is tested
- [ ] User image upload/retrieval is working
- [ ] Shopify customer ID mapping is working (if using Shopify)

