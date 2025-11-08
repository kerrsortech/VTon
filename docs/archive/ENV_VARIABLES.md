# Environment Variables Required

## 🆕 NEW Environment Variables (Required for Context-Aware Chatbot)

These are **NEW** environment variables you need to add for the context-aware chatbot:

```bash
# Redis (Upstash) - REQUIRED for context storage
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### How to Get These Values:

1. **Go to https://upstash.com**
2. **Sign up** or **log in**
3. **Create a new Redis database**
4. **Copy the REST URL** from the database dashboard
5. **Copy the REST TOKEN** from the database dashboard
6. **Add both to your `.env.local` file**

## ✅ Existing Environment Variables (Already Configured)

These should already be in your `.env.local` file:

```bash
# Gemini API (for chatbot responses)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Shopify Storefront Token (for product fetching)
SHOPIFY_STOREFRONT_TOKEN=your_storefront_token

# Database URL (for Neon/PostgreSQL - if you have it)
DATABASE_URL=postgresql://user:pass@host/dbname
```

## 📝 Complete .env.local File Template

```bash
# ============================================
# NEW - Required for Context-Aware Chatbot
# ============================================
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# ============================================
# EXISTING - Should already be configured
# ============================================
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
SHOPIFY_STOREFRONT_TOKEN=your_storefront_token

# Optional - Database (if you have it)
DATABASE_URL=postgresql://user:pass@host/dbname

# ============================================
# Other existing variables (if any)
# ============================================
# Add any other environment variables you already have
```

## 🚀 Setting Up Upstash Redis

### Step 1: Create Upstash Account
1. Go to https://upstash.com
2. Sign up (free tier available)
3. Create a new Redis database

### Step 2: Get Credentials
1. In your Upstash dashboard, click on your database
2. Go to "REST API" tab
3. Copy:
   - **UPSTASH_REDIS_REST_URL**: The REST URL (e.g., `https://usw1-xyz-12345.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN**: The REST Token (long string)

### Step 3: Add to Environment
1. Open `.env.local` file in your project root
2. Add the two new variables:
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-actual-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-actual-token-here
   ```
3. Save the file

### Step 4: Add to Vercel (if deploying)
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add both variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Redeploy your application

## ⚠️ Important Notes

### Redis is Required
- The context-aware chatbot **requires Redis** for context storage
- Without Redis, the chatbot will throw errors
- Redis stores:
  - Session context (which product user is viewing)
  - Conversation history
  - Customer information

### Graceful Degradation
- If Redis is not configured, the chatbot will:
  - Log warnings
  - Still work but won't persist context between sessions
  - Use in-memory context only

### Free Tier Available
- Upstash offers a **free tier** with:
  - 10,000 commands per day
  - 256 MB storage
  - Perfect for development and small stores

## 🔍 Verification

After adding the environment variables:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Check logs** for Redis connection:
   - Should see: `[Redis] Connected successfully`
   - No errors about missing Redis credentials

3. **Test context storage**:
   - Open a product page
   - Send a message in chatbot
   - Check Vercel logs for: `[Chat API] Context stored in Redis`

## 📋 Summary

**NEW variables to add:**
- ✅ `UPSTASH_REDIS_REST_URL`
- ✅ `UPSTASH_REDIS_REST_TOKEN`

**Already configured (no changes needed):**
- ✅ `GOOGLE_GEMINI_API_KEY`
- ✅ `SHOPIFY_STOREFRONT_TOKEN`
- ✅ `DATABASE_URL` (if you have it)

## 🆘 Troubleshooting

### Error: "Redis not configured"
**Solution**: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local`

### Error: "Invalid Redis credentials"
**Solution**: 
1. Verify credentials from Upstash dashboard
2. Check for typos in URLs
3. Ensure REST API is enabled in Upstash

### Error: "Connection timeout"
**Solution**:
1. Check internet connection
2. Verify Upstash database is active
3. Check firewall settings

## 📚 Resources

- [Upstash Documentation](https://docs.upstash.com/)
- [Upstash Redis Free Tier](https://upstash.com/pricing)
- [Upstash Dashboard](https://console.upstash.com/)

