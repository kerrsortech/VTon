# Quick Test Checklist

## Frontend Context Capture Tests

### ✅ Test 1: Product Page Context
1. Open Shopify store product page
2. Open browser console (F12)
3. Look for: `[Context Manager] ✅ Product captured`
4. **Expected**: Product ID and handle captured

### ✅ Test 2: Customer Detection
1. Check console for: `[Context Manager] Customer logged in: ...` or `Customer not logged in`
2. **Expected**: Customer status detected correctly

### ✅ Test 3: Cart State
1. Add product to cart
2. Check console for: `[Context Manager] Cart: {item_count: 1, ...}`
3. **Expected**: Cart state captured

### ✅ Test 4: Navigation
1. Navigate between product pages
2. Check console for context updates
3. **Expected**: Context updates automatically

## Backend API Tests

### ✅ Test 5: API Request
1. Open Network tab (F12 → Network)
2. Send message in chatbot
3. Check POST `/api/chat` request
4. **Expected**: Request includes `context` object with product data

### ✅ Test 6: Response Quality
1. On product page, ask: "What sizes are available?"
2. **Expected**: Response mentions actual sizes from that product

### ✅ Test 7: Context Persistence
1. Ask multiple questions without navigating
2. **Expected**: All questions refer to same product

## Backend Verification

### ✅ Test 8: Redis Storage
Check Vercel logs for:
- `[Chat API] Context stored in Redis`
- `✅ Successfully fetched complete product details from Shopify`

### ✅ Test 9: Product Enrichment
Check logs for:
- Product fetched from Shopify API
- Full product details retrieved

### ✅ Test 10: Context String
Check logs for context string with:
- Product name
- Price
- Sizes
- Description

## Quick Browser Test Script

Copy and paste into browser console on product page:

```javascript
// Quick Context Test
console.log('Context:', window.shopifyChatbot?.contextManager?.getContext());
console.log('Product:', window.ShopifyAnalytics?.meta?.product);
console.log('Customer:', typeof __st !== 'undefined' ? __st.cid : 'Not logged in');
```

## Quick API Test

```bash
curl -X POST https://your-backend.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_123",
    "message": "What sizes are available?",
    "context": {
      "page_type": "product",
      "current_product": {"id": "123456"},
      "shop_domain": "yourstore.myshopify.com"
    },
    "shop_domain": "yourstore.myshopify.com"
  }'
```

## Success Indicators

✅ Console shows: `[Context Manager] ✅ Product captured`  
✅ Network request includes context object  
✅ Response mentions actual product details  
✅ No errors in console or network  
✅ Response time < 5 seconds  

