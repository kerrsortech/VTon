# ⚡ ALTERNATIVE QUICK FIX - No Deploy Needed!

If you can't deploy right now, here's a temporary inline fix:

## 🔧 Add This to Your Liquid File

Add this script AFTER the button HTML in `closelook-widgets.liquid`:

```liquid
<!-- TEMPORARY FIX - Remove after proper deployment -->
<script>
(function() {
  'use strict';
  
  console.log('🚨 TEMPORARY FIX LOADED');
  
  // Wait for DOM to be ready
  function initFix() {
    const openBtn = document.getElementById('chatbot-open-btn');
    const panel = document.getElementById('chatbot-panel');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const input = document.getElementById('chatbot-input');
    const closeBtn = document.getElementById('chatbot-close-btn');
    
    if (!openBtn || !panel) {
      console.error('❌ Elements not found, retrying...');
      setTimeout(initFix, 100);
      return;
    }
    
    console.log('✅ Elements found, attaching handlers');
    
    // State
    let isOpen = false;
    let hasClicked = false;
    
    // Open button
    openBtn.onclick = function() {
      console.log('Button clicked!');
      isOpen = true;
      hasClicked = true;
      panel.classList.add('open');
      panel.style.display = 'flex';
      document.getElementById('chatbot-first-click').style.display = 'none';
      document.getElementById('chatbot-toggle-btn').style.display = 'flex';
      
      // Initialize messages
      const messagesDiv = document.getElementById('chatbot-messages');
      if (messagesDiv && messagesDiv.children.length === 0) {
        messagesDiv.innerHTML = `
          <div class="chatbot-message-wrapper assistant">
            <div class="chatbot-message assistant">
              <p>How may I help you?</p>
            </div>
          </div>
        `;
      }
    };
    
    // Close button
    if (closeBtn) {
      closeBtn.onclick = function() {
        isOpen = false;
        panel.classList.remove('open');
      };
    }
    
    // Send button
    if (sendBtn && input) {
      sendBtn.onclick = async function() {
        const message = input.value.trim();
        if (!message) return;
        
        console.log('Sending:', message);
        
        // Add user message
        const messagesDiv = document.getElementById('chatbot-messages');
        messagesDiv.innerHTML += `
          <div class="chatbot-message-wrapper user">
            <div class="chatbot-message user">
              <p>${message}</p>
            </div>
          </div>
        `;
        
        input.value = '';
        sendBtn.disabled = true;
        
        // Show loading
        messagesDiv.innerHTML += `
          <div class="chatbot-message-wrapper assistant">
            <div class="chatbot-message assistant">
              <div class="chatbot-loading">
                <div class="chatbot-loading-dot"></div>
                <div class="chatbot-loading-dot"></div>
                <div class="chatbot-loading-dot"></div>
              </div>
            </div>
          </div>
        `;
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Send to backend
        try {
          const backendUrl = window.closelookBackendUrl || 'https://vton-1-hqmc.onrender.com';
          const shopDomain = window.Shopify?.shop || window.location.hostname;
          
          const response = await fetch(`${backendUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message,
              shop: shopDomain,
              conversationHistory: [],
              pageContext: 'home'
            })
          });
          
          if (!response.ok) throw new Error('Failed to get response');
          
          const data = await response.json();
          
          // Remove loading
          messagesDiv.lastElementChild.remove();
          
          // Add bot response
          messagesDiv.innerHTML += `
            <div class="chatbot-message-wrapper assistant">
              <div class="chatbot-message assistant">
                <p>${data.message || 'I received your message!'}</p>
              </div>
            </div>
          `;
          
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          
        } catch (error) {
          console.error('Chat error:', error);
          messagesDiv.lastElementChild.remove();
          messagesDiv.innerHTML += `
            <div class="chatbot-message-wrapper assistant">
              <div class="chatbot-message assistant">
                <p>Sorry, I encountered an error. Please try again.</p>
              </div>
            </div>
          `;
        } finally {
          sendBtn.disabled = false;
        }
      };
      
      // Enter key
      input.onkeypress = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendBtn.click();
        }
      };
      
      // Enable/disable send button
      input.oninput = function() {
        sendBtn.disabled = !input.value.trim();
      };
    }
    
    console.log('✅ TEMPORARY FIX ACTIVE - All handlers attached');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFix);
  } else {
    initFix();
  }
})();
</script>
```

## 📍 Where to Add It

In `extensions/closelook-widgets-extension/blocks/closelook-widgets.liquid`, add it right before the closing `{% endif %}` tag (around line 130).

## 🚀 Then Deploy Just This File

```bash
shopify app deploy
```

This will:
- ✅ Make chatbot open immediately
- ✅ Make send button work
- ✅ Enable basic chat functionality
- ✅ Work until proper fix is deployed

## 🗑️ Remove After Main Fix

Once the main JavaScript loads without `async`, remove this temporary script.

---

**This is a band-aid solution - use only if you need chatbot working RIGHT NOW while waiting for proper deployment!**

