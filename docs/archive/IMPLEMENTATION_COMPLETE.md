# Context-Aware Shopify Chatbot - Implementation Complete

## Overview

A complete context-aware chatbot system has been implemented for your Shopify store. The chatbot now:

- ✅ Captures real-time context from the Shopify storefront (product pages, customer info, cart)
- ✅ Stores context in Redis for session management
- ✅ Enriches product data from Shopify API
- ✅ Provides context-aware responses using Gemini AI
- ✅ Maintains conversation history across sessions

## What Was Implemented

### 1. Frontend (Shopify Extension)
- **Context Manager** (`extensions/chatbot-widget/assets/context-manager.js`)
  - Captures product ID from multiple sources (ShopifyAnalytics, meta tags, JSON scripts)
  - Detects page type (product, collection, cart, etc.)
  - Captures customer login status
  - Monitors cart state
  - Watches for navigation changes

- **Chatbot Widget** (`extensions/chatbot-widget/assets/chatbot.js`)
  - Full UI implementation
  - Sends context with every message
  - Handles conversation history
  - Integrates with backend API

- **Styles** (`extensions/chatbot-widget/assets/styles.css`)
  - Modern, responsive design
  - Mobile-friendly
  - Smooth animations

- **Extension Structure**
  - Liquid template (`extensions/chatbot-widget/blocks/chatbot-block.liquid`)
  - Extension config (`extensions/chatbot-widget/shopify.extension.toml`)

### 2. Backend (Next.js API)
- **Redis Integration** (`lib/redis.ts`)
  - Context storage (TTL: 1 hour)
  - Conversation history storage
  - Session management

- **Context Service** (`lib/context.ts`)
  - Builds natural language context strings
  - Formats product data for Gemini
  - Handles customer, cart, and page context

- **Chat API Updates** (`app/api/chat/route.ts`)
  - Accepts context from frontend
  - Stores context in Redis
  - Enriches product data from Shopify
  - Uses `buildContextString` for Gemini
  - Maintains conversation history

### 3. Dependencies
- Added `@upstash/redis` to `package.json`

## Environment Variables Required

Add these to your `.env.local` and Vercel:

```bash
# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Gemini API (already configured)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Shopify Storefront Token (already configured)
SHOPIFY_STOREFRONT_TOKEN=your_storefront_token
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Upstash Redis
1. Go to https://upstash.com
2. Create a new Redis database
3. Copy the REST URL and token
4. Add to environment variables

### 3. Deploy Extension to Shopify
```bash
# Build and deploy the extension
shopify app deploy
```

Or use Shopify CLI:
```bash
shopify app generate extension
# Select: theme extension
# Copy files from extensions/chatbot-widget/
```

### 4. Configure Extension
1. In Shopify Admin, go to Online Store > Themes
2. Click "Customize" on your theme
3. Add the "Context-Aware Chatbot" block
4. Set the backend URL (your Vercel deployment URL)

### 5. Deploy Backend to Vercel
```bash
vercel
```

Set environment variables in Vercel dashboard.

## How It Works

### Context Capture Flow
1. **Frontend**: Context manager captures:
   - Product ID from `window.ShopifyAnalytics.meta.product`
   - Page type from URL
   - Customer ID from `__st.cid` or meta tags
   - Cart state from `/cart.js`

2. **Frontend → Backend**: Widget sends:
   ```json
   {
     "session_id": "session_123...",
     "message": "What sizes are available?",
     "context": {
       "page_type": "product",
       "current_product": {
         "id": "8234567890",
         "handle": "blue-t-shirt"
       },
       "customer": {
         "logged_in": true,
         "id": "12345"
       },
       "cart": { ... }
     },
     "shop_domain": "yourstore.myshopify.com"
   }
   ```

3. **Backend**: 
   - Stores context in Redis
   - Fetches full product details from Shopify Storefront API
   - Enriches context with product data
   - Builds context string for Gemini
   - Generates response

4. **Backend → Frontend**: Returns:
   ```json
   {
     "message": "This t-shirt is available in sizes S, M, L, and XL...",
     "recommendations": [...]
   }
   ```

## Testing

### Test Context Capture
1. Open a product page on your Shopify store
2. Open browser console
3. Look for: `[Context Manager] ✅ Product captured: {...}`
4. Open chatbot and send a message
5. Check network tab: POST to `/api/chat` should include context

### Test Product Awareness
1. On product page, ask: "What sizes are available?"
2. Should respond with actual sizes from that product
3. Navigate to different product
4. Ask same question - should give different sizes

### Test Backend Context
1. Check Vercel logs for:
   - `[Chat API] Context stored in Redis`
   - `✅ Successfully fetched complete product details from Shopify`
   - `[Chat API] Context string: ...`

## Troubleshooting

### Context Not Captured
- Check browser console for `[Context Manager]` logs
- Verify `window.ShopifyAnalytics` exists
- Check meta tags: `<meta property="product:id" content="...">`

### Redis Errors
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check Upstash dashboard for database status

### Product Not Found
- Verify `SHOPIFY_STOREFRONT_TOKEN` is set
- Check token has `unauthenticated_read_product_listings` scope
- Verify shop domain format: `yourstore.myshopify.com` (no https://)

### CORS Errors
- Backend already includes CORS headers
- Verify backend URL is correct in extension settings

## Next Steps

1. **Test on production store** - Deploy and test with real products
2. **Monitor performance** - Check Redis usage and API response times
3. **Customize prompts** - Adjust system prompt in `app/api/chat/route.ts`
4. **Add features**:
   - Order history integration (if customer is logged in)
   - Product recommendations based on cart
   - Multi-language support

## Files Created/Modified

### New Files
- `lib/redis.ts` - Redis client
- `lib/context.ts` - Context service
- `extensions/chatbot-widget/assets/context-manager.js`
- `extensions/chatbot-widget/assets/chatbot.js`
- `extensions/chatbot-widget/assets/styles.css`
- `extensions/chatbot-widget/blocks/chatbot-block.liquid`
- `extensions/chatbot-widget/shopify.extension.toml`

### Modified Files
- `package.json` - Added `@upstash/redis`
- `app/api/chat/route.ts` - Integrated context system

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SHOPIFY STOREFRONT                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Product Page (user viewing "Blue T-Shirt")         │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │   CHATBOT WIDGET (Context Manager)        │     │   │
│  │  │   - Captures Product ID                    │     │   │
│  │  │   - Detects Page Type                      │     │   │
│  │  │   - Gets Customer Info                     │     │   │
│  │  └────────────────────┬───────────────────────┘     │   │
│  └────────────────────────┼─────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────┘
                              │
                              │ POST /api/chat
                              │ { message, context, session_id }
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    YOUR BACKEND (Vercel)                     │
│                                                              │
│  1. Store context in Redis                                   │
│  2. Fetch product from Shopify API                           │
│  3. Build context string                                     │
│  4. Call Gemini with context                                 │
│  5. Return response                                          │
└─────────────────────────────────────────────────────────────┘
```

## Success Criteria

✅ Context is captured from product pages  
✅ Product data is enriched from Shopify API  
✅ Context is stored in Redis  
✅ Gemini receives complete context  
✅ Responses are product-aware  
✅ Conversation history is maintained  

## Notes

- The system gracefully handles missing context (falls back to basic mode)
- Redis is optional but recommended for production
- Context TTL is 1 hour (adjustable in `lib/redis.ts`)
- Product fetching supports both GID and numeric IDs
- Supports fetching by product handle if ID is not available

