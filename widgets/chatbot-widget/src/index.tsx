/**
 * Standalone Chatbot Widget
 * Self-contained chatbot bundle for Shopify storefronts
 */

import { getShopifyProduct, mapToCloselookProduct } from "./shopify-integration"
import { sendChatMessage } from "./api-client"

interface WidgetConfig {
  container: HTMLElement
  product: any
  shopDomain: string
  apiUrl: string
}

let widgetInitialized = false

/**
 * Initialize widget
 */
export function init(config: WidgetConfig) {
  if (widgetInitialized) {
    console.warn("Closelook chatbot already initialized")
    return
  }

  widgetInitialized = true

  const { container, product, shopDomain, apiUrl } = config

  // Map Shopify product to Closelook format
  const closelookProduct = product ? mapToCloselookProduct(product, shopDomain) : null

  // Create chatbot UI
  createChatbotUI(container, closelookProduct, shopDomain, apiUrl)
}

function createChatbotUI(
  container: HTMLElement,
  product: any,
  shopDomain: string,
  apiUrl: string
) {
  // Create button
  const button = document.createElement("button")
  button.className = "closelook-chatbot-button"
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `

  let isOpen = false
  let messages: Array<{ role: string; content: string; recommendations?: any[] }> = []

  // Initialize with greeting
  if (product) {
    messages.push({
      role: "assistant",
      content: `Hi! I'm your Closelook assistant. I can see you're looking at ${product.name}. How can I help you today?`,
    })
  } else {
    messages.push({
      role: "assistant",
      content: "Hi! I'm your Closelook shopping assistant. I can help you find products, answer questions, and provide recommendations. What are you looking for today?",
    })
  }

  // Add styles
  const style = document.createElement("style")
  style.textContent = `
    .closelook-chatbot-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    .closelook-chatbot-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    .closelook-chatbot-window {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 500px;
      max-height: calc(100vh - 140px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 9997;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .closelook-chatbot-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .closelook-chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .closelook-message {
      max-width: 80%;
      padding: 12px;
      border-radius: 12px;
      word-wrap: break-word;
    }
    .closelook-message.user {
      align-self: flex-end;
      background: #667eea;
      color: white;
    }
    .closelook-message.assistant {
      align-self: flex-start;
      background: #f3f4f6;
      color: #111827;
    }
    .closelook-chatbot-input {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .closelook-chatbot-input input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
    }
    .closelook-chatbot-input button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    .closelook-chatbot-input button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
  document.head.appendChild(style)

  // Create chat window
  const chatWindow = document.createElement("div")
  chatWindow.className = "closelook-chatbot-window"
  chatWindow.style.display = "none"

  const header = document.createElement("div")
  header.className = "closelook-chatbot-header"
  header.innerHTML = `
    <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Closelook Assistant</h3>
  `

  const messagesContainer = document.createElement("div")
  messagesContainer.className = "closelook-chatbot-messages"

  const inputContainer = document.createElement("div")
  inputContainer.className = "closelook-chatbot-input"

  const input = document.createElement("input")
  input.type = "text"
  input.placeholder = "Ask me anything..."
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSend()
    }
  })

  const sendButton = document.createElement("button")
  sendButton.textContent = "Send"
  sendButton.addEventListener("click", handleSend)

  inputContainer.appendChild(input)
  inputContainer.appendChild(sendButton)

  chatWindow.appendChild(header)
  chatWindow.appendChild(messagesContainer)
  chatWindow.appendChild(inputContainer)

  function renderMessages() {
    messagesContainer.innerHTML = ""
    messages.forEach((msg) => {
      const messageDiv = document.createElement("div")
      messageDiv.className = `closelook-message ${msg.role}`
      messageDiv.textContent = msg.content
      messagesContainer.appendChild(messageDiv)
    })
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  async function handleSend() {
    const message = input.value.trim()
    if (!message) return

    // Add user message
    messages.push({ role: "user", content: message })
    renderMessages()
    input.value = ""
    sendButton.disabled = true
    sendButton.textContent = "..."

    try {
      const response = await sendChatMessage(apiUrl, {
        shopDomain,
        message,
        conversationHistory: messages.slice(0, -1),
        currentProduct: product,
      })

      // Add assistant response
      messages.push({
        role: "assistant",
        content: response.message,
        recommendations: response.recommendations,
      })

      renderMessages()
    } catch (error) {
      messages.push({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      })
      renderMessages()
    } finally {
      sendButton.disabled = false
      sendButton.textContent = "Send"
      input.focus()
    }
  }

  button.addEventListener("click", () => {
    isOpen = !isOpen
    chatWindow.style.display = isOpen ? "flex" : "none"
    if (isOpen) {
      renderMessages()
      input.focus()
    }
  })

  container.appendChild(button)
  document.body.appendChild(chatWindow)
}

// Expose globally for App Block integration
if (typeof window !== "undefined") {
  (window as any).CloselookChatbotWidget = { init }
}

