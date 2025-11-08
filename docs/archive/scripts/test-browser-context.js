/**
 * Browser Console Test Script for Context Capture
 * Copy and paste this into browser console on a Shopify product page
 */

(function() {
  console.log('%c🧪 Context-Aware Chatbot - Browser Test Suite', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('='.repeat(60));
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  function test(name, condition, message) {
    if (condition) {
      console.log(`%c✅ ${name}`, 'color: #4CAF50; font-weight: bold;');
      testsPassed++;
    } else {
      console.log(`%c❌ ${name}`, 'color: #f44336; font-weight: bold;');
      console.log(`   ${message || 'Test failed'}`);
      testsFailed++;
    }
  }
  
  // Test 1: Context Manager exists
  console.log('\n📋 Test 1: Context Manager');
  test(
    'Context Manager exists',
    typeof window.ShopifyContextManager !== 'undefined',
    'Run context-manager.js first'
  );
  
  // Test 2: Chatbot instance exists
  console.log('\n📋 Test 2: Chatbot Instance');
  test(
    'Chatbot instance exists',
    typeof window.shopifyChatbot !== 'undefined',
    'Chatbot not initialized'
  );
  
  if (window.shopifyChatbot) {
    test(
      'Context manager initialized',
      window.shopifyChatbot.contextManager !== undefined,
      'Context manager not initialized'
    );
    
    // Test 3: Context capture
    console.log('\n📋 Test 3: Context Capture');
    const context = window.shopifyChatbot.contextManager.getContext();
    
    test(
      'Context object exists',
      context !== null && typeof context === 'object',
      'Context object not found'
    );
    
    test(
      'Page type detected',
      context.page_type !== undefined,
      'Page type not detected'
    );
    
    test(
      'Shop domain captured',
      context.shop_domain !== undefined && context.shop_domain !== null,
      'Shop domain not captured'
    );
    
    test(
      'Session ID exists',
      context.session_id !== undefined && context.session_id !== null,
      'Session ID not generated'
    );
    
    // Test 4: Product context
    console.log('\n📋 Test 4: Product Context');
    if (context.page_type === 'product') {
      test(
        'Product context captured',
        context.current_product !== null && context.current_product !== undefined,
        'Product context not captured'
      );
      
      if (context.current_product) {
        test(
          'Product ID exists',
          context.current_product.id !== undefined || context.current_product.gid !== undefined,
          'Product ID not found'
        );
        
        test(
          'Product handle exists',
          context.current_product.handle !== undefined || context.current_product.id !== undefined,
          'Product handle or ID not found'
        );
      }
    } else {
      console.log('ℹ️  Not on product page, skipping product context tests');
    }
    
    // Test 5: Customer context
    console.log('\n📋 Test 5: Customer Context');
    test(
      'Customer context exists',
      context.customer !== undefined && context.customer !== null,
      'Customer context not captured'
    );
    
    if (context.customer) {
      test(
        'Customer logged_in status set',
        typeof context.customer.logged_in === 'boolean',
        'Customer logged_in status not set'
      );
    }
    
    // Test 6: Cart context
    console.log('\n📋 Test 6: Cart Context');
    test(
      'Cart context exists',
      context.cart !== undefined,
      'Cart context not captured'
    );
    
    // Test 7: Shopify Analytics
    console.log('\n📋 Test 7: Shopify Analytics');
    test(
      'ShopifyAnalytics exists',
      typeof window.ShopifyAnalytics !== 'undefined',
      'ShopifyAnalytics not found'
    );
    
    if (window.ShopifyAnalytics) {
      test(
        'ShopifyAnalytics.meta exists',
        window.ShopifyAnalytics.meta !== undefined,
        'ShopifyAnalytics.meta not found'
      );
      
      if (window.ShopifyAnalytics.meta && context.page_type === 'product') {
        test(
          'Product in ShopifyAnalytics',
          window.ShopifyAnalytics.meta.product !== undefined,
          'Product not in ShopifyAnalytics.meta'
        );
      }
    }
    
    // Test 8: Meta tags
    console.log('\n📋 Test 8: Meta Tags');
    const metaProductId = document.querySelector('meta[property="product:id"]')?.content ||
                         document.querySelector('meta[name="product:id"]')?.content;
    test(
      'Product ID meta tag',
      metaProductId !== undefined || context.current_product !== null,
      'Product ID meta tag not found (may use other methods)'
    );
    
    // Test 9: Context structure
    console.log('\n📋 Test 9: Context Structure');
    test(
      'Context has required fields',
      context.session_id && context.shop_domain && context.page_type !== undefined,
      'Required context fields missing'
    );
    
    // Test 10: Send test message
    console.log('\n📋 Test 10: API Communication');
    console.log('ℹ️  To test API communication, open chatbot and send a message');
    console.log('ℹ️  Check Network tab for POST request to /api/chat');
    console.log('ℹ️  Verify request includes context object');
    
    // Display context summary
    console.log('\n📊 Context Summary:');
    console.log(JSON.stringify(context, null, 2));
    
  } else {
    console.log('⚠️  Chatbot not initialized. Make sure chatbot.js is loaded.');
  }
  
  // Final results
  console.log('\n' + '='.repeat(60));
  console.log(`%cTest Results: ${testsPassed} passed, ${testsFailed} failed`, 
    `font-weight: bold; color: ${testsFailed === 0 ? '#4CAF50' : '#f44336'};`);
  console.log('='.repeat(60));
  
  if (testsFailed === 0) {
    console.log('%c✅ All browser tests passed!', 'font-size: 14px; font-weight: bold; color: #4CAF50;');
  } else {
    console.log('%c⚠️  Some tests failed. Review the errors above.', 'font-size: 14px; font-weight: bold; color: #ff9800;');
  }
})();

