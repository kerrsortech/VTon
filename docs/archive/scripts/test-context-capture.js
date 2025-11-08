/**
 * Test Script for Context Capture
 * Run this in browser console on a Shopify product page
 */

(function() {
  console.log('🧪 Testing Context Capture...\n');
  
  // Test 1: Check ShopifyAnalytics
  console.log('Test 1: ShopifyAnalytics');
  if (window.ShopifyAnalytics?.meta?.product) {
    console.log('✅ ShopifyAnalytics product found:', window.ShopifyAnalytics.meta.product);
  } else {
    console.log('❌ ShopifyAnalytics product not found');
  }
  
  // Test 2: Check meta tags
  console.log('\nTest 2: Meta Tags');
  const metaProductId = document.querySelector('meta[property="product:id"]')?.content ||
                        document.querySelector('meta[name="product:id"]')?.content;
  if (metaProductId) {
    console.log('✅ Product ID from meta tag:', metaProductId);
  } else {
    console.log('❌ Product ID meta tag not found');
  }
  
  // Test 3: Check product JSON
  console.log('\nTest 3: Product JSON Script');
  const productJsonScript = document.querySelector('script[data-product-json]') ||
                            document.querySelector('script[type="application/json"][data-product]');
  if (productJsonScript) {
    try {
      const productJson = JSON.parse(productJsonScript.textContent);
      console.log('✅ Product JSON found:', productJson);
    } catch (e) {
      console.log('❌ Product JSON parse error:', e);
    }
  } else {
    console.log('❌ Product JSON script not found');
  }
  
  // Test 4: Check URL handle
  console.log('\nTest 4: URL Handle');
  const handleMatch = window.location.pathname.match(/\/products\/([^\/\?]+)/);
  if (handleMatch) {
    console.log('✅ Product handle from URL:', handleMatch[1]);
  } else {
    console.log('❌ Product handle not found in URL');
  }
  
  // Test 5: Check customer info
  console.log('\nTest 5: Customer Info');
  if (typeof __st !== 'undefined' && __st.cid) {
    console.log('✅ Customer logged in:', __st.cid);
  } else if (window.Shopify?.customer?.id) {
    console.log('✅ Customer from window.Shopify:', window.Shopify.customer.id);
  } else {
    console.log('ℹ️ Customer not logged in');
  }
  
  // Test 6: Check cart
  console.log('\nTest 6: Cart State');
  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      console.log('✅ Cart state:', {
        item_count: cart.item_count,
        total_price: cart.total_price,
        currency: cart.currency
      });
    })
    .catch(err => {
      console.log('❌ Failed to fetch cart:', err);
    });
  
  // Test 7: Check context manager
  console.log('\nTest 7: Context Manager');
  if (window.shopifyChatbot?.contextManager) {
    const context = window.shopifyChatbot.contextManager.getContext();
    console.log('✅ Context Manager context:', context);
  } else {
    console.log('❌ Context Manager not found - chatbot may not be initialized');
  }
  
  // Test 8: Check page type
  console.log('\nTest 8: Page Type Detection');
  const path = window.location.pathname;
  let pageType = 'other';
  if (path.includes('/products/')) {
    pageType = 'product';
  } else if (path.includes('/collections/')) {
    pageType = 'collection';
  } else if (path.includes('/cart')) {
    pageType = 'cart';
  } else if (path === '/' || path === '') {
    pageType = 'home';
  }
  console.log(`✅ Page type detected: ${pageType}`);
  
  console.log('\n✅ Context capture test complete!');
})();

