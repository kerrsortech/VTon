# Context-Aware Chatbot Testing Guide

## Overview

This guide provides step-by-step instructions for testing the context-aware chatbot implementation.

## Prerequisites

1. ✅ Redis database set up (Upstash)
2. ✅ Environment variables configured
3. ✅ Extension deployed to Shopify
4. ✅ Backend deployed to Vercel
5. ✅ Shopify store with products

## Test Checklist

### Part 1: Context Capture (Frontend)

#### Test 1.1: Product Context Capture
**Goal**: Verify product ID is captured on product pages

**Steps**:
1. Open your Shopify store in a browser
2. Navigate to any product page (e.g., `/products/blue-t-shirt`)
3. Open browser Developer Console (F12)
4. Look for console logs:
   ```
   [Context Manager] Initializing...
   [Context Manager] Page type: product
   [Context Manager] ✅ Product captured: {id: "8234567890", ...}
   ```

**Expected Result**:
- ✅ Page type detected as "product"
- ✅ Product ID captured from `window.ShopifyAnalytics.meta.product`
- ✅ Product handle extracted from URL

**If Product Not Captured**:
- Check if `window.ShopifyAnalytics` exists
- Check browser console for warnings
- Verify product page has meta tags: `<meta property="product:id" content="...">`
- Check if product JSON script exists: `<script data-product-json>`

#### Test 1.2: Customer Context Capture
**Goal**: Verify customer login status is detected

**Steps**:
1. Open browser console
2. Check for logs:
   ```
   [Context Manager] Customer logged in: 12345
   ```
   OR
   ```
   [Context Manager] Customer not logged in
   ```

**Expected Result**:
- ✅ Customer ID captured if logged in
- ✅ `customer.logged_in` set to `true/false`

**If Not Working**:
- Check if `__st.cid` exists (Shopify customer ID)
- Check meta tag: `<meta name="customer-id" content="...">`
- Verify `window.Shopify.customer.id` exists

#### Test 1.3: Cart Context Capture
**Goal**: Verify cart state is captured

**Steps**:
1. Add a product to cart
2. Open browser console
3. Check for logs:
   ```
   [Context Manager] Cart: {item_count: 1, total_price: 2999, ...}
   ```

**Expected Result**:
- ✅ Cart item count captured
- ✅ Total price captured
- ✅ Cart items array populated

#### Test 1.4: Navigation Detection
**Goal**: Verify context updates on navigation

**Steps**:
1. Navigate to product page A
2. Check console for product A ID
3. Navigate to product page B
4. Check console for product B ID

**Expected Result**:
- ✅ Context updates when navigating between products
- ✅ Product ID changes correctly
- ✅ Page type remains "product"

### Part 2: Backend Communication

#### Test 2.1: API Request with Context
**Goal**: Verify context is sent to backend

**Steps**:
1. Open browser Network tab (F12 → Network)
2. Open chatbot widget
3. Send a message: "What sizes are available?"
4. Find the POST request to `/api/chat`
5. Check request payload:
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
       "shop_domain": "yourstore.myshopify.com"
     },
     "shop_domain": "yourstore.myshopify.com"
   }
   ```

**Expected Result**:
- ✅ Request includes `session_id`
- ✅ Request includes `context` object
- ✅ Context includes `current_product` with ID
- ✅ Context includes `page_type`
- ✅ Response status is 200

**If Context Not Sent**:
- Check browser console for errors
- Verify `contextManager.getContext()` returns data
- Check network request payload

#### Test 2.2: Response Validation
**Goal**: Verify backend returns context-aware response

**Steps**:
1. Send message on product page
2. Check response:
   ```json
   {
     "message": "This t-shirt is available in sizes S, M, L, and XL...",
     "recommendations": [...]
   }
   ```

**Expected Result**:
- ✅ Response includes actual product name
- ✅ Response mentions actual sizes from product
- ✅ Response is specific to the product being viewed

### Part 3: Context Enrichment (Backend)

#### Test 3.1: Redis Context Storage
**Goal**: Verify context is stored in Redis

**Steps**:
1. Check Vercel logs or add logging
2. Look for:
   ```
   [Chat API] Context stored in Redis { sessionId: "...", pageType: "product", hasProduct: true }
   ```

**Expected Result**:
- ✅ Context stored successfully
- ✅ Session ID used as key
- ✅ TTL set to 1 hour

**If Not Working**:
- Verify `UPSTASH_REDIS_REST_URL` is set
- Verify `UPSTASH_REDIS_REST_TOKEN` is set
- Check Upstash dashboard for database status

#### Test 3.2: Product Data Enrichment
**Goal**: Verify product data is fetched from Shopify

**Steps**:
1. Check Vercel logs
2. Look for:
   ```
   Fetching complete product details from Shopify { originalId: "8234567890", ... }
   ✅ Successfully fetched complete product details from Shopify
   ```

**Expected Result**:
- ✅ Product fetched from Shopify Storefront API
- ✅ Full product details retrieved (name, description, price, sizes, etc.)
- ✅ Product data enriched with complete information

**If Not Working**:
- Verify `SHOPIFY_STOREFRONT_TOKEN` is set
- Check token has `unauthenticated_read_product_listings` scope
- Verify shop domain format: `yourstore.myshopify.com`

#### Test 3.3: Context String Building
**Goal**: Verify context string is built correctly

**Steps**:
1. Check Vercel logs for context string
2. Should include:
   - Current product name
   - Product price
   - Available sizes
   - Product description
   - Customer status
   - Cart information

**Expected Result**:
- ✅ Context string is natural language
- ✅ Includes all product details
- ✅ Formatted for Gemini consumption

### Part 4: Context-Aware Responses

#### Test 4.1: Product-Specific Questions
**Goal**: Verify chatbot answers product-specific questions

**Test Cases**:

1. **"What sizes are available?"**
   - On product page with sizes: S, M, L, XL
   - Expected: "This t-shirt is available in sizes S, M, L, and XL..."
   - ✅ Should NOT say "I don't know which product you're referring to"

2. **"Tell me more about this product"**
   - Expected: Detailed description using actual product name and details
   - ✅ Should mention actual product name
   - ✅ Should use product description if available

3. **"What's the price?"**
   - Expected: Actual price from product
   - ✅ Should show correct currency format
   - ✅ Should match product page price

4. **"Is this in stock?"**
   - Expected: Availability status based on product data
   - ✅ Should be accurate

#### Test 4.2: Context Persistence
**Goal**: Verify context persists across messages

**Steps**:
1. On product page, ask: "What sizes are available?"
2. Without navigating, ask: "What about colors?"
3. Expected: Second question should still refer to same product

**Expected Result**:
- ✅ Context persists within session
- ✅ No need to re-specify product
- ✅ Conversation flows naturally

#### Test 4.3: Context Switching
**Goal**: Verify context updates when navigating

**Steps**:
1. On Product A, ask: "What sizes are available?"
2. Navigate to Product B
3. Ask: "What sizes are available?"
4. Expected: Different sizes for Product B

**Expected Result**:
- ✅ Context updates automatically
- ✅ New product detected
- ✅ Response reflects new product

### Part 5: Edge Cases

#### Test 5.1: No Product Context
**Goal**: Verify graceful handling when no product context

**Steps**:
1. Navigate to homepage
2. Ask chatbot: "What products do you have?"
3. Expected: General response, not product-specific

**Expected Result**:
- ✅ No errors
- ✅ Chatbot handles gracefully
- ✅ Can still provide recommendations

#### Test 5.2: Product Not Found
**Goal**: Verify handling when product fetch fails

**Steps**:
1. Use invalid product ID
2. Send message about product
3. Expected: Graceful fallback

**Expected Result**:
- ✅ No crashes
- ✅ Error logged but request continues
- ✅ Uses fallback data if available

#### Test 5.3: Redis Unavailable
**Goal**: Verify graceful degradation if Redis fails

**Steps**:
1. Temporarily disable Redis
2. Send message
3. Expected: Request still works, uses in-memory context

**Expected Result**:
- ✅ Request doesn't fail
- ✅ Error logged
- ✅ Uses context from request if available

## Automated Testing Scripts

### Frontend Testing (Browser Console)

```javascript
// Test context capture
console.log('Context Manager:', window.shopifyChatbot?.contextManager?.getContext());

// Test product detection
console.log('ShopifyAnalytics:', window.ShopifyAnalytics?.meta?.product);

// Test customer detection
console.log('Customer ID:', typeof __st !== 'undefined' ? __st.cid : 'Not logged in');
```

### Backend Testing (API Test)

```bash
# Test API with context
curl -X POST https://your-backend.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_session_123",
    "message": "What sizes are available?",
    "context": {
      "page_type": "product",
      "current_product": {
        "id": "8234567890",
        "handle": "blue-t-shirt"
      },
      "shop_domain": "yourstore.myshopify.com"
    },
    "shop_domain": "yourstore.myshopify.com"
  }'
```

## Verification Checklist

Before deploying to production:

- [ ] Context captured on product pages
- [ ] Product ID extracted correctly
- [ ] Customer status detected
- [ ] Cart state captured
- [ ] Navigation detection works
- [ ] API requests include context
- [ ] Redis storage working
- [ ] Product enrichment working
- [ ] Context string built correctly
- [ ] Gemini responses are context-aware
- [ ] Edge cases handled gracefully
- [ ] No console errors
- [ ] No network errors
- [ ] Response times acceptable (< 3 seconds)

## Troubleshooting Common Issues

### Issue: Product not captured
**Solution**:
1. Check `window.ShopifyAnalytics.meta.product` exists
2. Add fallback to meta tags
3. Check product JSON script

### Issue: Context not sent to backend
**Solution**:
1. Verify `contextManager.getContext()` returns data
2. Check network request payload
3. Verify backend URL is correct

### Issue: Redis errors
**Solution**:
1. Verify environment variables
2. Check Upstash dashboard
3. Test Redis connection

### Issue: Product not found
**Solution**:
1. Verify Storefront token
2. Check token permissions
3. Verify shop domain format

## Performance Benchmarks

- Context capture: < 100ms
- API request: < 2 seconds
- Product enrichment: < 1 second
- Gemini response: < 3 seconds
- Total response time: < 5 seconds

## Success Criteria

✅ Context is captured from product pages  
✅ Product data is enriched from Shopify API  
✅ Context is stored in Redis  
✅ Gemini receives complete context  
✅ Responses are product-aware  
✅ Conversation history is maintained  
✅ Edge cases handled gracefully  
✅ No errors in console or logs  

