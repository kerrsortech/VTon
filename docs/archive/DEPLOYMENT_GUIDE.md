# SHOPIFY INTEGRATION - DEPLOYMENT GUIDE

**Status:** ✅ Critical Fixes Applied - Ready for Deployment  
**Date:** November 3, 2025

---

## 🎯 OVERVIEW

All critical blockers have been fixed. This guide will help you deploy the fixes to production and test in a real Shopify store.

### What Was Fixed
1. ✅ CORS support for custom domains
2. ✅ Database session storage (PostgreSQL)
3. ✅ Storefront token generation
4. ✅ Removed client-side product fetching
5. ✅ Added health check endpoint

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Database Setup

**Run Migration:**
```bash
# Option 1: Using psql
psql $DATABASE_URL < lib/db/migrations/003_shopify_sessions.sql

# Option 2: Using Node.js script
node scripts/migrate-db.js
```

**Verify Migration:**
```sql
-- Connect to your database
psql $DATABASE_URL

-- Check table exists
\dt shopify_sessions

-- Check schema
\d shopify_sessions

-- Expected columns:
-- - id (serial primary key)
-- - shop (varchar, unique)
-- - access_token (text)
-- - scope (text)
-- - expires (timestamp)
-- - is_online (boolean)
-- - storefront_token (text)
-- - custom_domain (varchar)
-- - created_at (timestamp)
-- - updated_at (timestamp)
```

### 2. Environment Variables

**Required Variables:**
```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard

# AI Services
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_token

# Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# App URLs
SHOPIFY_APP_URL=https://vton-1-hqmc.onrender.com
RENDER_EXTERNAL_URL=https://vton-1-hqmc.onrender.com
```

**Verify Variables:**
```bash
# Check on Render.com Dashboard:
# 1. Go to your service
# 2. Navigate to Environment tab
# 3. Verify all variables are set
# 4. Save changes and trigger redeploy if needed
```

### 3. Shopify App Configuration

**Update App URLs in Partner Dashboard:**
1. Go to Shopify Partner Dashboard
2. Select your app
3. Update "App URL": `https://vton-1-hqmc.onrender.com`
4. Update "Allowed redirection URL(s)":
   - `https://vton-1-hqmc.onrender.com/api/shopify/auth/oauth`
   - `https://vton-1-hqmc.onrender.com/admin`
5. Verify scopes:
   ```
   read_products
   read_content
   read_orders
   read_customers
   write_customers
   read_themes
   ```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Backend Changes

```bash
# Commit changes
git add .
git commit -m "fix: critical Shopify integration fixes
- Add CORS support for custom domains
- Implement database session storage
- Add storefront token generation
- Remove client-side product fetching
- Add health check endpoint"

# Push to production branch
git push origin main

# Render.com will auto-deploy (if configured)
# Or trigger manual deploy from Render dashboard
```

**Verify Backend Deployment:**
```bash
# Test health endpoint
curl https://vton-1-hqmc.onrender.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "api": "healthy",
#     "database": "healthy",
#     "gemini": "configured",
#     "replicate": "configured"
#   },
#   "responseTime": "50ms"
# }
```

### Step 2: Deploy Shopify Extension

```bash
# Make sure you're in project root
cd /Users/gautam/Documents/VTon

# Deploy extension
shopify app deploy

# When prompted:
# - Select closelook-widgets-extension
# - Confirm deployment
# - Wait for completion
```

**Expected Output:**
```
✓ Deployed to Shopify
Extension: closelook-widgets-extension
Version: 1.0.x
Status: Available for installation
```

### Step 3: Test in Development Store

**Create Test Store:**
1. Go to Shopify Partner Dashboard
2. Create development store
3. Install your app on the store

**Enable Extension:**
1. Go to store admin
2. Online Store → Themes
3. Click "Customize" on active theme
4. Add app block: "Closelook AI Widgets"
5. Configure backend URL: `https://vton-1-hqmc.onrender.com`
6. Enable chatbot and try-on features
7. Save and publish

---

## 🧪 TESTING CHECKLIST

### Test 1: Health Check
```bash
# From browser or curl
curl https://vton-1-hqmc.onrender.com/api/health
```

**Expected:** `{"status": "healthy"}`

### Test 2: OAuth Flow
1. Install app on development store
2. Click "Install App"
3. Authorize permissions
4. **Expected:** Redirect to admin page with success message

**Verify in Database:**
```sql
SELECT shop, scope, storefront_token, created_at 
FROM shopify_sessions 
WHERE shop = 'your-test-store.myshopify.com';
```

**Expected:** Row with access_token and storefront_token

### Test 3: Chatbot Initialization
1. Go to storefront (any page)
2. Open browser console
3. **Expected Log:** `🤖 Closelook Widgets script loaded`
4. **Expected Log:** `✅ All chatbot elements found`
5. **Expected Log:** `🔧 [Closelook Widget] Product fetching delegated to backend`

### Test 4: Chat API Call
1. Open chatbot
2. Send message: "Show me products"
3. Open browser Network tab
4. **Expected Request:** POST to `https://vton-1-hqmc.onrender.com/api/chat`
5. **Expected Response:** 200 with product recommendations

**Check Backend Logs (Render):**
```
[INFO] Fetched X products from Shopify for shop...
[INFO] Retrieved X relevant products from catalog...
```

### Test 5: Product Page Context
1. Go to any product page
2. Open chatbot
3. Send message: "Tell me about this product"
4. **Expected:** Response about the CURRENT product
5. **Expected Log:** `Analyzing product page for inquiry`

### Test 6: Virtual Try-On
1. Go to product page (clothing item)
2. Open chatbot
3. Click "Upload photo"
4. Upload standing photo
5. Click "Try on this product"
6. **Expected:** Generated try-on image in chat
7. **Expected:** Download button appears

### Test 7: Custom Domain (If Available)
1. Configure custom domain in Shopify
2. Access store via custom domain (e.g., `www.mystore.com`)
3. Test chatbot functionality
4. **Expected:** All features work (CORS allows custom domain)

### Test 8: Session Persistence
1. Restart Render service (Deployments → Manual Deploy)
2. Wait for service to come back online
3. Test chatbot on store
4. **Expected:** Features still work (session retrieved from database)

---

## 🐛 TROUBLESHOOTING

### Issue: "Chatbot appears but doesn't respond"

**Possible Causes:**
- CORS error (check browser console)
- Backend not reachable
- Session not found

**Debug Steps:**
```bash
# 1. Check health endpoint
curl https://vton-1-hqmc.onrender.com/api/health

# 2. Check browser console for errors
# Open DevTools → Console
# Look for CORS errors or network failures

# 3. Check backend logs (Render Dashboard → Logs)
# Look for errors during chat request

# 4. Verify session exists
# Check database for shop's session
```

### Issue: "No product recommendations"

**Possible Causes:**
- Storefront token not generated
- Session missing storefront token
- Product fetching failed

**Debug Steps:**
```sql
-- Check if session has storefront token
SELECT shop, storefront_token 
FROM shopify_sessions 
WHERE shop = 'your-store.myshopify.com';
```

If storefront_token is NULL:
1. Uninstall app from store
2. Reinstall app (triggers OAuth)
3. Check database again

### Issue: "Virtual try-on not working"

**Possible Causes:**
- Product images not accessible
- REPLICATE_API_TOKEN missing
- BLOB_READ_WRITE_TOKEN missing

**Debug Steps:**
```bash
# Check environment variables
# On Render → Environment tab

# Test Replicate API
curl -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/models

# Expected: 200 response with models
```

### Issue: "Session not found after restart"

**Possible Causes:**
- Database migration not applied
- DATABASE_URL not set correctly

**Debug Steps:**
```sql
-- Verify table exists
\dt shopify_sessions

-- If table doesn't exist, run migration
psql $DATABASE_URL < lib/db/migrations/003_shopify_sessions.sql
```

---

## 📊 MONITORING

### Key Metrics to Track

**1. Session Success Rate**
- Monitor OAuth completions
- Track session storage failures
- Alert on session retrieval errors

**2. Product Fetch Performance**
- Backend product fetch time
- Storefront API success rate
- Product catalog size

**3. Chat API Performance**
- Response time
- Error rate
- Recommendation quality

**4. Try-On Success Rate**
- Image upload success
- Generation success
- Error types

### Logging

**Enable Detailed Logging:**
```javascript
// In widget (browser console)
localStorage.setItem('closelook_debug', 'true');

// In backend (environment variable)
LOG_LEVEL=debug
```

**Key Log Messages to Monitor:**
```
[INFO] Session stored successfully
[INFO] Fetched X products from Shopify
[WARN] Failed to generate storefront token
[ERROR] Error fetching products from Shopify
[ERROR] CORS rejected origin
```

---

## 🎉 SUCCESS CRITERIA

Deployment is successful when:

- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] OAuth flow completes and stores session with storefront_token
- [ ] Chatbot initializes on storefront without errors
- [ ] Chat messages get responses with product recommendations
- [ ] Product context detected on product pages
- [ ] Virtual try-on generates images
- [ ] All features work after server restart (session persistence)
- [ ] Features work on custom domains (if configured)

---

## 📞 SUPPORT

### If Issues Persist

1. **Check Documentation:**
   - CRITICAL_ISSUES_FOUND.md (root cause analysis)
   - FIXES_APPLIED.md (what was fixed)
   - WIDGET_FIX_INSTRUCTIONS.md (widget changes)

2. **Review Logs:**
   - Render.com Dashboard → Logs
   - Browser Console (F12)
   - Network Tab (for API calls)

3. **Database Inspection:**
   ```sql
   -- Check sessions
   SELECT * FROM shopify_sessions;
   
   -- Check user images
   SELECT * FROM user_images LIMIT 10;
   
   -- Check analytics
   SELECT * FROM try_on_events LIMIT 10;
   ```

4. **Rollback Plan:**
   ```bash
   # If critical issues, rollback to previous version
   git revert HEAD
   git push origin main
   
   # Redeploy extension (previous version)
   shopify app deploy
   ```

---

**Deployment Guide Version:** 1.0  
**Last Updated:** November 3, 2025  
**Next Review:** After successful production deployment

