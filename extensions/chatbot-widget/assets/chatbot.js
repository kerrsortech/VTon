/**
 * Shopify Chatbot Widget
 * Main chatbot UI and API communication
 */

class ShopifyChatbot {
  constructor(config) {
    this.backendUrl = config.backendUrl;
    this.shopDomain = config.shopDomain || window.Shopify?.shop;
    
    // Initialize context manager
    this.contextManager = new ShopifyContextManager({
      backendUrl: this.backendUrl,
      shopDomain: this.shopDomain
    });
    
    this.sessionId = this.contextManager.sessionId;
    this.conversationHistory = [];
    this.isOpen = false;
    this.isLoading = false;
    
    console.log('[Chatbot] Initialized with backend:', this.backendUrl);
    
    this.init();
  }
  
  /**
   * Initialize chatbot
   */
  init() {
    this.renderWidget();
    this.attachEventListeners();
    this.loadConversationHistory();
  }
  
  /**
   * Render chatbot UI
   */
  renderWidget() {
    // Check if already rendered
    if (document.getElementById('shopify-chatbot-widget')) {
      return;
    }
    
    const widgetHTML = `
      <div id="shopify-chatbot-widget" class="chatbot-widget">
        <!-- Chat Button -->
        <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        
        <!-- Chat Window -->
        <div id="chatbot-window" class="chatbot-window" style="display: none;">
          <!-- Header -->
          <div class="chatbot-header">
            <h3>Shop Assistant</h3>
            <button id="chatbot-close" class="chatbot-close" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Messages -->
          <div id="chatbot-messages" class="chatbot-messages">
            <div class="chatbot-message assistant">
              <div class="message-content">
                👋 Hi! I'm here to help you shop. Ask me anything about products, orders, or recommendations!
              </div>
            </div>
          </div>
          
          <!-- Input -->
          <div class="chatbot-input-container">
            <textarea 
              id="chatbot-input" 
              class="chatbot-input" 
              placeholder="Ask about this product..."
              rows="1"
            ></textarea>
            <button id="chatbot-send" class="chatbot-send">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');
    
    // Toggle chat window
    toggleBtn?.addEventListener('click', () => this.toggleChat());
    closeBtn?.addEventListener('click', () => this.toggleChat());
    
    // Send message
    sendBtn?.addEventListener('click', () => this.handleSendMessage());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
    
    // Auto-resize textarea
    input?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    });
  }
  
  /**
   * Toggle chat window
   */
  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');
    
    if (this.isOpen) {
      window.style.display = 'flex';
      toggle.style.display = 'none';
      document.getElementById('chatbot-input')?.focus();
    } else {
      window.style.display = 'none';
      toggle.style.display = 'flex';
    }
  }
  
  /**
   * Handle send message
   */
  async handleSendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input?.value?.trim();
    
    if (!message || this.isLoading) return;
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Display user message
    this.displayMessage(message, 'user');
    
    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    // Send to backend
    await this.sendMessage(message);
  }
  
  /**
   * CRITICAL: Send message to backend with context
   */
  async sendMessage(userMessage) {
    this.isLoading = true;
    this.showTypingIndicator();
    
    try {
      // Get fresh context
      const context = this.contextManager.getContext();
      
      console.log('[Chatbot] Sending message with context:', {
        message: userMessage,
        context: context
      });
      
      // Call your backend API
      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          message: userMessage,
          context: context,
          conversation_history: this.conversationHistory.slice(-10), // Last 10 messages
          shop_domain: this.shopDomain,
          shop: this.shopDomain, // Also send as 'shop' for compatibility
          pageContext: context.page_type || 'other',
          currentProduct: context.current_product ? {
            id: context.current_product.id || context.current_product.gid,
            handle: context.current_product.handle
          } : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('[Chatbot] Response:', data);
      
      // Add assistant response to history
      const responseText = data.message || data.response || 'Sorry, I could not process that request.';
      this.conversationHistory.push({
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      });
      
      // Display response
      this.removeTypingIndicator();
      this.displayMessage(responseText, 'assistant');
      
      // Save conversation history
      this.saveConversationHistory();
      
    } catch (error) {
      console.error('[Chatbot] Error:', error);
      this.removeTypingIndicator();
      this.displayMessage(
        '❌ Sorry, something went wrong. Please try again.',
        'assistant',
        true
      );
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Display message in UI
   */
  displayMessage(content, role, isError = false) {
    const messagesContainer = document.getElementById('chatbot-messages');
    
    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message ${role}`;
    if (isError) messageEl.classList.add('error');
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(contentEl);
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    
    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator';
    typingEl.className = 'chatbot-message assistant';
    typingEl.innerHTML = `
      <div class="message-content typing">
        <span></span><span></span><span></span>
      </div>
    `;
    
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Remove typing indicator
   */
  removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  }
  
  /**
   * Save conversation history to sessionStorage
   */
  saveConversationHistory() {
    try {
      sessionStorage.setItem(
        'chatbot_history',
        JSON.stringify(this.conversationHistory)
      );
    } catch (e) {
      console.warn('[Chatbot] Failed to save history:', e);
    }
  }
  
  /**
   * Load conversation history from sessionStorage
   */
  loadConversationHistory() {
    try {
      const saved = sessionStorage.getItem('chatbot_history');
      if (saved) {
        this.conversationHistory = JSON.parse(saved);
        
        // Display saved messages
        this.conversationHistory.forEach(msg => {
          if (msg.role !== 'system') {
            this.displayMessage(msg.content, msg.role);
          }
        });
      }
    } catch (e) {
      console.warn('[Chatbot] Failed to load history:', e);
    }
  }
}

// Initialize chatbot when DOM is ready
function initShopifyChatbot() {
  // Get backend URL from meta tag or data attribute
  const backendUrl = document.querySelector('meta[name="chatbot-backend"]')?.content 
    || window.chatbotConfig?.backendUrl
    || 'https://your-backend.vercel.app'; // Replace with your actual backend URL
  
  const shopDomain = window.Shopify?.shop 
    || window.chatbotConfig?.shopDomain
    || window.location.hostname;
  
  console.log('[Chatbot] Initializing with backend:', backendUrl);
  
  window.shopifyChatbot = new ShopifyChatbot({
    backendUrl: backendUrl,
    shopDomain: shopDomain
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShopifyChatbot);
} else {
  initShopifyChatbot();
}

