# Running Database Migration on Render

This guide shows how to run the database migration to create the `stores` table on Render.

## Option 1: Run Migration via Render Shell (Recommended)

1. **Go to Render Dashboard**
   - Navigate to your service
   - Click on **"Shell"** tab (or use Render's SSH/Shell access)

2. **Run the Migration Script**
   ```bash
   npm run db:migrate
   ```
   
   Or run the migration directly:
   ```bash
   node scripts/migrate-db.js
   ```

3. **Verify Migration**
   The script will create:
   - `stores` table
   - `try_on_events` table
   - `orders` table
   - `order_conversions` table
   - All necessary indexes

## Option 2: Run SQL Directly in Neon

1. **Go to Neon Dashboard**
   - Navigate to your Neon project
   - Click on **SQL Editor**

2. **Copy and Run Migration SQL**
   - Open: `lib/db/migrations/002_create_analytics_schema.sql`
   - Copy the entire SQL content
   - Paste into Neon SQL Editor
   - Click **Run**

## Option 3: Add to Build Command

If you want to auto-run migrations on each deploy (optional):

1. **Go to Render Dashboard**
   - Your service → Settings → Build Command
   
2. **Update Build Command**
   ```
   npm run db:migrate && npm run build:widgets && next build
   ```

   **Note:** This runs the migration on every deploy, which is safe with `IF NOT EXISTS` clauses.

## Quick SQL (If Migration Script Doesn't Work)

If you need to quickly create just the stores table, run this in Neon SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  shop_name VARCHAR(255),
  access_token TEXT,
  plan_id VARCHAR(50) DEFAULT 'free',
  plan_name VARCHAR(100) DEFAULT 'Free Plan',
  plan_limits JSONB DEFAULT '{"try_ons": 100, "orders": 1000}'::jsonb,
  plan_usage JSONB DEFAULT '{"try_ons": 0, "orders": 0}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_shop_domain ON stores(shop_domain);
```

## Verify Migration Success

After running the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stores', 'try_on_events', 'orders', 'order_conversions');
```

You should see all 4 tables listed.

## Troubleshooting

### Error: "relation already exists"
This is fine! The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Error: "permission denied"
Make sure your `DATABASE_URL` in Render has proper permissions (owner/creator role).

### Error: "connection refused"
Verify your `DATABASE_URL` is correct in Render environment variables.

