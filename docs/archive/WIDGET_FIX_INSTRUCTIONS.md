# WIDGET FIX - Remove Client-Side Product Fetching

**Critical Fix:** Remove product catalog fetching from widget JavaScript

---

## Problem

The widget currently tries to fetch products client-side:

```javascript
// BAD: Widget fetching products (line 1597 in closelook-widgets.js)
async function fetchProductCatalog() {
  const response = await fetch(`https://${shopDomain}/products.json?limit=250`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  // ...
}
```

This causes multiple issues:
1. `/products.json` may be restricted by theme/app settings
2. Limited to 250 products
3. No pagination support
4. Redundant - backend already fetches products
5. Increases widget load time and failure rate

---

## Solution

### Option 1: Quick Fix (Recommended)
Return empty array from `fetchProductCatalog()` and let backend handle all product fetching:

```javascript
async function fetchProductCatalog() {
  // PRODUCTION FIX: Backend handles all product fetching via Storefront API
  // Widget only needs to send shop domain, backend will fetch products
  console.log('🔧 Product catalog will be fetched by backend via Storefront API');
  return [];
}
```

### Option 2: Complete Removal
Remove `fetchProductCatalog()` entirely and update the chat payload:

```javascript
const payload = {
  message: message,
  conversationHistory: conversationHistory,
  pageContext: pageContext,
  shop: shopDomain, // Backend uses this to fetch products
  customerName: customerName,
  customerInternal: customerInternal,
  currentProduct: state.currentProduct ? {
    id: state.currentProduct.id,
    name: state.currentProduct.name,
    url: state.currentProduct.url || window.location.href
  } : undefined,
  // REMOVED: allProducts field - backend fetches from Shopify
};
```

---

## Implementation Steps

### Step 1: Update Widget JavaScript

Edit: `extensions/closelook-widgets-extension/assets/closelook-widgets.js`

Find line ~1597 and replace entire function:

```javascript
// OLD CODE (REMOVE):
async function fetchProductCatalog() {
  try {
    let shopDomain = window.Shopify?.shop || ...;
    const response = await fetch(...);
    // ... lots of code ...
  } catch (error) {
    // ...
  }
}

// NEW CODE (ADD):
async function fetchProductCatalog() {
  // PRODUCTION FIX: Backend handles product fetching via Storefront API
  // Widget sends shop domain, backend uses session to fetch products
  console.log('🔧 Product fetching delegated to backend (Storefront API)');
  
  // Return empty array - backend will handle product retrieval
  // This fixes:
  // 1. /products.json access restrictions
  // 2. 250 product limit
  // 3. Missing pagination
  // 4. Performance overhead
  return [];
}
```

### Step 2: Update Chat Payload

Find line ~593-631 and update the payload:

```javascript
const payload = {
  message: message,
  conversationHistory: conversationHistory,
  pageContext: pageContext,
  shop: shopDomain, // CRITICAL: Backend needs this to fetch products
  customerName: customerName,
  customerInternal: customerInternal,
  currentProduct: state.currentProduct ? {
    id: state.currentProduct.id,
    name: state.currentProduct.name,
    category: state.currentProduct.category, // Optional: may not have yet
    url: state.currentProduct.url || window.location.href // For product page analysis
  } : undefined
  // REMOVED: allProducts - backend fetches from Shopify Storefront API
};
```

### Step 3: Rebuild Widget

After making changes, rebuild the widget:

```bash
cd widgets/chatbot-widget
npm run build

# Copy built file to extension assets
cp dist/chatbot-widget.js ../../extensions/closelook-widgets-extension/assets/closelook-widgets.js
```

### Step 4: Deploy Extension

Deploy updated extension to Shopify:

```bash
shopify app deploy
```

---

## Backend Verification

Verify backend correctly handles product fetching (already implemented):

**File:** `app/api/chat/route.ts` (lines 269-346)

```typescript
if (shop) {
  const session = await getSession(shop);
  const storefrontToken = session?.storefrontToken;
  
  if (storefrontToken) {
    const adapter = new ShopifyProductAdapter(shop, storefrontToken);
    
    // Fetch products from Shopify Storefront API
    const closelookProducts = await adapter.getAllProducts();
    fetchedProducts = closelookProducts.map(cp => ({
      id: cp.id,
      name: cp.name,
      // ... full product details
    }));
    
    logger.info(`Fetched ${fetchedProducts.length} products from Shopify`);
  }
}
```

✅ Backend implementation is CORRECT - no changes needed!

---

## Testing

### 1. Test in Development

```bash
# Start local server
npm run dev

# Test chatbot on localhost
# Verify: Console shows "Product fetching delegated to backend"
# Verify: Backend logs show "Fetched X products from Shopify"
```

### 2. Test in Shopify Store

1. Install app on test store
2. Open product page
3. Open chatbot
4. Send message: "Show me similar products"
5. **Expected:** Product recommendations appear
6. **Check:** Browser console for errors
7. **Check:** Backend logs for product fetch logs

### 3. Verify Performance

**Before Fix:**
- Widget makes 2 requests: /products.json + /api/chat
- Total time: ~2-3 seconds
- Risk of /products.json failure

**After Fix:**
- Widget makes 1 request: /api/chat
- Total time: ~1-2 seconds
- No client-side product fetching failures

---

## Rollback Plan

If issues occur, revert by:

1. Restore previous version of `closelook-widgets.js` from git
2. Redeploy extension: `shopify app deploy`
3. Report issue with specific error messages

---

## Expected Results

### ✅ Success Indicators
- Chatbot initializes faster (no product fetch delay)
- Product recommendations still work
- No "products.json" errors in console
- Backend logs show "Fetched X products from Shopify"

### ❌ Failure Indicators  
- No product recommendations appear
- Backend logs show "No storefront token available"
- Error messages in chatbot

### 🔧 If Failures Occur
Check:
1. OAuth completed successfully (session has storefront token)
2. Database migration applied (shopify_sessions table exists)
3. Backend can access Shopify Storefront API
4. SHOPIFY_STOREFRONT_TOKEN env var not interfering

---

**Status:** Ready to implement  
**Risk Level:** LOW (backend already handles product fetching)  
**Estimated Time:** 15 minutes  
**Testing Time:** 30 minutes

