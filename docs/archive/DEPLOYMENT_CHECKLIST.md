# 🚀 DEPLOYMENT CHECKLIST

**Use this checklist to deploy your Shopify integration step-by-step.**

---

## Pre-Deployment Checks

### Environment Setup
- [ ] `DATABASE_URL` is set (check: `echo $DATABASE_URL`)
- [ ] `SHOPIFY_API_KEY` is set on Render.com
- [ ] `SHOPIFY_API_SECRET` is set on Render.com
- [ ] `GOOGLE_GEMINI_API_KEY` is set on Render.com
- [ ] `REPLICATE_API_TOKEN` is set on Render.com
- [ ] `BLOB_READ_WRITE_TOKEN` is set on Render.com

### Git Repository
- [ ] All changes committed locally
- [ ] No merge conflicts
- [ ] On correct branch (main/master)
- [ ] Git remote configured correctly

### Shopify App Configuration
- [ ] App created in Partner Dashboard
- [ ] App URL set to: `https://vton-1-hqmc.onrender.com`
- [ ] OAuth redirect URL set correctly
- [ ] Required scopes configured
- [ ] Shopify CLI installed (`shopify version`)

---

## Deployment Steps

### 1. Database Migration ✅
```bash
./scripts/run-migrations.sh
```

**Expected Output:**
```
✅ Database connection successful
✅ Migrations tracking table ready
▶️  Running: 003_shopify_sessions.sql
✅ Success: 003_shopify_sessions.sql
✅ Database migrations completed successfully!
```

**Verification:**
- [ ] Script exits with code 0
- [ ] No error messages
- [ ] `shopify_sessions` table created

**If Failed:**
- Check DATABASE_URL is correct
- Verify database is accessible
- Check migration SQL syntax

---

### 2. Build Application ✅
```bash
pnpm install
pnpm build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

**Verification:**
- [ ] Build completes without errors
- [ ] `.next` directory created
- [ ] No TypeScript errors

**If Failed:**
- Check `pnpm install` completes
- Review error messages
- Fix TypeScript/ESLint errors

---

### 3. Deploy Backend ✅
```bash
git add .
git commit -m "deploy: Shopify integration fixes"
git push origin main
```

**Expected Output:**
```
[main abc1234] deploy: Shopify integration fixes
 15 files changed, 500 insertions(+), 200 deletions(-)
```

**Verification:**
- [ ] Code pushed to GitHub
- [ ] Render.com starts deploying (check dashboard)
- [ ] Deploy completes successfully (~2-5 minutes)

**Wait for Render Deploy:**
- Go to: https://dashboard.render.com
- Click your service
- Watch "Events" tab
- Wait for "Deploy succeeded" message

**If Failed:**
- Check Render.com logs
- Verify build settings
- Check environment variables

---

### 4. Test Backend Health ✅
```bash
curl https://vton-1-hqmc.onrender.com/api/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "gemini": "configured",
    "replicate": "configured"
  }
}
```

**Verification:**
- [ ] Status code 200
- [ ] Status is "healthy"
- [ ] Database is "healthy"
- [ ] Services are configured

**If Failed:**
- Check Render.com logs for errors
- Verify DATABASE_URL is set
- Test database connection manually

---

### 5. Run Integration Tests ✅
```bash
./scripts/test-integration.sh
```

**Expected Output:**
```
✅ PASS: Health endpoint responds
✅ PASS: CORS allows myshopify.com domains
✅ PASS: Chat API endpoint exists
Tests Passed: 10
Tests Failed: 0
✅ All tests passed!
```

**Verification:**
- [ ] All tests pass
- [ ] CORS tests pass
- [ ] Database tests pass
- [ ] No failures

**If Failed:**
- Review failing test output
- Check specific component
- Follow troubleshooting guide

---

### 6. Deploy Shopify Extension ✅
```bash
shopify app deploy
```

**Expected Output:**
```
? Which extensions would you like to deploy? closelook-widgets-extension
✓ Deployed extension closelook-widgets-extension
```

**Verification:**
- [ ] Extension deploys successfully
- [ ] No errors shown
- [ ] Extension visible in Partner Dashboard

**If Failed:**
- Check Shopify CLI authentication
- Verify app configuration
- Review extension files

---

### 7. Install on Development Store ✅

**Steps:**
1. Go to Shopify Partner Dashboard
2. Select your app
3. Click "Test on development store"
4. Select a development store
5. Click "Install app"
6. Authorize permissions

**Expected:**
- [ ] OAuth flow completes
- [ ] Redirected to admin page
- [ ] No error messages

**Verify in Database:**
```sql
SELECT shop, access_token, storefront_token 
FROM shopify_sessions 
WHERE shop = 'your-dev-store.myshopify.com';
```

**Expected:**
- [ ] Session record exists
- [ ] `access_token` is populated
- [ ] `storefront_token` is populated

**If Failed:**
- Check OAuth redirect URLs
- Review backend logs
- Verify session storage code

---

### 8. Enable Extension in Theme ✅

**Steps:**
1. Go to store admin
2. Online Store → Themes
3. Click "Customize" on active theme
4. Click "Add section" or "Add block"
5. Find "Closelook AI Widgets"
6. Add to theme
7. Configure settings:
   - Backend URL: `https://vton-1-hqmc.onrender.com`
   - Enable chatbot: ✅
   - Enable try-on: ✅
8. Save and publish

**Verification:**
- [ ] Extension appears in theme editor
- [ ] Settings are configurable
- [ ] Theme publishes successfully

---

### 9. Test Features on Storefront ✅

#### Test 1: Chatbot Initialization
1. Open any storefront page
2. Open browser console (F12)
3. Look for: `🤖 Closelook Widgets script loaded`

**Expected:**
- [ ] Chatbot button appears
- [ ] No errors in console
- [ ] Widget loads within 2 seconds

#### Test 2: Chat Functionality
1. Click chatbot button
2. Send message: "Show me products"

**Expected:**
- [ ] Chatbot opens
- [ ] Message sends
- [ ] Response received
- [ ] Product recommendations appear

#### Test 3: Product Context
1. Go to any product page
2. Open chatbot
3. Send: "Tell me about this product"

**Expected:**
- [ ] Chatbot recognizes product
- [ ] Response about current product
- [ ] Product details accurate

#### Test 4: Virtual Try-On
1. Go to product page (clothing item)
2. Open chatbot
3. Click "Upload photo"
4. Upload standing photo
5. Click "Try on this product"

**Expected:**
- [ ] Upload succeeds
- [ ] Generation starts
- [ ] Try-on image appears (~30 seconds)
- [ ] Download button works

#### Test 5: Custom Domain (if applicable)
1. Access store via custom domain
2. Test chatbot functionality
3. Check browser console for CORS errors

**Expected:**
- [ ] Chatbot works on custom domain
- [ ] No CORS errors
- [ ] All features functional

---

### 10. Verify Session Persistence ✅

**Test:**
1. Restart Render.com service (Manual Deploy)
2. Wait for service to restart (~2 minutes)
3. Test chatbot on store again

**Expected:**
- [ ] Chatbot still works
- [ ] No re-authentication needed
- [ ] Features fully functional

**This verifies database session storage is working!**

---

### 11. Final Verification ✅
```bash
./scripts/verify-deployment.sh
```

**Expected Output:**
```
Checking: Backend responds... ✅ OK
Checking: Database is connected... ✅ OK
Checking: CORS working... ✅ OK
Checks Passed: 15
Checks Failed: 0
✅ Deployment verification successful!
```

---

## Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Monitor Render.com logs for errors
- [ ] Check backend health endpoint every hour
- [ ] Test chatbot periodically
- [ ] Check database for session records
- [ ] Monitor error rates

### Documentation
- [ ] Update deployment notes
- [ ] Document any issues encountered
- [ ] Record configuration settings
- [ ] Save successful deployment logs

### Backups
- [ ] Export database schema
- [ ] Save environment variables
- [ ] Document custom configurations
- [ ] Keep deployment logs

---

## Rollback Plan (If Needed)

If critical issues occur:

### 1. Rollback Code
```bash
git revert HEAD
git push origin main
```

### 2. Rollback Database (if needed)
```sql
-- Only if necessary and you have backup
DROP TABLE IF EXISTS shopify_sessions;
-- Restore from backup
```

### 3. Redeploy Previous Extension
```bash
# Use previous version from Partner Dashboard
```

---

## Success Criteria

Deployment is successful when ALL of these are true:

- ✅ Health endpoint returns 200
- ✅ All integration tests pass
- ✅ Chatbot appears on storefront
- ✅ Chat messages get responses
- ✅ Product recommendations work
- ✅ Virtual try-on generates images
- ✅ Features work on custom domains
- ✅ Session persists after restart
- ✅ No errors in Render logs
- ✅ No errors in browser console

---

## 📞 Support

If any step fails:
1. Check relevant section in DEPLOYMENT_GUIDE.md
2. Review Render.com logs
3. Check browser console
4. Verify environment variables
5. Test database connection
6. Review error messages carefully

---

**Deployment Checklist Version:** 1.0  
**Last Updated:** November 3, 2025  
**Estimated Time:** 45-60 minutes for first deployment
