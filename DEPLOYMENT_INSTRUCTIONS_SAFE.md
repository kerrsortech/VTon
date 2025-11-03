# 🚀 DEPLOYMENT INSTRUCTIONS

## ⚠️ SECURITY NOTE
**DO NOT commit actual API keys or secrets to Git!**

Your actual credentials are stored securely. Add them only to:
- ✅ Render.com environment variables
- ✅ Local `.env` file (gitignored)
- ❌ NEVER in committed files

---

## 📋 Environment Variables for Render.com

Go to: https://dashboard.render.com → Your Service → Environment

Add these variables (with your actual values):

### Required Variables:
1. `DATABASE_URL` - Your Neon PostgreSQL connection string
2. `SHOPIFY_API_KEY` - From Shopify Partners Dashboard
3. `SHOPIFY_API_SECRET` - From Shopify Partners Dashboard
4. `SHOPIFY_APP_URL` - Your Render app URL
5. `SHOPIFY_SCOPES` - OAuth scopes (see below)
6. `GEMINI_API_KEY` - Your Google AI API key
7. `REPLICATE_API_TOKEN` - Your Replicate API token
8. `NODE_ENV=production`

### Scope Value:
```
read_products,read_content,read_orders,read_customers,write_customers,read_themes
```

### Optional:
- `BLOB_READ_WRITE_TOKEN` - For image storage (can add later)

---

## 🚀 Deployment Steps

### 1. Commit Code Changes
```bash
git add extensions/closelook-widgets-extension/blocks/closelook-widgets.liquid
git add CHATBOT_NOT_OPENING_FIX.md CHATBOT_FIX_APPLIED.md FRONTEND_NOT_INTERACTIVE_FIX.md
git commit -m "fix: remove async from script to fix chatbot initialization"
```

### 2. Push to GitHub
```bash
git push -u origin shopify
```

### 3. Configure Render Environment
- Add all environment variables listed above
- **Use your actual credentials** (not placeholders)
- Click "Save Changes" → Auto-deploys

### 4. Deploy Shopify Extension
```bash
shopify app deploy
```

### 5. Test
1. Hard refresh your store (Cmd+Shift+R)
2. Click chatbot button
3. Everything should work! ✅

---

## 🧪 Verification

After deploying, check console for:
```
✅ 🤖 Closelook Widgets script loaded
✅ ✅ All chatbot elements found
```

Test these features:
- [ ] Chatbot opens and responds
- [ ] Send messages works
- [ ] Product detection works
- [ ] Try-on upload works
- [ ] Order tracking works

---

## 📁 Files Changed in This Fix

- `extensions/closelook-widgets-extension/blocks/closelook-widgets.liquid` - Removed `async`
- `.gitignore` - Added secret file patterns
- Documentation files - Sanitized credentials

---

## 🔒 Security Best Practices

✅ **DO:**
- Store secrets in Render environment variables
- Use `.env` files locally (gitignored)
- Keep credentials in password managers

❌ **DON'T:**
- Commit secrets to Git
- Share credentials in public repos
- Hardcode API keys in code

---

**All fixes applied and ready to deploy!** 🎉

