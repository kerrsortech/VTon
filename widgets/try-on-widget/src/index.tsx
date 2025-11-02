/**
 * Standalone Try-On Widget
 * Uses the same React component as the demo website (closelook-widget)
 */

import React from "react"
import { createRoot } from "react-dom/client"
import { CloselookWidget } from "../../../components/closelook-widget"
import { CloselookProvider } from "../../../components/closelook-provider"
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
    console.warn("Closelook widget already initialized")
    return
  }

  widgetInitialized = true

  const { container, product, shopDomain, apiUrl } = config

  // Map Shopify product to Closelook format
  const closelookProduct: Product = mapToCloselookProduct(product, shopDomain)

  // Override fetch to use the provided API URL
  const originalFetch = window.fetch
  
  // Override /api/try-on calls to use the provided API URL
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
    <CloselookProvider>
      <CloselookWidget
        product={closelookProduct}
        onTryOnComplete={(result) => {
          console.log("Try-on complete:", result)
          // Optionally dispatch a custom event
          window.dispatchEvent(
            new CustomEvent("closelook:try-on-complete", {
              detail: { productId: closelookProduct.id, result },
            })
          )
        }}
        className="closelook-widget-shopify"
      />
    </CloselookProvider>
  )

  // Clean up function (if needed)
  return () => {
    root.unmount()
    window.fetch = originalFetch
  }
}

// Expose globally for App Block integration
if (typeof window !== "undefined") {
  ;(window as any).CloselookTryOnWidget = { init }
}
