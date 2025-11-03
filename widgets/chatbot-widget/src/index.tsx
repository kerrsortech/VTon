/**
 * Standalone Chatbot Widget
 * Uses the same React component as the demo website (global-chatbot)
 */

import React from "react"
import { createRoot } from "react-dom/client"
import { GlobalChatbot } from "../../../components/global-chatbot"
import type { Product } from "../../../lib/closelook-types"
import "./styles.css"

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

  // Widget only tracks minimal data - product ID/handle and shop domain
  // All product mapping and fetching happens in the backend (Render server)
  // This keeps the widget lightweight (UI + basic tracking only)
  const closelookProduct: Product | undefined = product
    ? {
        id: product.id || product.handle || "",
        name: product.title || product.name || "",
        // Backend will fetch full product details from Shopify
        // Widget only sends ID and name for context
        // Provide minimal required fields to satisfy Product type
        category: "",
        type: "",
        color: "",
        price: 0,
        images: [],
        description: "",
      }
    : undefined

  // Override fetch to use the provided API URL
  const originalFetch = window.fetch
  
  // Override /api/* calls to use the provided API URL
  window.fetch = ((...args) => {
    const firstArg = args[0]
    let url: string
    if (typeof firstArg === "string") {
      url = firstArg
    } else if (firstArg instanceof Request) {
      url = firstArg.url
    } else if (firstArg instanceof URL) {
      url = firstArg.toString()
    } else {
      // Fallback for other types
      return originalFetch(...args)
    }
    
    if (url && url.startsWith("/api/")) {
      const newUrl = apiUrl + url.replace("/api", "")
      return originalFetch(newUrl, args[1])
    }
    return originalFetch(...args)
  }) as typeof fetch

  // Create React root and render widget
  const root = createRoot(container)
  
  root.render(
    <GlobalChatbot
      currentProduct={closelookProduct}
      className="closelook-chatbot-shopify"
    />
  )

  // Clean up function (if needed)
  return () => {
    root.unmount()
    window.fetch = originalFetch
  }
}

// Expose globally for App Block integration
if (typeof window !== "undefined") {
  ;(window as any).CloselookChatbotWidget = { init }
}
