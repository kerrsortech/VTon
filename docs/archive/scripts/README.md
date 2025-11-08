# Automated Deployment & Testing Scripts

Complete automation for deploying and verifying your Shopify integration.

---

## 📁 Available Scripts

### 1. `run-migrations.sh` - Database Migration
Applies all database migrations automatically.

**Usage:**
```bash
./scripts/run-migrations.sh
```

**What it does:**
- Creates `schema_migrations` tracking table
- Runs all `.sql` files from `lib/db/migrations/`
- Skips already-applied migrations
- Verifies critical tables exist
- Shows detailed migration status

**Requirements:**
- `DATABASE_URL` environment variable must be set
- PostgreSQL client (`psql`) installed

---

### 2. `deploy-to-production.sh` - Complete Deployment
Handles the entire deployment process automatically.

**Usage:**
```bash
./scripts/deploy-to-production.sh
```

**What it does:**
1. Runs database migrations
2. Builds Next.js application
3. Commits and pushes to GitHub
4. Waits for Render.com to deploy
5. Tests backend health
6. Deploys Shopify extension
7. Shows deployment summary

**Requirements:**
- Git repository configured
- Render.com auto-deploy enabled
- Shopify CLI installed (for extension deploy)

---

### 3. `test-integration.sh` - Integration Testing
Tests all critical integration points.

**Usage:**
```bash
./scripts/test-integration.sh [backend-url]

# Example:
./scripts/test-integration.sh https://vton-1-hqmc.onrender.com
```

**What it tests:**
- Health endpoint responds correctly
- CORS headers configured properly
- API endpoints accessible
- Database connection works
- Required tables exist
- Environment variables set

**Output:**
- ✅ Green for passing tests
- ❌ Red for failing tests
- Summary with pass/fail counts

---

### 4. `verify-deployment.sh` - Deployment Verification
Quick verification that deployment was successful.

**Usage:**
```bash
./scripts/verify-deployment.sh [backend-url]

# Example:
./scripts/verify-deployment.sh https://vton-1-hqmc.onrender.com
```

**What it checks:**
- Backend is reachable
- All services healthy
- API endpoints accessible
- CORS working
- Database connected
- Required tables present

**Use case:** Run after deployment to ensure everything works.

---

## 🚀 Quick Start - Full Deployment

### Step 1: Set Environment Variables
```bash
export DATABASE_URL="postgresql://user:password@host/database"
# Other required env vars should be set on Render.com
```

### Step 2: Run Complete Deployment
```bash
./scripts/deploy-to-production.sh
```

This will handle everything automatically!

### Step 3: Verify Deployment
```bash
./scripts/verify-deployment.sh
```

---

## 📋 Manual Step-by-Step Deployment

If you prefer to run each step manually:

### 1. Database Migration
```bash
./scripts/run-migrations.sh
```

### 2. Build & Test Locally
```bash
pnpm install
pnpm build
pnpm dev
```

### 3. Push to GitHub
```bash
git add .
git commit -m "deploy: Shopify integration fixes"
git push origin main
```

### 4. Wait for Render Deploy
Monitor at: https://dashboard.render.com

### 5. Test Backend
```bash
./scripts/test-integration.sh
```

### 6. Deploy Extension
```bash
shopify app deploy
```

### 7. Verify Everything
```bash
./scripts/verify-deployment.sh
```

---

## 🐛 Troubleshooting

### Migration Fails
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check existing migrations
psql "$DATABASE_URL" -c "SELECT * FROM schema_migrations"
```

### Health Check Fails
```bash
# Test directly
curl -v https://vton-1-hqmc.onrender.com/api/health

# Check Render logs
# Go to: https://dashboard.render.com → Your Service → Logs
```

### CORS Errors
```bash
# Test CORS headers
curl -v -H "Origin: https://test.myshopify.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://vton-1-hqmc.onrender.com/api/chat
```

### Extension Deploy Fails
```bash
# Check Shopify CLI authentication
shopify whoami

# Login if needed
shopify auth logout
shopify auth login
```

---

## ⚙️ Configuration

### Required Environment Variables

**On Render.com (set in dashboard):**
- `DATABASE_URL` - PostgreSQL connection string
- `SHOPIFY_API_KEY` - From Partner Dashboard
- `SHOPIFY_API_SECRET` - From Partner Dashboard  
- `GOOGLE_GEMINI_API_KEY` - For AI features
- `REPLICATE_API_TOKEN` - For virtual try-on
- `BLOB_READ_WRITE_TOKEN` - For image storage

**Local Development:**
```bash
# Create .env.local file
cp .env.example .env.local
# Edit .env.local with your values
```

---

## 📊 Exit Codes

All scripts follow standard exit code conventions:

- `0` - Success (all checks passed)
- `1` - Failure (one or more checks failed)

Use in CI/CD:
```bash
if ./scripts/verify-deployment.sh; then
    echo "Deployment successful!"
else
    echo "Deployment failed!"
    exit 1
fi
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Use `.env.example` as template
2. **DATABASE_URL contains credentials** - Keep it secret
3. **Run migrations on backup first** - Test before production
4. **Review migration SQL** - Understand what will change

---

## 📝 Logging

All scripts output detailed logs with:
- ✅ Success indicators (green)
- ❌ Failure indicators (red)
- ⚠️  Warnings (yellow)
- ℹ️  Info messages

Save logs for debugging:
```bash
./scripts/deploy-to-production.sh 2>&1 | tee deploy.log
```

---

## 🆘 Getting Help

If scripts fail:

1. **Check the output** - Scripts show detailed error messages
2. **Review logs** - Render.com dashboard has full logs
3. **Verify env vars** - Most issues are missing config
4. **Test manually** - Run individual commands to isolate issue

Common issues documented in: `DEPLOYMENT_GUIDE.md` → Troubleshooting

---

## 🔄 Updating Scripts

Scripts are located in: `/scripts/`

To update:
1. Edit the script file
2. Test locally
3. Commit changes
4. Deploy

Scripts are version-controlled, so you can always roll back.

---

**Last Updated:** November 3, 2025  
**Version:** 1.0.0

