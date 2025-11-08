# 🔐 Render.com Environment Variables Setup

## Required Environment Variables

Go to Render Dashboard → Your Service → Environment

### 1. Database (REQUIRED)
```
DATABASE_URL=<your-neon-database-connection-string>
```

### 2. Shopify App (REQUIRED)
```
SHOPIFY_API_KEY=<from-shopify-partners-dashboard>
SHOPIFY_API_SECRET=<from-shopify-partners-dashboard>
SHOPIFY_APP_URL=https://vton-1-hqmc.onrender.com
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers,read_themes
```

### 3. AI Services (REQUIRED)
```
GEMINI_API_KEY=<your-gemini-api-key>
REPLICATE_API_TOKEN=<your-replicate-api-token>
```

### 4. Image Storage (REQUIRED for try-on)
```
BLOB_READ_WRITE_TOKEN=<your-vercel-blob-token>
```

### 5. Optional
```
NODE_ENV=production
```

---

## How to Add in Render

1. Go to: https://dashboard.render.com
2. Select your service: `vton-1-hqmc`
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Paste each variable above
6. Click **Save Changes**
7. Service will auto-redeploy

---

## Security Notes

✅ **NEVER** commit these to git
✅ **NEVER** expose in client-side code
✅ All sensitive vars are server-side only
✅ DATABASE_URL is automatically secured by Neon SSL

