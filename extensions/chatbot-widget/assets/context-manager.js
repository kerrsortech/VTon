/**
 * ShopifyContextManager
 * Captures real-time context from Shopify storefront
 * This is the KEY to making your chatbot context-aware
 */

class ShopifyContextManager {
  constructor(config) {
    this.backendUrl = config.backendUrl;
    this.sessionId = this.getOrCreateSessionId();
    this.shopDomain = window.Shopify?.shop || config.shopDomain;
    
    this.context = {
      session_id: this.sessionId,
      shop_domain: this.shopDomain,
      customer: null,
      current_product: null,
      cart: null,
      page_type: null,
      url: window.location.href,
      timestamp: Date.now()
    };
    
    console.log('[Context Manager] Initializing...');
    this.init();
  }
  
  /**
   * Initialize context capture
   */
  init() {
    this.detectPageType();
    this.captureCustomerInfo();
    this.captureProductContext();
    this.captureCartContext();
    this.setupNavigationWatcher();
    
    console.log('[Context Manager] Initial context:', this.context);
  }
  
  /**
   * CRITICAL: Detect what page user is on
   */
  detectPageType() {
    const path = window.location.pathname;
    
    if (path.includes('/products/')) {
      this.context.page_type = 'product';
    } else if (path.includes('/collections/')) {
      this.context.page_type = 'collection';
    } else if (path.includes('/cart')) {
      this.context.page_type = 'cart';
    } else if (path.includes('/account')) {
      this.context.page_type = 'account';
    } else if (path === '/' || path === '') {
      this.context.page_type = 'home';
    } else {
      this.context.page_type = 'other';
    }
    
    console.log('[Context Manager] Page type:', this.context.page_type);
  }
  
  /**
   * CRITICAL: Capture product context
   * This is WHY your chatbot doesn't know which product user is viewing
   */
  captureProductContext() {
    if (this.context.page_type !== 'product') {
      this.context.current_product = null;
      return;
    }
    
    let productData = {};
    
    // Method 1: ShopifyAnalytics (Most Reliable - Works 90% of time)
    if (window.ShopifyAnalytics?.meta?.product) {
      const product = window.ShopifyAnalytics.meta.product;
      productData = {
        id: product.id?.toString(),
        gid: product.gid,
        type: product.type,
        vendor: product.vendor,
        variants: product.variants
      };
      console.log('[Context Manager] Product from ShopifyAnalytics:', productData);
    }
    
    // Method 2: Meta tags (Fallback)
    if (!productData.id) {
      const metaProductId = document.querySelector('meta[property="product:id"]')?.content ||
                           document.querySelector('meta[name="product:id"]')?.content;
      if (metaProductId) {
        productData.id = metaProductId;
        console.log('[Context Manager] Product ID from meta tag:', metaProductId);
      }
    }
    
    // Method 3: Extract handle from URL
    const handleMatch = window.location.pathname.match(/\/products\/([^\/\?]+)/);
    if (handleMatch) {
      productData.handle = handleMatch[1];
      console.log('[Context Manager] Product handle:', productData.handle);
    }
    
    // Method 4: Try to find product JSON in page (Shopify theme standard)
    const productJsonScript = document.querySelector('script[data-product-json]') ||
                              document.querySelector('script[type="application/json"][data-product]');
    if (productJsonScript) {
      try {
        const productJson = JSON.parse(productJsonScript.textContent);
        productData.id = productData.id || productJson.id?.toString();
        productData.title = productJson.title || productJson.name;
        productData.price = productJson.price;
        productData.handle = productJson.handle;
        productData.variants = productJson.variants;
        productData.options = productJson.options;
        console.log('[Context Manager] Product from JSON:', productData);
      } catch (e) {
        console.warn('[Context Manager] Failed to parse product JSON:', e);
      }
    }
    
    // Method 5: Check window.meta (some themes)
    if (window.meta?.product) {
      productData.id = productData.id || window.meta.product.id?.toString();
      productData.title = productData.title || window.meta.product.title;
      console.log('[Context Manager] Product from window.meta');
    }
    
    // Method 6: Check Shopify.theme object (some themes)
    if (window.Shopify?.theme?.product) {
      const themeProduct = window.Shopify.theme.product;
      productData.id = productData.id || themeProduct.id?.toString();
      productData.title = productData.title || themeProduct.title;
      productData.variants = productData.variants || themeProduct.variants;
      console.log('[Context Manager] Product from Shopify.theme');
    }
    
    this.context.current_product = Object.keys(productData).length > 0 ? productData : null;
    
    if (this.context.current_product) {
      console.log('[Context Manager] ✅ Product captured:', this.context.current_product);
    } else {
      console.warn('[Context Manager] ⚠️ Could not capture product info');
    }
  }
  
  /**
   * Capture customer info (if logged in)
   */
  captureCustomerInfo() {
    // Method 1: Shopify's __st object (most reliable)
    if (typeof __st !== 'undefined' && __st.cid) {
      this.context.customer = {
        id: __st.cid.toString(),
        logged_in: true
      };
      console.log('[Context Manager] Customer logged in:', __st.cid);
    } 
    // Method 2: Check meta tag
    else if (document.querySelector('meta[name="customer-id"]')) {
      const customerId = document.querySelector('meta[name="customer-id"]').content;
      if (customerId && customerId !== '0') {
        this.context.customer = {
          id: customerId,
          logged_in: true
        };
      }
    }
    // Method 3: Check window.Shopify.customer
    else if (window.Shopify?.customer?.id) {
      this.context.customer = {
        id: window.Shopify.customer.id.toString(),
        logged_in: true
      };
      console.log('[Context Manager] Customer from window.Shopify:', this.context.customer.id);
    }
    // Not logged in
    else {
      this.context.customer = {
        logged_in: false,
        id: null
      };
      console.log('[Context Manager] Customer not logged in');
    }
  }
  
  /**
   * Capture cart context
   */
  async captureCartContext() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      this.context.cart = {
        item_count: cart.item_count,
        total_price: cart.total_price,
        currency: cart.currency,
        items: cart.items?.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: item.price
        })) || []
      };
      
      console.log('[Context Manager] Cart:', this.context.cart);
    } catch (error) {
      console.warn('[Context Manager] Failed to fetch cart:', error);
      this.context.cart = null;
    }
  }
  
  /**
   * Watch for navigation changes (SPA-like behavior)
   */
  setupNavigationWatcher() {
    let lastUrl = location.href;
    
    // Watch for URL changes
    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('[Context Manager] Navigation detected:', currentUrl);
        
        // Re-capture context
        this.context.url = currentUrl;
        this.detectPageType();
        this.captureProductContext();
        this.captureCartContext();
      }
    };
    
    // Poll for URL changes (works for all navigation types)
    setInterval(checkUrlChange, 500);
    
    // Also listen to popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.detectPageType();
        this.captureProductContext();
      }, 100);
    });
    
    // Listen to pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        checkUrlChange();
      }, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        checkUrlChange();
      }, 100);
    };
  }
  
  /**
   * Get current context
   */
  getContext() {
    return {
      ...this.context,
      timestamp: Date.now()
    };
  }
  
  /**
   * Generate or retrieve session ID
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('chatbot_session_id');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('chatbot_session_id', sessionId);
    }
    
    return sessionId;
  }
}

// Export to global scope
window.ShopifyContextManager = ShopifyContextManager;

