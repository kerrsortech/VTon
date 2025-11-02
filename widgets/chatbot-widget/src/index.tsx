/**
 * Standalone Chatbot Widget
 * Uses the same React component as the demo website (global-chatbot)
 */

import React from "react"
import { createRoot } from "react-dom/client"
import { GlobalChatbot } from "../../../components/global-chatbot"
import type { Product } from "../../../lib/closelook-types"
import { mapToCloselookProduct } from "./shopify-integration"
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

  // Map Shopify product to Closelook format (if available)
  const closelookProduct: Product | undefined = product
    ? mapToCloselookProduct(product, shopDomain)
    : undefined

  // Override fetch to use the provided API URL
  const originalFetch = window.fetch
  
  // Override /api/* calls to use the provided API URL
  window.fetch = ((...args) => {
    const url = typeof args[0] === "string" ? args[0] : args[0].url
    if (url && url.startsWith("/api/")) {
      const newUrl = apiUrl + url.replace("/api", "")
      return originalFetch(newUrl, args[1])
    }
    return originalFetch(...args)
  }) as typeof fetch

  // Create React root and render widget
  const root = createRoot(container)
  
  root.render(
    React.createElement(GlobalChatbot, {
      currentProduct: closelookProduct,
      className: "closelook-chatbot-shopify",
    })
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
