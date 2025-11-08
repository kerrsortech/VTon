(function() {
  'use strict';

  console.log('🤖 Closelook Widgets script loaded');

  // Get configuration from data attributes or defaults
  function getConfig() {
    const blockElement = document.querySelector('[data-closelook-config]');
    if (blockElement) {
      return JSON.parse(blockElement.dataset.closelookConfig || '{}');
    }
    
    // Try to get from Liquid settings (Shopify context)
    return {
      backendUrl: window.closelookBackendUrl || 'https://vton-1-hqmc.onrender.com',
      enableChatbot: true,
      enableTryOn: true
    };
  }

  const config = getConfig();

  // State management
  let state = {
    isOpen: false,
    hasClickedOnce: false,
    messages: [],
    input: '',
    isLoading: false,
    isGenerating: false,
    uploadError: null,
    isUploadDialogOpen: false,
    fullBodyPhoto: null,
    halfBodyPhoto: null,
    fullBodyPreview: null,
    halfBodyPreview: null,
    fullBodyUrl: null, // Saved image URL from server
    halfBodyUrl: null, // Saved image URL from server
    fullScreenImage: null,
    currentProduct: null,
    productCatalog: [], // Store catalog for recommendation mapping
    contextManager: null // Context manager instance
  };

  console.log('🔧 Widget config:', config);
  
  // Initialize context manager if available
  if (typeof window.ShopifyContextManager !== 'undefined') {
    try {
      state.contextManager = new window.ShopifyContextManager({
        backendUrl: config.backendUrl,
        shopDomain: window.Shopify?.shop || window.chatbotConfig?.shopDomain
      });
      console.log('✅ Context Manager initialized');
    } catch (e) {
      console.warn('⚠️ Context Manager initialization failed:', e);
    }
  }

  // ===== INITIALIZATION =====

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
      initChatbot();
    }
  }

  function initChatbot() {
    if (!config.enableChatbot) {
      console.log('💬 Chatbot disabled');
      return;
    }

    const firstClick = document.getElementById('chatbot-first-click');
    const openBtn = document.getElementById('chatbot-open-btn');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const panel = document.getElementById('chatbot-panel');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const input = document.getElementById('chatbot-input');
    const tryOnBtn = document.getElementById('chatbot-try-on-btn');
    const uploadBtn = document.getElementById('chatbot-upload-btn');

    if (!panel) {
      console.error('❌ Chatbot panel not found');
      return;
    }

    console.log('✅ All chatbot elements found');

    // First click handler
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        playClickFeedback();
        state.isOpen = true;
        state.hasClickedOnce = true;
        updateUI();
      });
    }

    // Toggle button handler
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        playClickFeedback();
        state.isOpen = !state.isOpen;
        updateUI();
      });
    }

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        playClickFeedback();
        state.isOpen = false;
        updateUI();
      });
    }

    // Send message handler
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        handleSend();
      });
    }

    // Input handlers
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });

      input.addEventListener('input', (e) => {
        state.input = e.target.value;
        updateSendButton();
      });

      // Enable input after initialization
      setTimeout(() => {
        input.disabled = false;
      }, 100);
    }

    // Try-on button handler
    if (tryOnBtn) {
      tryOnBtn.addEventListener('click', () => {
        handleTryOnClick();
      });
    }

    // Upload button handler
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        handleUploadClick();
      });
    }

    // Initialize backend
    initializeBackend();

    // Initial greeting - start with default, then try to personalize
    state.messages = [{ role: 'assistant', content: 'How may I help you?' }];
    renderMessages();
    
    // Try to personalize greeting asynchronously (with retries)
    // This handles cases where Shopify customer object loads after page load
    (async function tryPersonalizeGreeting(retries = 3, delay = 500) {
      for (let i = 0; i < retries; i++) {
        // Wait before checking (give time for Shopify to load)
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        
        // Try to get customer name from Shopify
        const customerName = getShopifyCustomerUsername();
        
        if (customerName && customerName.trim()) {
          // Use first name if full name contains space, otherwise use full name
          const firstName = customerName.split(' ')[0].trim();
          if (firstName) {
            // Update greeting with personalized name
            if (state.messages.length === 1 && state.messages[0].content === 'How may I help you?') {
              state.messages[0].content = `Hi ${firstName}, how may I help you?`;
              renderMessages();
              console.log('✅ Personalized greeting updated:', firstName);
              return; // Success, stop retrying
            }
          }
        }
      }
    })();
    
    // Show prompt templates on first load
    renderPromptTemplates();

    // Fetch user images on initialization
    fetchAndStoreUserImages();

    console.log('🚀 Chatbot initialized');
  }

  // Helper function to check if user is logged in to Shopify
  function isUserLoggedIn() {
    if (typeof window === 'undefined') return false;
    
    // Check multiple methods to detect logged-in customer
    // Method 1: window.Shopify.customer (most reliable)
    if (window.Shopify?.customer?.id) {
      return true;
    }
    
    // Method 2: Check __st object (Shopify analytics)
    if (typeof __st !== 'undefined' && __st.cid) {
      return true;
    }
    
    // Method 3: Check meta tag
    const customerMeta = document.querySelector('meta[name="customer-id"], meta[name="shopify-customer-id"]');
    if (customerMeta && customerMeta.getAttribute('content') && customerMeta.getAttribute('content') !== '0') {
      return true;
    }
    
    // Method 4: Check for customer access token cookie
    const customerToken = getCookie('customer_access_token') || getCookie('customer_auth_token');
    if (customerToken) {
      return true;
    }
    
    return false;
  }

  // Helper function to get Shopify customer ID
  function getShopifyCustomerId() {
    if (typeof window === 'undefined') return null;
    
    // Method 1: window.Shopify.customer (most reliable)
    if (window.Shopify?.customer?.id) {
      return window.Shopify.customer.id.toString();
    }
    
    // Method 2: Check __st object (Shopify analytics)
    if (typeof __st !== 'undefined' && __st.cid) {
      return __st.cid.toString();
    }
    
    // Method 3: Check meta tag
    const customerMeta = document.querySelector('meta[name="customer-id"], meta[name="shopify-customer-id"]');
    if (customerMeta) {
      const customerId = customerMeta.getAttribute('content');
      if (customerId && customerId !== '0') {
        return customerId;
      }
    }
    
    return null;
  }

  // Helper function to get Shopify customer username (first name + last name)
  function getShopifyCustomerUsername() {
    if (typeof window === 'undefined') return null;
    
    try {
      // Method 1: window.Shopify.customer (most reliable)
      if (window.Shopify?.customer) {
        const firstName = window.Shopify.customer.first_name || '';
        const lastName = window.Shopify.customer.last_name || '';
        const name = `${firstName} ${lastName}`.trim();
        return name || null;
      }
      
      // Method 2: Check meta tag
      if (typeof document !== 'undefined') {
        const customerNameMeta = document.querySelector('meta[name="shopify-customer-name"]');
        if (customerNameMeta) {
          const customerName = customerNameMeta.getAttribute('content');
          if (customerName) {
            return customerName;
          }
        }
      }
      
      // Method 3: Check cookie
      const customerName = getCookie('customer_name');
      if (customerName) {
        return customerName;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Fetch and store user images from server
  async function fetchAndStoreUserImages() {
    // Only fetch if user is logged in
    if (!isUserLoggedIn()) {
      console.log('ℹ️ User not logged in, skipping image fetch');
      return;
    }
    
    try {
      const userImages = await fetchUserImages();
      if (userImages.fullBodyUrl) {
        state.fullBodyUrl = userImages.fullBodyUrl;
        state.fullBodyPreview = userImages.fullBodyUrl; // Display saved image
        console.log('✅ Loaded full body image from server');
      }
      if (userImages.halfBodyUrl) {
        state.halfBodyUrl = userImages.halfBodyUrl;
        state.halfBodyPreview = userImages.halfBodyUrl; // Display saved image
        console.log('✅ Loaded half body image from server');
      }
    } catch (error) {
      console.debug('Could not fetch user images on init:', error);
      // Silently fail - images might not exist yet
    }
  }

  // Render context-aware prompt templates (exact match of original)
  function renderPromptTemplates() {
    const templatesContainer = document.getElementById('chatbot-templates');
    if (!templatesContainer) return;

    // Only show templates when there's just the greeting message
    const showTemplates = state.messages.length === 1 && !state.input.trim();
    
    if (!showTemplates) {
      templatesContainer.style.display = 'none';
      return;
    }

    // Determine context for templates
    const pathname = window.location.pathname;
    const promptTemplates = pathname === '/' || pathname === ''
      ? [
          'Show me trending products',
          'Help me find something',
          'What are your best-selling items?'
        ]
      : state.currentProduct
        ? [
            'Tell me more about this product',
            'Recommend matching items'
          ]
        : ['Help me find products', "What's new?"];

    templatesContainer.innerHTML = '';
    templatesContainer.style.display = 'flex';

    promptTemplates.forEach(template => {
      const templateBtn = document.createElement('button');
      templateBtn.className = 'chatbot-template-button';
      templateBtn.textContent = template;
      templateBtn.onclick = () => {
        playClickFeedback();
        state.input = template;
        const input = document.getElementById('chatbot-input');
        if (input) input.value = template;
        updateSendButton();
        handleSend(template);
      };
      templatesContainer.appendChild(templateBtn);
    });
  }

  // ===== UI UPDATES =====

  function updateUI() {
    const firstClick = document.getElementById('chatbot-first-click');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const panel = document.getElementById('chatbot-panel');
    const iconMessage = document.getElementById('chatbot-icon-message');
    const iconClose = document.getElementById('chatbot-icon-close');

    // Update button visibility
    if (state.hasClickedOnce) {
      if (firstClick) firstClick.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'flex';
      
      // Update toggle button icon
      if (state.isOpen) {
        if (iconMessage) iconMessage.style.display = 'none';
        if (iconClose) iconClose.style.display = 'block';
        if (toggleBtn) toggleBtn.classList.add('open');
      } else {
        if (iconMessage) iconMessage.style.display = 'block';
        if (iconClose) iconClose.style.display = 'none';
        if (toggleBtn) toggleBtn.classList.remove('open');
      }
    } else {
      if (firstClick) firstClick.style.display = 'block';
      if (toggleBtn) toggleBtn.style.display = 'none';
    }

    // Update panel visibility
    if (panel) {
      if (state.isOpen) {
        panel.classList.add('open');
        panel.classList.add('animate-bounce');
        setTimeout(() => {
          panel.classList.remove('animate-bounce');
        }, 300);
      } else {
        panel.classList.remove('open');
      }
    }
  }

  function updateSendButton() {
    const sendBtn = document.getElementById('chatbot-send-btn');
    if (sendBtn) {
      sendBtn.disabled = !state.input.trim() || state.isLoading;
    }
  }

  // ===== MESSAGE HANDLING =====

  function handleSend(messageOverride) {
    const message = messageOverride || state.input.trim();
    if (!message || state.isLoading) return;

    state.input = '';
    
    const input = document.getElementById('chatbot-input');
    if (input) input.value = '';

    // Add user message
    state.messages.push({ role: 'user', content: message });
    renderMessages();

    // Send to backend
    sendMessageToBackend(message);
  }

  function renderMessages() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    container.innerHTML = '';

    state.messages.forEach((msg, index) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chatbot-message chatbot-message-${msg.role}`;

      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = `chatbot-message-bubble chatbot-message-bubble-${msg.role}`;

      const textP = document.createElement('p');
      textP.className = 'chatbot-message-text';
      textP.textContent = msg.content;
      bubbleDiv.appendChild(textP);

      // Add image if present
      if (msg.imageUrl) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'chatbot-message-image';
        imageDiv.onclick = () => setFullScreenImage(msg.imageUrl);

        const img = document.createElement('img');
        img.src = msg.imageUrl;
        img.alt = msg.imageType === 'try-on' ? 'Virtual try-on result' : 'Image';
        imageDiv.appendChild(img);

        // Download button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'chatbot-message-image-actions';
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'chatbot-download-button';
        downloadBtn.innerHTML = `
          <svg class="chatbot-download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download image
        `;
        downloadBtn.onclick = (e) => {
          e.stopPropagation();
          handleDownloadImage(msg.imageUrl);
        };
        actionsDiv.appendChild(downloadBtn);
        imageDiv.appendChild(actionsDiv);

        bubbleDiv.appendChild(imageDiv);
      }

      // Add recommendations if present
      if (msg.recommendations && msg.recommendations.length > 0) {
        const recsDiv = document.createElement('div');
        recsDiv.className = 'chatbot-product-recommendations';

        msg.recommendations.forEach(rec => {
          // Find product in catalog by ID to get handle and images
          // Try multiple matching strategies for compatibility
          const product = state.productCatalog.find(p => {
            const productId = p.id?.toString() || '';
            const productHandle = p.handle || '';
            const recId = rec.id?.toString() || '';
            return productId === recId || 
                   productHandle === recId || 
                   productId === rec.id ||
                   productHandle === rec.id;
          });
          
          // Use Shopify product URL format: /products/{handle}
          let productUrl = `/products/${rec.id}`; // Default to ID (might be handle)
          let productImage = rec.image || '/placeholder.svg';
          
          if (product) {
            // Use product handle for URL (Shopify standard)
            productUrl = `/products/${product.handle || product.id}`;
            // Get image from product catalog
            productImage = product.featured_image || 
                          (product.images?.[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].src || product.images[0].url) : null) ||
                          productImage;
          }

          const recDiv = document.createElement('a');
          recDiv.className = 'chatbot-product-recommendation';
          recDiv.href = productUrl;
          recDiv.target = '_self'; // Open in same tab (Shopify navigation)

          const contentDiv = document.createElement('div');
          contentDiv.className = 'chatbot-product-rec-content';

          const imageDiv = document.createElement('div');
          imageDiv.className = 'chatbot-product-rec-image';
          const img = document.createElement('img');
          img.src = productImage;
          img.alt = rec.name || 'Product';
          img.loading = 'lazy'; // Lazy load images
          img.onerror = function() {
            // Fallback to placeholder if image fails to load
            this.src = '/placeholder.svg';
          };
          imageDiv.appendChild(img);

          const infoDiv = document.createElement('div');
          infoDiv.className = 'chatbot-product-rec-info';
          const nameP = document.createElement('p');
          nameP.className = 'chatbot-product-rec-name';
          nameP.textContent = rec.name || 'Product';
          const priceP = document.createElement('p');
          priceP.className = 'chatbot-product-rec-price';
          priceP.textContent = `$${rec.price?.toFixed(2) || '0.00'}`;
          const reasonP = document.createElement('p');
          reasonP.className = 'chatbot-product-rec-reason';
          reasonP.textContent = rec.reason || '';
          infoDiv.appendChild(nameP);
          infoDiv.appendChild(priceP);
          infoDiv.appendChild(reasonP);

          contentDiv.appendChild(imageDiv);
          contentDiv.appendChild(infoDiv);
          recDiv.appendChild(contentDiv);
          recsDiv.appendChild(recDiv);
        });

        bubbleDiv.appendChild(recsDiv);
      }

      messageDiv.appendChild(bubbleDiv);
      container.appendChild(messageDiv);
    });

      // Auto-scroll to bottom (exact match of original)
    const scrollTimeout = setTimeout(() => {
      container.scrollTop = container.scrollHeight;
      // Also try ScrollArea viewport if present
      const scrollViewport = container.closest('.chatbot-messages-container')?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }, 100);

    // Cleanup timeout on component unmount would go here if needed

    // Show loading if active
    if (state.isLoading) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'chatbot-message chatbot-message-assistant chatbot-message-loading';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'chatbot-message-bubble chatbot-message-bubble-assistant';
      bubbleDiv.innerHTML = `
        <svg class="chatbot-loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <p class="chatbot-loading-text">Thinking...</p>
      `;
      loadingDiv.appendChild(bubbleDiv);
      container.appendChild(loadingDiv);
      container.scrollTop = container.scrollHeight;
    }
  }

  // ===== BACKEND API =====

  async function sendMessageToBackend(message) {
    state.isLoading = true;
    renderMessages();
    updateSendButton();

    try {
      const backendUrl = config.backendUrl.replace(/\/$/, '') + '/api/chat';

      // Get conversation history
      const conversationHistory = state.messages
        .filter(m => m.role !== 'assistant' || !m.imageUrl)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Determine page context (exact match of original)
      let pageContext = 'other';
      const pathname = window.location.pathname;
      if (pathname === '/' || pathname === '') {
        pageContext = 'home';
      } else if (pathname.includes('/products/') || state.currentProduct) {
        pageContext = 'product';
      }

      // Get current page URL (for backend context)
      const currentPageUrl = window.location.href;

      // Get Shopify context (comprehensive detection)
      let shopDomain = undefined;
      let customerName = undefined;
      let customerInternal = undefined;

      if (typeof window !== 'undefined') {
        try {
          // PRODUCTION FIX: Robust shop domain detection
          // Priority order: window.Shopify.shop > meta tag > liquid variable > hostname
          
          const shopify = window.Shopify;
          
          // Method 1: window.Shopify.shop (MOST RELIABLE - always myshopify.com format)
          if (shopify?.shop) {
            shopDomain = shopify.shop;
            console.log('[Closelook] Shop domain from Shopify object:', shopDomain);
          }
          
          // Method 2: Meta tag (theme may provide this)
          if (!shopDomain) {
            const shopMeta = document.querySelector('meta[name="shopify-shop"]');
            if (shopMeta) {
              shopDomain = shopMeta.getAttribute('content');
              console.log('[Closelook] Shop domain from meta tag:', shopDomain);
            }
          }
          
          // Method 3: Data attribute from liquid (if widget passes it)
          if (!shopDomain) {
            const widgetElement = document.querySelector('[data-shop-domain]');
            if (widgetElement) {
              shopDomain = widgetElement.getAttribute('data-shop-domain');
              console.log('[Closelook] Shop domain from data attribute:', shopDomain);
            }
          }
          
          // Method 4: Parse from hostname (only works on myshopify.com, not custom domains)
          if (!shopDomain) {
            const hostname = window.location.hostname;
            const shopMatch = hostname.match(/([^.]+)\.myshopify\.com/);
            if (shopMatch) {
              shopDomain = `${shopMatch[1]}.myshopify.com`;
              console.log('[Closelook] Shop domain from hostname:', shopDomain);
            }
          }
          
          // IMPORTANT: On custom domains, methods 1-3 should work
          // Backend will handle domain mapping (custom domain -> myshopify.com)
          if (!shopDomain) {
            console.warn('[Closelook] Could not determine shop domain - widget may not work correctly');
          }

          // Detect customer (exact copy of customer-detector.ts logic)
          try {
            // Method 1: window.Shopify.customer
            if (shopify?.customer) {
              const firstName = shopify.customer.first_name;
              const lastName = shopify.customer.last_name;
              const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
              
              customerName = name;
              customerInternal = {
                id: shopify.customer.id?.toString(),
                email: shopify.customer.email
              };
            }

            // Method 2: Customer name from cookies or meta tags
            if (!customerName) {
              const customerNameCookie = getCookie('customer_name');
              const customerNameMeta = document.querySelector('meta[name="shopify-customer-name"]')?.getAttribute('content');
              if (customerNameCookie || customerNameMeta) {
                customerName = customerNameCookie || customerNameMeta;
              }
            }

            // Method 3: Customer ID and access token (for backend use)
            if (!customerInternal) {
              const customerIdMeta = document.querySelector('meta[name="shopify-customer-id"]');
              const customerAccessToken = getCookie('customer_access_token') || getCookie('customer_auth_token');
              
              if (customerIdMeta || customerAccessToken) {
                customerInternal = {
                  id: customerIdMeta?.getAttribute('content'),
                  accessToken: customerAccessToken
                };
              }
            }

            // Method 4: Theme customer data
            if (!customerInternal && !customerName) {
              const themeCustomer = window.customer || document.customer;
              if (themeCustomer) {
                const firstName = themeCustomer.first_name || themeCustomer.firstName;
                const lastName = themeCustomer.last_name || themeCustomer.lastName;
                const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
                
                customerName = name;
                customerInternal = {
                  id: themeCustomer.id?.toString(),
                  email: themeCustomer.email
                };
              }
            }
          } catch (e) {
            console.debug('Customer detection error:', e);
          }
        } catch (e) {
          console.debug('Shopify context detection error:', e);
        }
      }

      // PRODUCTION FIX: Do NOT fetch products client-side
      // Backend handles all product fetching via Storefront API using session
      // This eliminates /products.json access issues and improves performance
      
      // Get context from context manager if available (for context-aware chatbot)
      let context = null;
      let sessionId = null;
      
      if (state.contextManager) {
        try {
          context = state.contextManager.getContext();
          sessionId = state.contextManager.sessionId;
          console.log('✅ Context captured:', {
            pageType: context.page_type,
            hasProduct: !!context.current_product,
            hasCustomer: !!context.customer,
            hasCart: !!context.cart
          });
        } catch (e) {
          console.warn('⚠️ Failed to get context from context manager:', e);
        }
      }
      
      // Build complete payload - backend will fetch products using shop domain
      // Include context from context manager for context-aware chatbot
      const payload = {
        message: message,
        conversationHistory: conversationHistory,
        pageContext: pageContext, // 'home' | 'product' | 'other'
        shop: shopDomain, // CRITICAL: Backend uses this to fetch products via Storefront API
        shop_domain: shopDomain, // Also send as shop_domain for compatibility
        customerName: customerName, // Customer name for personalization (only name, not sensitive data)
        customerInternal: customerInternal, // Internal customer info for backend API calls (id, email, accessToken)
        currentProduct: state.currentProduct ? {
          id: state.currentProduct.id,
          name: state.currentProduct.name,
          category: state.currentProduct.category,
          type: state.currentProduct.type,
          color: state.currentProduct.color,
          price: state.currentProduct.price,
          description: state.currentProduct.description,
          sizes: state.currentProduct.sizes,
          url: state.currentProduct.url || currentPageUrl // Current page URL for product page analysis
        } : undefined,
        // NEW: Add context from context manager for context-aware chatbot
        context: context, // Full context object from context manager
        session_id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Session ID for Redis
        // REMOVED: allProducts field
        // Backend fetches products from Shopify Storefront API using session's storefront token
        // See app/api/chat/route.ts lines 269-346 for implementation
      };

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || `Server error (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data || typeof data.message !== 'string') {
        throw new Error('Invalid response format from server');
      }

      // Add assistant message with all features from backend
      state.messages.push({
        role: 'assistant',
        content: data.message || "I'm here to help! How can I assist you today?",
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        imageUrl: data.imageUrl,
        imageType: data.imageType
      });

      // Handle ticket creation (if chatbot couldn't help after 3-5 messages)
      // Backend detects ticket request and creates customer note in Shopify
      if (data.ticketCreated) {
        console.log('🎫 Ticket created successfully via chatbot');
        // Message already includes ticket confirmation in content
        // Ticket is sent to store manager via Shopify customer notes
      }

      // Re-render to show new message and update templates
      renderMessages();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      const errorMessage = error.message.includes('timeout') || error.message.includes('network')
        ? "I'm having trouble connecting right now. Please check your internet connection and try again."
        : "Sorry, I encountered an error. Please try again, or feel free to ask me about products, orders, or store policies.";

      state.messages.push({
        role: 'assistant',
        content: errorMessage
      });
    } finally {
      state.isLoading = false;
      renderMessages();
      updateSendButton();
    }
  }

  function initializeBackend() {
    const backendUrl = config.backendUrl.replace(/\/$/, '') + '/api/chat';
    console.log('🔗 Initializing chatbot connection to:', backendUrl);
    // Backend initialization is handled server-side
  }

  // ===== TRY-ON FUNCTIONALITY =====

  async function handleTryOnClick() {
    // Check if user is logged in first
    if (!isUserLoggedIn()) {
      state.messages.push({
        role: 'assistant',
        content: 'Please sign in to your Shopify account to use the virtual try-on feature. You can sign in using the account button in the top right corner of the store.'
      });
      renderMessages();
      return;
    }

    if (!state.currentProduct) {
      state.messages.push({
        role: 'assistant',
        content: 'Please navigate to a specific product page to use the virtual try-on feature.'
      });
      renderMessages();
      return;
    }

    if (state.isGenerating) {
      console.log('⏳ Try-on already in progress, ignoring click');
      return;
    }

    // First check if images are already in state (from previous upload or fetch)
    const hasImagesInState = state.fullBodyUrl || state.halfBodyUrl;
    
    if (hasImagesInState) {
      console.log('✅ Images found in state, using them for try-on', {
        hasFullBody: !!state.fullBodyUrl,
        hasHalfBody: !!state.halfBodyUrl
      });
      await performVirtualTryOn({
        fullBodyUrl: state.fullBodyUrl,
        halfBodyUrl: state.halfBodyUrl
      });
      return;
    }

    // If no images in state, try to fetch from server
    console.log('🔍 No images in state, fetching from server...');
    try {
      const userImages = await fetchUserImages();
      console.log('📸 User images fetched from server:', {
        hasFullBody: !!userImages.fullBodyUrl,
        hasHalfBody: !!userImages.halfBodyUrl,
        fullBodyUrl: userImages.fullBodyUrl,
        halfBodyUrl: userImages.halfBodyUrl
      });

      // Update state with fetched images
      if (userImages.fullBodyUrl) {
        state.fullBodyUrl = userImages.fullBodyUrl;
        state.fullBodyPreview = userImages.fullBodyUrl;
      }
      if (userImages.halfBodyUrl) {
        state.halfBodyUrl = userImages.halfBodyUrl;
        state.halfBodyPreview = userImages.halfBodyUrl;
      }

      if (userImages.fullBodyUrl || userImages.halfBodyUrl) {
        console.log('✅ Images found on server, generating try-on...');
        await performVirtualTryOn(userImages);
      } else {
        console.log('📤 No images found on server, opening upload dialog');
        state.messages.push({
          role: 'assistant',
          content: 'Please upload a photo first to use the virtual try-on feature. Click the upload button to get started.'
        });
        renderMessages();
        state.isUploadDialogOpen = true;
        renderUploadDialog();
      }
    } catch (error) {
      console.error('❌ Error fetching user images:', error);
      
      // Check if it's a network error
      const isNetworkError = error instanceof TypeError && 
        (error.message.includes('fetch') || error.message.includes('Failed to fetch'));
      
      if (isNetworkError) {
        state.messages.push({
          role: 'assistant',
          content: 'Unable to connect to the server. Please check your internet connection and try again. If you have already uploaded photos, they should still work - try clicking the try-on button again.'
        });
        renderMessages();
      } else {
        // For other errors, show message and open upload dialog
        state.messages.push({
          role: 'assistant',
          content: 'Please upload a photo first to use the virtual try-on feature. Click the upload button to get started.'
        });
        renderMessages();
        state.isUploadDialogOpen = true;
        renderUploadDialog();
      }
    }
  }

  async function fetchUserImages(userId = null) {
    const backendUrl = config.backendUrl.replace(/\/$/, '') + '/api/user-images';
    try {
      // Get Shopify customer ID - required for authenticated users
      const shopifyCustomerId = getShopifyCustomerId();

      const headers = {};
      if (shopifyCustomerId) {
        headers['x-shopify-customer-id'] = shopifyCustomerId;
      } else {
        // If no Shopify customer ID, user must be logged in
        console.warn('⚠️ No Shopify customer ID found - user may not be logged in');
      }
      // If userId is provided (e.g., from upload response), send it as header
      // This ensures we can fetch images immediately after upload even if cookie isn't set yet
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User images fetched:', result.images);
        return result.images || {};
      } else if (response.status !== 400) {
        console.warn('Failed to fetch user images:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.warn('Error details:', errorData);
      }
      return {};
    } catch (error) {
      console.debug('Could not fetch user images:', error);
      return {};
    }
  }

  async function performVirtualTryOn(userImages) {
    if (!state.currentProduct) {
      state.messages.push({
        role: 'assistant',
        content: 'Please navigate to a product page to use the virtual try-on feature.'
      });
      renderMessages();
      return;
    }

    // Check if we're on a product page
    const isProductPage = window.location.pathname.includes('/products/') || 
                          window.location.pathname.match(/\/products\/[^\/]+/);
    
    if (!isProductPage) {
      state.messages.push({
        role: 'assistant',
        content: 'Virtual try-on is only available on product pages. Please navigate to a product page first.'
      });
      renderMessages();
      return;
    }

    state.isGenerating = true;
    updateUploadButton();

    try {
      const backendUrl = config.backendUrl.replace(/\/$/, '') + '/api/try-on';

      const formData = new FormData();
      
      // Validate that we have at least one user image
      if (!userImages.fullBodyUrl && !userImages.halfBodyUrl) {
        throw new Error('No user images available. Please upload a photo first.');
      }
      
      // Use saved images if available, otherwise use uploaded files
      if (userImages.fullBodyUrl) {
        formData.append('fullBodyUrl', userImages.fullBodyUrl);
        console.log('✅ Using full body image URL:', userImages.fullBodyUrl);
      }
      if (userImages.halfBodyUrl) {
        formData.append('halfBodyUrl', userImages.halfBodyUrl);
        console.log('✅ Using half body image URL:', userImages.halfBodyUrl);
      }

      // Add product info (exact match of original backend expectations)
      formData.append('productName', state.currentProduct.name);
      formData.append('productCategory', state.currentProduct.category || '');
      formData.append('productType', state.currentProduct.type || '');
      formData.append('productColor', state.currentProduct.color || '');
      
      // Add product ID if available (for analytics)
      if (state.currentProduct.id) {
        formData.append('productId', state.currentProduct.id);
      }

      // Product URL (always send for page analysis)
      const productUrl = state.currentProduct.url || window.location.href;
      formData.append('productUrl', productUrl);

      // PRODUCTION: Only fetch product images client-side if not in Shopify context
      // Backend will fetch images from Shopify Storefront API when shopDomain is provided
      let shopDomain = undefined;
      if (window.Shopify?.shop) {
        shopDomain = window.Shopify.shop;
      }

      if (!shopDomain) {
        const shopMeta = document.querySelector('meta[name="shopify-shop"]');
        if (shopMeta) {
          shopDomain = shopMeta.getAttribute('content');
        }
      }

      let productImageCount = 0;
      if (!shopDomain && state.currentProduct.images && state.currentProduct.images.length > 0) {
        // Not in Shopify context, fetch images client-side as fallback
        const maxProductImages = 3;
        const productImagesToSend = state.currentProduct.images.slice(0, maxProductImages);

        // If no images in product data, try to get from page
        let productImageUrls = productImagesToSend;
        if (productImageUrls.length === 0) {
          const productImageEl = document.querySelector('.product-image img, .product__media img, [data-product-image] img, .product-gallery img');
          if (productImageEl) {
            let imageUrl = productImageEl.src;
            // Remove size parameters for full resolution
            imageUrl = imageUrl.replace(/[?&]_width=\d+/g, '').replace(/[?&]_height=\d+/g, '');
            productImageUrls = [imageUrl];
          } else if (state.currentProduct.imageUrl) {
            productImageUrls = [state.currentProduct.imageUrl];
          }
        }

        if (productImageUrls.length === 0) {
          throw new Error('Could not find product images. Please ensure you are on a product page.');
        }

        // Fetch product images and convert to File objects
        console.log(`📥 Fetching ${productImageUrls.length} product images client-side (non-Shopify context)...`);
        for (let i = 0; i < productImageUrls.length; i++) {
          try {
            const productImageResponse = await fetch(productImageUrls[i]);
            if (!productImageResponse.ok) {
              console.warn(`⚠️ Failed to fetch product image ${i + 1}:`, productImageResponse.status);
              continue;
            }
            const productImageBlob = await productImageResponse.blob();
            const productImageFile = new File([productImageBlob], `product-${i}.jpg`, { type: productImageBlob.type || 'image/jpeg' });
            formData.append(`productImage${i}`, productImageFile);
            console.log(`✅ Product image ${i + 1} fetched successfully`);
          } catch (error) {
            console.warn(`⚠️ Error fetching product image ${i + 1}:`, error);
            // Continue with other images
          }
        }
        productImageCount = productImageUrls.length;
      } else if (shopDomain) {
        // In Shopify context - backend will fetch images from Storefront API
        console.log('✅ Shopify context detected, backend will fetch product images from Storefront API', shopDomain);
      }

      formData.append('productImageCount', String(productImageCount));
      
      // Always send product URL for backend page analysis (enhances metadata)
      const currentPageUrl = window.location.href;
      if (state.currentProduct.url || currentPageUrl) {
        const productUrl = state.currentProduct.url || currentPageUrl;
        formData.append('productUrl', productUrl);
        console.log('✅ Product URL sent for page analysis:', productUrl);
      }

      // Get Shopify context and customer info - required for authenticated users
      const shopifyCustomerId = getShopifyCustomerId();
      
      if (!shopifyCustomerId) {
        throw new Error('You must be signed in to use the virtual try-on feature. Please sign in to your Shopify account first.');
      }
      
      if (shopDomain) {
        formData.append('shopDomain', shopDomain);
        formData.append('shopifyCustomerId', shopifyCustomerId);
        
        // Try to get customer email if available
        if (window.Shopify?.customer?.email) {
          formData.append('customerEmail', window.Shopify.customer.email);
        }
      } else {
        // Even without shopDomain, we need to send customer ID
        formData.append('shopifyCustomerId', shopifyCustomerId);
      }

      // Backend will:
      // 1. Fetch product images from Shopify Storefront API (if shopDomain provided)
      // 2. Use product images (as File objects) for try-on generation
      // 3. Analyze product URL for enhanced metadata (if provided)
      // 4. Use Replicate API (Seedream-4) to generate try-on image
      // 5. Return result image URL

      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || errorData.errorType === 'RATE_LIMIT_EXCEEDED') {
          throw new Error(errorData.error || 'Service temporarily unavailable. Please try again in a moment.');
        }
        throw new Error(errorData.error || 'Failed to generate try-on image');
      }

      const result = await response.json();

      state.messages.push({
        role: 'assistant',
        content: `Great! I've generated your virtual try-on for ${state.currentProduct.name}. Here's how it looks on you!`,
        imageUrl: result.imageUrl,
        imageType: 'try-on'
      });

      renderMessages();
    } catch (error) {
      console.error('❌ Try-on error:', error);
      
      // Determine error message
      let errorMessage = 'Failed to generate try-on image';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error in chat
      state.messages.push({
        role: 'assistant',
        content: `Sorry, I encountered an error while generating your try-on: ${errorMessage}. Please try again.`
      });
      renderMessages();
      
      // Also show error notification
      state.uploadError = errorMessage;
      showUploadError();
    } finally {
      state.isGenerating = false;
      updateUploadButton();
    }
  }

  async function handleUploadClick() {
    // Check if user is logged in first
    if (!isUserLoggedIn()) {
      state.messages.push({
        role: 'assistant',
        content: 'Please sign in to your Shopify account to upload photos and use the virtual try-on feature. You can sign in using the account button in the top right corner of the store.'
      });
      renderMessages();
      return;
    }

    // Fetch user images before opening dialog to show saved images
    try {
      await fetchAndStoreUserImages();
    } catch (error) {
      console.debug('Could not fetch images before opening dialog:', error);
    }
    state.isUploadDialogOpen = true;
    renderUploadDialog();
  }

  // ===== UPLOAD DIALOG =====

  function renderUploadDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('chatbot-upload-dialog');
    if (existing) {
      existing.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = 'chatbot-upload-dialog';
    dialog.className = 'chatbot-upload-dialog';
    dialog.onclick = (e) => {
      if (e.target === dialog) {
        closeUploadDialog();
      }
    };

    dialog.innerHTML = `
      <div class="chatbot-upload-dialog-content" onclick="event.stopPropagation()">
        <div class="chatbot-upload-dialog-header">
          <h2 class="chatbot-upload-dialog-title">Let's Find Your Perfect Fit</h2>
          <button class="chatbot-upload-dialog-close" id="close-upload-dialog">×</button>
        </div>
        <p class="chatbot-upload-dialog-description">
          Upload a photo to see products styled on you. We'll show you exactly how each item looks before you buy.
        </p>
        <div class="chatbot-upload-dialog-grid">
          <div class="chatbot-upload-dialog-section">
            <label class="chatbot-upload-dialog-label">Standing Photo</label>
            <div class="chatbot-upload-dialog-dropzone" id="full-body-dropzone">
              <input type="file" accept="image/*" class="chatbot-upload-dialog-input" id="full-body-input">
              ${(state.fullBodyPreview || state.fullBodyUrl) ? `
                <div class="chatbot-upload-dialog-preview">
                  <img src="${state.fullBodyPreview || state.fullBodyUrl}" alt="Full body photo">
                  <button class="chatbot-upload-dialog-remove" id="remove-full-body">×</button>
                </div>
              ` : `
                <div class="chatbot-upload-dialog-placeholder">
                  <svg class="chatbot-upload-dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <p class="chatbot-upload-dialog-text">Click to upload</p>
                  <p class="chatbot-upload-dialog-subtext">or drag and drop</p>
                </div>
              `}
            </div>
            <p class="chatbot-upload-dialog-caption">
              Full-length photo for dresses, pants & full outfits. Stand naturally with good lighting.
            </p>
          </div>
          <div class="chatbot-upload-dialog-section">
            <label class="chatbot-upload-dialog-label">Portrait Photo</label>
            <div class="chatbot-upload-dialog-dropzone" id="half-body-dropzone">
              <input type="file" accept="image/*" class="chatbot-upload-dialog-input" id="half-body-input">
              ${(state.halfBodyPreview || state.halfBodyUrl) ? `
                <div class="chatbot-upload-dialog-preview">
                  <img src="${state.halfBodyPreview || state.halfBodyUrl}" alt="Half body photo">
                  <button class="chatbot-upload-dialog-remove" id="remove-half-body">×</button>
                </div>
              ` : `
                <div class="chatbot-upload-dialog-placeholder">
                  <svg class="chatbot-upload-dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <p class="chatbot-upload-dialog-text">Click to upload</p>
                  <p class="chatbot-upload-dialog-subtext">or drag and drop</p>
                </div>
              `}
            </div>
            <p class="chatbot-upload-dialog-caption">
              Waist-up photo for tops, accessories & jewelry. Face clearly visible works best.
            </p>
          </div>
        </div>
        ${state.uploadError ? `
          <div class="chatbot-upload-dialog-error">
            <p class="chatbot-upload-dialog-error-text">${escapeHtml(state.uploadError)}</p>
          </div>
        ` : ''}
        <div class="chatbot-upload-dialog-privacy">
          <div class="chatbot-upload-dialog-privacy-content">
            <svg class="chatbot-upload-dialog-privacy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <p class="chatbot-upload-dialog-privacy-text">
              Your privacy matters. Photos are encrypted, never shared, and only visible to you. We never use your images for AI training or any other purpose.
            </p>
          </div>
        </div>
        <div class="chatbot-upload-dialog-actions">
          <button class="chatbot-upload-dialog-cancel" id="cancel-upload-dialog">Cancel</button>
          <button class="chatbot-upload-dialog-save" id="save-upload-dialog" ${(!state.fullBodyPhoto && !state.halfBodyPhoto && !state.fullBodyUrl && !state.halfBodyUrl) || state.isGenerating ? 'disabled' : ''}>Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Setup event handlers
    setupUploadDialogHandlers();
  }

  function setupUploadDialogHandlers() {
    const closeBtn = document.getElementById('close-upload-dialog');
    const cancelBtn = document.getElementById('cancel-upload-dialog');
    const saveBtn = document.getElementById('save-upload-dialog');
    const fullBodyInput = document.getElementById('full-body-input');
    const halfBodyInput = document.getElementById('half-body-input');
    const fullBodyDropzone = document.getElementById('full-body-dropzone');
    const halfBodyDropzone = document.getElementById('half-body-dropzone');
    const removeFullBody = document.getElementById('remove-full-body');
    const removeHalfBody = document.getElementById('remove-half-body');

    if (closeBtn) closeBtn.onclick = closeUploadDialog;
    if (cancelBtn) cancelBtn.onclick = closeUploadDialog;

    if (fullBodyInput) {
      fullBodyInput.onchange = (e) => handleImageSelect(e.target.files[0], 'fullBody');
      // Stop propagation on file input to prevent dropzone click handler from firing
      fullBodyInput.onclick = (e) => {
        e.stopPropagation();
      };
      if (fullBodyDropzone) {
        fullBodyDropzone.onclick = (e) => {
          // Don't trigger if clicking on remove button (it has its own handler)
          if (e.target.closest('#remove-full-body')) {
            return;
          }
          // Don't trigger if clicking directly on the file input (native behavior handles it)
          // This prevents double-triggering when user clicks directly on the input
          if (e.target === fullBodyInput || fullBodyInput.contains(e.target)) {
            return;
          }
          // Trigger file picker for any other click in the dropzone (placeholder or preview area)
          e.stopPropagation();
          fullBodyInput.click();
        };
      }
    }

    if (halfBodyInput) {
      halfBodyInput.onchange = (e) => handleImageSelect(e.target.files[0], 'halfBody');
      // Stop propagation on file input to prevent dropzone click handler from firing
      halfBodyInput.onclick = (e) => {
        e.stopPropagation();
      };
      if (halfBodyDropzone) {
        halfBodyDropzone.onclick = (e) => {
          // Don't trigger if clicking on remove button (it has its own handler)
          if (e.target.closest('#remove-half-body')) {
            return;
          }
          // Don't trigger if clicking directly on the file input (native behavior handles it)
          // This prevents double-triggering when user clicks directly on the input
          if (e.target === halfBodyInput || halfBodyInput.contains(e.target)) {
            return;
          }
          // Trigger file picker for any other click in the dropzone (placeholder or preview area)
          e.stopPropagation();
          halfBodyInput.click();
        };
      }
    }

    if (removeFullBody) {
      removeFullBody.onclick = (e) => {
        e.stopPropagation();
        handleRemoveImage('fullBody');
      };
    }

    if (removeHalfBody) {
      removeHalfBody.onclick = (e) => {
        e.stopPropagation();
        handleRemoveImage('halfBody');
      };
    }

    if (saveBtn) {
      // Update button disabled state based on current state
      if (!state.fullBodyPhoto && !state.halfBodyPhoto && !state.fullBodyUrl && !state.halfBodyUrl) {
        saveBtn.disabled = true;
      } else {
        saveBtn.disabled = false;
      }
      
      saveBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Allow save if there are new photos OR if images are already saved (to allow re-upload)
        if (!state.fullBodyPhoto && !state.halfBodyPhoto && !state.fullBodyUrl && !state.halfBodyUrl) {
          state.uploadError = 'Please upload at least one photo';
          renderUploadDialog();
          return;
        }
        
        // Prevent double-clicks
        if (saveBtn.disabled || state.isGenerating) {
          return;
        }
        
        await handleSaveUpload();
      };
    }
  }

  function handleImageSelect(file, type) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'fullBody') {
        state.fullBodyPhoto = file;
        state.fullBodyPreview = e.target.result;
      } else {
        state.halfBodyPhoto = file;
        state.halfBodyPreview = e.target.result;
      }
      renderUploadDialog();
      
      // Ensure save button is enabled after image selection
      setTimeout(() => {
        const saveBtn = document.getElementById('save-upload-dialog');
        if (saveBtn && (state.fullBodyPhoto || state.halfBodyPhoto || state.fullBodyUrl || state.halfBodyUrl)) {
          saveBtn.disabled = false;
        }
      }, 0);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage(type) {
    if (type === 'fullBody') {
      state.fullBodyPhoto = null;
      state.fullBodyPreview = null;
      state.fullBodyUrl = null; // Clear saved URL as well
    } else {
      state.halfBodyPhoto = null;
      state.halfBodyPreview = null;
      state.halfBodyUrl = null; // Clear saved URL as well
    }
    renderUploadDialog();
  }

  async function handleSaveUpload() {
    state.isGenerating = true;
    state.uploadError = null;
    updateUploadButton();
    renderUploadDialog();

    try {
      const formData = new FormData();
      if (state.fullBodyPhoto) {
        formData.append('fullBodyPhoto', state.fullBodyPhoto);
      }
      if (state.halfBodyPhoto) {
        formData.append('halfBodyPhoto', state.halfBodyPhoto);
      }

      const backendUrl = config.backendUrl.replace(/\/$/, '') + '/api/upload-user-images';
      
      // Get Shopify customer ID - required for authenticated users
      const shopifyCustomerId = getShopifyCustomerId();
      
      if (!shopifyCustomerId) {
        throw new Error('You must be signed in to upload photos. Please sign in to your Shopify account first.');
      }

      const headers = {};
      headers['x-shopify-customer-id'] = shopifyCustomerId;
      
      console.log('📤 Uploading images to:', backendUrl);
      console.log('📤 FormData:', {
        hasFullBody: !!state.fullBodyPhoto,
        hasHalfBody: !!state.halfBodyPhoto,
        shopifyCustomerId: shopifyCustomerId
      });

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: headers,
        body: formData,
        credentials: 'include',
        // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        // Setting it manually will break the request
      });

      console.log('📥 Upload response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to save your images';
        try {
          const errorData = await response.json();
          console.error('❌ Upload error:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);

      // Get userId from upload response to use for fetching images
      const uploadedUserId = result.userId;

      // Clear local previews (temporary upload state)
      state.fullBodyPhoto = null;
      state.halfBodyPhoto = null;
      state.fullBodyPreview = null;
      state.halfBodyPreview = null;

      // First, update state from upload response (immediate update)
      // This ensures state is updated even if fetch fails
      if (result.images && result.images.length > 0) {
        result.images.forEach(img => {
          if (img.type === 'fullBody') {
            state.fullBodyUrl = img.url;
            state.fullBodyPreview = img.url;
            console.log('✅ Stored full body image URL from upload response:', img.url);
          } else if (img.type === 'halfBody') {
            state.halfBodyUrl = img.url;
            state.halfBodyPreview = img.url;
            console.log('✅ Stored half body image URL from upload response:', img.url);
          }
        });
      }

      // Then try to fetch from server to ensure we have the latest data
      // This is a best-effort update, but state is already set from upload response
      try {
        const userImages = await fetchUserImages(uploadedUserId);
        if (userImages.fullBodyUrl) {
          state.fullBodyUrl = userImages.fullBodyUrl;
          state.fullBodyPreview = userImages.fullBodyUrl;
          console.log('✅ Updated full body image URL from server:', userImages.fullBodyUrl);
        }
        if (userImages.halfBodyUrl) {
          state.halfBodyUrl = userImages.halfBodyUrl;
          state.halfBodyPreview = userImages.halfBodyUrl;
          console.log('✅ Updated half body image URL from server:', userImages.halfBodyUrl);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch uploaded images after save (using upload response URLs):', error);
        // State is already updated from upload response, so this is fine
      }
      
      // Update the upload dialog to show the uploaded images
      if (state.isUploadDialogOpen) {
        renderUploadDialog();
      }
      
      console.log('✅ State updated with images:', {
        hasFullBody: !!state.fullBodyUrl,
        hasHalfBody: !!state.halfBodyUrl,
        fullBodyUrl: state.fullBodyUrl,
        halfBodyUrl: state.halfBodyUrl
      });

      closeUploadDialog();

      // Show success message with confirmation that images are saved
      state.messages.push({
        role: 'assistant',
        content: 'Great! Your photos have been saved successfully. You can now try on any product by clicking the "Try on this product" button. Your photos are securely stored and ready to use.'
      });
      renderMessages();
      
      console.log('✅ Upload complete - images are now available for try-on');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Better error messages for different error types
      let errorMessage = 'Failed to save your images';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error (CORS, connection refused, etc.)
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        console.error('🌐 Network error detected - possible CORS or connection issue');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      state.uploadError = errorMessage;
      renderUploadDialog();
      
      // Show error in chat as well
      state.messages.push({
        role: 'assistant',
        content: `Sorry, I couldn't save your photos. ${errorMessage} Please try again.`
      });
      renderMessages();
    } finally {
      state.isGenerating = false;
      updateUploadButton();
    }
  }

  function closeUploadDialog() {
    state.isUploadDialogOpen = false;
    const dialog = document.getElementById('chatbot-upload-dialog');
    if (dialog) dialog.remove();
  }

  function updateUploadButton() {
    const uploadBtn = document.getElementById('chatbot-upload-btn');
    const uploadIcon = document.getElementById('chatbot-upload-icon');
    const uploadSpinner = document.getElementById('chatbot-upload-spinner');

    if (uploadBtn) {
      uploadBtn.disabled = state.isGenerating;
      if (state.isGenerating) {
        uploadBtn.classList.add('generating');
        if (uploadIcon) uploadIcon.style.display = 'none';
        if (uploadSpinner) uploadSpinner.style.display = 'block';
      } else {
        uploadBtn.classList.remove('generating');
        if (uploadIcon) uploadIcon.style.display = 'block';
        if (uploadSpinner) uploadSpinner.style.display = 'none';
      }
    }
  }

  function showUploadError() {
    const errorDiv = document.getElementById('chatbot-upload-error');
    const errorMessage = document.querySelector('.chatbot-error-message');
    if (errorDiv && errorMessage) {
      errorDiv.style.display = 'block';
      errorMessage.textContent = state.uploadError || 'An error occurred';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  // ===== FULL-SCREEN IMAGE VIEWER =====

  function setFullScreenImage(url) {
    state.fullScreenImage = url;
    renderFullScreenViewer();
  }

  function renderFullScreenViewer() {
    if (!state.fullScreenImage) {
      const viewer = document.getElementById('chatbot-fullscreen-viewer');
      if (viewer) viewer.remove();
      return;
    }

    let viewer = document.getElementById('chatbot-fullscreen-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'chatbot-fullscreen-viewer';
      viewer.className = 'chatbot-fullscreen-viewer';
      viewer.onclick = () => {
        state.fullScreenImage = null;
        renderFullScreenViewer();
      };
      document.body.appendChild(viewer);
    }

    viewer.innerHTML = `
      <div class="chatbot-fullscreen-container" onclick="event.stopPropagation()">
        <button class="chatbot-fullscreen-close" id="close-fullscreen">×</button>
        <img class="chatbot-fullscreen-image" src="${state.fullScreenImage}" alt="Full screen view" onclick="event.stopPropagation()">
      </div>
    `;

    const closeBtn = document.getElementById('close-fullscreen');
    if (closeBtn) {
      closeBtn.onclick = () => {
        state.fullScreenImage = null;
        renderFullScreenViewer();
      };
    }
  }

  function handleDownloadImage(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'try-on-result.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ===== UTILITIES =====

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function playClickFeedback() {
    // Sound feedback (exact copy of original)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a soft "tick" sound
      oscillator.frequency.value = 800; // Soft, pleasant tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Very quiet
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05); // Fade out quickly
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {
      // Audio not supported
    }

    // Haptic feedback (vibration)
    try {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (e) {
      // Vibration not supported
    }
  }

  // Get cookie value by name
  function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  // Get product info from page (if available)
  function detectProductFromPage() {
    const isProductPage = window.location.pathname.includes('/products/') || 
                          window.location.pathname.match(/\/products\/[^\/]+/);
    
    if (!isProductPage) {
      // Not on product page - disable try-on
      state.currentProduct = null;
      const tryOnBtn = document.getElementById('chatbot-try-on-btn');
      if (tryOnBtn) {
        tryOnBtn.disabled = true;
      }
      const productInfo = document.getElementById('chatbot-product-info');
      if (productInfo) {
        productInfo.style.display = 'none';
      }
      return;
    }

    // Try multiple methods to get product info from Shopify
    let product = null;
    let productImages = [];

    // Method 1: ShopifyAnalytics (MOST RELIABLE - always present on product pages)
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
      const analyticsProduct = window.ShopifyAnalytics.meta.product;
      if (analyticsProduct.id || analyticsProduct.gid) {
        product = {};
        // Prefer numeric ID, fallback to GID, extract numeric from GID if needed
        product.id = analyticsProduct.id || 
                    (analyticsProduct.gid ? analyticsProduct.gid.split('/').pop() : '');
        product.gid = analyticsProduct.gid; // Store Global ID for GraphQL queries
        product.title = analyticsProduct.name || '';
        product.type = analyticsProduct.type || '';
        product.vendor = analyticsProduct.vendor || '';
        console.log('✅ Product ID from ShopifyAnalytics:', product.id, product.gid);
      }
    }
    
    // Method 2: window.Shopify.product (standard Shopify theme) - use for images and additional data
    if (window.Shopify && window.Shopify.product) {
      const shopifyProduct = window.Shopify.product;
      
      // Merge with ShopifyAnalytics data if available
      if (!product) {
        product = {};
      }
      
      // Use Shopify.product for images (usually more reliable)
      if (shopifyProduct.images && Array.isArray(shopifyProduct.images)) {
        productImages = shopifyProduct.images;
      } else if (shopifyProduct.featured_image) {
        productImages = [shopifyProduct.featured_image];
      }
      
      // Fill in missing data from Shopify.product
      if (!product.id && shopifyProduct.id) {
        product.id = shopifyProduct.id.toString();
      }
      if (!product.title && shopifyProduct.title) {
        product.title = shopifyProduct.title;
      }
      if (!product.type && shopifyProduct.type) {
        product.type = shopifyProduct.type;
      }
    }
    
    // Method 3: Try window.meta.product (some themes use this)
    if ((!product || !product.id) && window.meta && window.meta.product) {
      product = product || {};
      product.id = product.id || window.meta.product.id;
      product.title = product.title || window.meta.product.title;
    }
    
    // Method 2: JSON-LD structured data
    if (!product) {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd.textContent);
          if (data['@type'] === 'Product' || (Array.isArray(data) && data.find(item => item['@type'] === 'Product'))) {
            const productData = Array.isArray(data) ? data.find(item => item['@type'] === 'Product') : data;
            product = {
              id: productData.productID || productData.sku || '',
              title: productData.name || '',
              type: productData.category || '',
              price: productData.offers?.price || 0,
              description: productData.description || ''
            };
            
            if (productData.image) {
              productImages = Array.isArray(productData.image) 
                ? productData.image 
                : [productData.image];
            }
          }
        } catch (e) {
          console.debug('Could not parse JSON-LD:', e);
        }
      }
    }

    // Method 3: Meta tags
    if (!product) {
      const productIdMeta = document.querySelector('meta[property="product:retailer_item_id"]');
      const productTitleMeta = document.querySelector('meta[property="og:title"]');
      
      if (productIdMeta || productTitleMeta) {
        product = {
          id: productIdMeta?.content || '',
          title: productTitleMeta?.content || '',
          type: '',
          price: 0,
          description: ''
        };
        
        // Get image from og:image
        const productImageMeta = document.querySelector('meta[property="og:image"]');
        if (productImageMeta) {
          productImages = [productImageMeta.content];
        }
      }
    }

    // Method 4: Try to extract from DOM
    let productIdEl = null; // Declare outside conditional block
    if (!product) {
      const productTitle = document.querySelector('h1.product-title, h1.product__title, [data-product-title]');
      productIdEl = document.querySelector('[data-product-id]');
      
      if (productTitle) {
        product = {
          id: productIdEl?.dataset?.productId || '',
          title: productTitle.textContent.trim(),
          type: '',
          price: 0,
          description: ''
        };
        
        // Try to get images from product gallery
        const productImagesEl = document.querySelectorAll('.product-image img, .product__media img, [data-product-image]');
        if (productImagesEl.length > 0) {
          productImages = Array.from(productImagesEl).map(img => img.src);
        }
      }
    }

    if (product) {
      // Extract variant info if available
      const variant = window.Shopify?.product?.selected_or_first_available_variant || 
                     window.Shopify?.product?.variants?.[0];
      
      const variantPrice = variant?.price ? parseFloat(variant.price) / 100 : 
                           product.price ? (typeof product.price === 'string' ? parseFloat(product.price.replace(/[^0-9.]/g, '')) : product.price) : 0;

      state.currentProduct = {
        id: product.id?.toString() || productIdEl?.dataset?.productId || '',
        name: product.title || product.name || '',
        category: product.type || product.vendor || '',
        type: product.type || '',
        color: variant?.option1 || '',
        price: variantPrice,
        description: product.description || '',
        sizes: variant?.option2 ? [variant.option2] : [],
        url: window.location.href,
        images: productImages,
        imageUrl: productImages.length > 0 ? productImages[0] : null
      };

      const tryOnBtn = document.getElementById('chatbot-try-on-btn');
      if (tryOnBtn) {
        tryOnBtn.disabled = false;
      }

      // Update product info in header
      const productInfo = document.getElementById('chatbot-product-info');
      const productName = document.querySelector('.chatbot-product-name');
      if (productInfo && productName) {
        productInfo.style.display = 'block';
        productName.textContent = state.currentProduct.name;
      }

      console.log('✅ Product detected:', state.currentProduct);
      console.log('✅ Product images:', productImages);
    } else {
      state.currentProduct = null;
      const tryOnBtn = document.getElementById('chatbot-try-on-btn');
      if (tryOnBtn) {
        tryOnBtn.disabled = true;
      }
    }
  }

  // Fetch product catalog from Shopify AJAX API (public endpoint)
  async function fetchProductCatalog() {
    // PRODUCTION FIX: Backend handles all product fetching via Storefront API
    // Widget only needs to send shop domain, backend will fetch products using session
    // 
    // This fixes multiple critical issues:
    // 1. /products.json may be restricted by theme/app settings
    // 2. Limited to 250 products (no pagination)
    // 3. Redundant - backend already fetches via Shopify Storefront API
    // 4. Increases widget load time and failure rate
    // 5. Creates double work and network overhead
    //
    // Backend implementation (app/api/chat/route.ts lines 269-346) handles:
    // - Session lookup by shop domain (including custom domains)
    // - Storefront API token retrieval from session
    // - Product fetching via ShopifyProductAdapter
    // - Proper error handling and fallbacks
    
    console.log('🔧 [Closelook Widget] Product fetching delegated to backend (Storefront API)');
    
    try {
      // Get shop domain for logging
      let shopDomain = window.Shopify?.shop || 
                      document.querySelector('meta[name="shopify-shop"]')?.getAttribute('content');
      
      if (!shopDomain) {
        const hostname = window.location.hostname;
        const shopMatch = hostname.match(/([^.]+)\.myshopify\.com/);
        if (shopMatch) {
          shopDomain = `${shopMatch[1]}.myshopify.com`;
        }
      }

      if (shopDomain) {
        console.log(`🔧 [Closelook Widget] Shop domain: ${shopDomain} - Backend will fetch products`);
      }
    } catch (error) {
      console.debug('[Closelook Widget] Could not determine shop domain:', error);
    }

    // Return empty array - backend handles all product retrieval
    // Widget only sends shop domain in chat API payload
    return [];
    
    // OLD CODE REMOVED - Do not uncomment unless backend product fetching fails
    // The following code tried to fetch products client-side but had multiple issues:
    /*
    try {
      if (shopDomain) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(`https://${shopDomain}/collections/all/products.json?limit=250`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Fetched ${data.products?.length || 0} products from catalog`);
            return data.products || [];
          } else {
            console.warn(`⚠️ Product catalog fetch failed: ${response.status}`);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.warn('⚠️ Product catalog fetch timed out');
          } else {
            throw error;
          }
        }

      } else {
        console.warn('⚠️ Could not determine shop domain for product catalog');
      }

      // Return empty array if fetch fails - backend will handle it gracefully
      return [];
    } catch (error) {
      console.debug('Could not fetch product catalog:', error);
      // Return empty array - backend can still work with empty catalog or fetch server-side
      return [];
    }
    */
  }

  // Order history is fetched by backend via Shopify Admin API when needed
  // Client-side cannot access order history (requires authentication)
  async function fetchOrderHistory() {
    // Order history must be fetched server-side via Shopify Admin API
    // Backend will fetch when queryType.isOrder or queryType.isAccount is detected
    return [];
  }

  // Initialize on load
  init();

  // Detect product when page changes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      detectProductFromPage();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Also detect on load
  setTimeout(detectProductFromPage, 500);
})();
