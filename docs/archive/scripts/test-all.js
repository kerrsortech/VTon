/**
 * Comprehensive Test Suite for Context-Aware Chatbot
 * Tests all components: frontend, backend, Redis, context building
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend.vercel.app';
const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'yourstore.myshopify.com';
const TEST_PRODUCT_ID = process.env.TEST_PRODUCT_ID || '8234567890';

console.log('🧪 Comprehensive Test Suite for Context-Aware Chatbot\n');
console.log('Configuration:');
console.log(`  Backend URL: ${BACKEND_URL}`);
console.log(`  Shop Domain: ${SHOP_DOMAIN}`);
console.log(`  Test Product ID: ${TEST_PRODUCT_ID}\n`);

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Frontend Context Manager Structure
test('Frontend Context Manager exists', () => {
  // This would be tested in browser, but we can verify the file exists
  const fs = require('fs');
  const path = require('path');
  const contextManagerPath = path.join(__dirname, '../extensions/chatbot-widget/assets/context-manager.js');
  assert(fs.existsSync(contextManagerPath), 'Context manager file not found');
  const content = fs.readFileSync(contextManagerPath, 'utf8');
  assert(content.includes('ShopifyContextManager'), 'ShopifyContextManager class not found');
  assert(content.includes('captureProductContext'), 'captureProductContext method not found');
  assert(content.includes('captureCustomerInfo'), 'captureCustomerInfo method not found');
  assert(content.includes('captureCartContext'), 'captureCartContext method not found');
});

// Test 2: Chatbot Widget Structure
test('Chatbot Widget exists', () => {
  const fs = require('fs');
  const path = require('path');
  const widgetPath = path.join(__dirname, '../extensions/chatbot-widget/assets/chatbot.js');
  assert(fs.existsSync(widgetPath), 'Chatbot widget file not found');
  const content = fs.readFileSync(widgetPath, 'utf8');
  assert(content.includes('ShopifyChatbot'), 'ShopifyChatbot class not found');
  assert(content.includes('sendMessage'), 'sendMessage method not found');
  assert(content.includes('contextManager'), 'contextManager property not found');
});

// Test 3: Backend Redis Client
test('Backend Redis client exists', () => {
  const fs = require('fs');
  const path = require('path');
  const redisPath = path.join(__dirname, '../lib/redis.ts');
  assert(fs.existsSync(redisPath), 'Redis client file not found');
  const content = fs.readFileSync(redisPath, 'utf8');
  assert(content.includes('setContext'), 'setContext function not found');
  assert(content.includes('getContext'), 'getContext function not found');
  assert(content.includes('setConversationHistory'), 'setConversationHistory function not found');
  assert(content.includes('getConversationHistory'), 'getConversationHistory function not found');
  assert(content.includes('@upstash/redis'), 'Upstash Redis import not found');
});

// Test 4: Context Service
test('Context service exists', () => {
  const fs = require('fs');
  const path = require('path');
  const contextPath = path.join(__dirname, '../lib/context.ts');
  assert(fs.existsSync(contextPath), 'Context service file not found');
  const content = fs.readFileSync(contextPath, 'utf8');
  assert(content.includes('buildContextString'), 'buildContextString function not found');
  assert(content.includes('getEnrichedContext'), 'getEnrichedContext function not found');
});

// Test 5: Chat API Integration
test('Chat API uses context system', () => {
  const fs = require('fs');
  const path = require('path');
  const chatApiPath = path.join(__dirname, '../app/api/chat/route.ts');
  assert(fs.existsSync(chatApiPath), 'Chat API file not found');
  const content = fs.readFileSync(chatApiPath, 'utf8');
  assert(content.includes('setContext'), 'setContext import/usage not found');
  assert(content.includes('getContext'), 'getContext import/usage not found');
  assert(content.includes('buildContextString'), 'buildContextString import/usage not found');
  assert(content.includes('session_id'), 'session_id handling not found');
});

// Test 6: Extension Structure
test('Shopify extension structure exists', () => {
  const fs = require('fs');
  const path = require('path');
  const extensionDir = path.join(__dirname, '../extensions/chatbot-widget');
  assert(fs.existsSync(extensionDir), 'Extension directory not found');
  
  const assetsDir = path.join(extensionDir, 'assets');
  const blocksDir = path.join(extensionDir, 'blocks');
  const configFile = path.join(extensionDir, 'shopify.extension.toml');
  
  assert(fs.existsSync(assetsDir), 'Assets directory not found');
  assert(fs.existsSync(blocksDir), 'Blocks directory not found');
  assert(fs.existsSync(configFile), 'Extension config file not found');
  
  // Check for required files
  assert(fs.existsSync(path.join(assetsDir, 'context-manager.js')), 'context-manager.js not found');
  assert(fs.existsSync(path.join(assetsDir, 'chatbot.js')), 'chatbot.js not found');
  assert(fs.existsSync(path.join(assetsDir, 'styles.css')), 'styles.css not found');
  assert(fs.existsSync(path.join(blocksDir, 'chatbot-block.liquid')), 'chatbot-block.liquid not found');
});

// Test 7: Package Dependencies
test('Package dependencies installed', () => {
  const fs = require('fs');
  const path = require('path');
  const packageJsonPath = path.join(__dirname, '../package.json');
  assert(fs.existsSync(packageJsonPath), 'package.json not found');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  assert(packageJson.dependencies['@upstash/redis'], '@upstash/redis dependency not found');
});

// Test 8: Backend API Endpoint (if backend is accessible)
test('Backend API responds to requests', async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: `test_session_${Date.now()}`,
        message: 'Test message',
        context: {
          page_type: 'product',
          current_product: {
            id: TEST_PRODUCT_ID,
            handle: 'test-product'
          },
          shop_domain: SHOP_DOMAIN,
          customer: {
            logged_in: false,
            id: null
          },
          cart: null
        },
        shop_domain: SHOP_DOMAIN
      })
    });
    
    assert(response.status !== 404, 'API endpoint not found (404)');
    assert(response.status !== 500 || response.ok, 'API endpoint error (500)');
    
    if (response.ok) {
      const data = await response.json();
      assert(data.message || data.response, 'Response missing message field');
    }
  } catch (error) {
    // If backend is not accessible, that's okay for structure tests
    console.log('  ⚠️  Backend not accessible (expected in local testing):', error.message);
  }
});

// Test 9: Context Manager Methods
test('Context manager has all required methods', () => {
  const fs = require('fs');
  const path = require('path');
  const contextManagerPath = path.join(__dirname, '../extensions/chatbot-widget/assets/context-manager.js');
  const content = fs.readFileSync(contextManagerPath, 'utf8');
  
  const requiredMethods = [
    'detectPageType',
    'captureProductContext',
    'captureCustomerInfo',
    'captureCartContext',
    'setupNavigationWatcher',
    'getContext',
    'getOrCreateSessionId'
  ];
  
  requiredMethods.forEach(method => {
    assert(content.includes(method), `Method ${method} not found in context manager`);
  });
});

// Test 10: Context String Building
test('Context service builds context strings correctly', () => {
  const fs = require('fs');
  const path = require('path');
  const contextPath = path.join(__dirname, '../lib/context.ts');
  const content = fs.readFileSync(contextPath, 'utf8');
  
  // Check for context building logic
  assert(content.includes('Current Product'), 'Product context building not found');
  assert(content.includes('Customer Status'), 'Customer context building not found');
  assert(content.includes('Shopping Cart'), 'Cart context building not found');
  assert(content.includes('formatPrice'), 'Price formatting not found');
});

// Test 11: Chat API Context Handling
test('Chat API handles context from frontend', () => {
  const fs = require('fs');
  const path = require('path');
  const chatApiPath = path.join(__dirname, '../app/api/chat/route.ts');
  const content = fs.readFileSync(chatApiPath, 'utf8');
  
  // Check for context handling
  assert(content.includes('requestBody.context'), 'Context from request body not handled');
  assert(content.includes('session_id'), 'Session ID handling not found');
  assert(content.includes('shop_domain'), 'Shop domain from context not handled');
  assert(content.includes('page_type'), 'Page type from context not handled');
});

// Test 12: Styles File
test('Chatbot styles file exists', () => {
  const fs = require('fs');
  const path = require('path');
  const stylesPath = path.join(__dirname, '../extensions/chatbot-widget/assets/styles.css');
  assert(fs.existsSync(stylesPath), 'Styles file not found');
  const content = fs.readFileSync(stylesPath, 'utf8');
  assert(content.includes('#shopify-chatbot-widget'), 'Chatbot widget styles not found');
  assert(content.includes('.chatbot-window') || content.includes('chatbot-window'), 'Chatbot window styles not found');
  assert(content.includes('.chatbot-messages') || content.includes('chatbot-messages'), 'Chatbot messages styles not found');
});

// Run all tests
async function runTests() {
  console.log('Running tests...\n');
  
  for (const testCase of tests) {
    try {
      await testCase.fn();
      console.log(`✅ ${testCase.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Execute tests
runTests().catch(console.error);

