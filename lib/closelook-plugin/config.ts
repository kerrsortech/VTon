/**
 * Closelook Plugin Configuration
 * Centralized configuration management
 */

import type { CloselookConfig } from "./types"
import type { ProductAdapter } from "./adapters/base-adapter"
import { DemoProductAdapter } from "./adapters/demo-adapter"
import { ShopifyProductAdapter } from "./adapters/shopify-adapter"

class CloselookPluginConfig {
  private config: CloselookConfig
  private adapter: ProductAdapter

  constructor(config: Partial<CloselookConfig> = {}) {
    // Default configuration
    this.config = {
      platform: "demo",
      enableAnalytics: false,
      enableChatbot: true,
      enableTryOn: true,
      maxImageSize: 10 * 1024 * 1024, // 10MB
      allowedFormats: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      imageQuality: 0.9,
      apiEndpoint: "/api",
      ...config,
    }

    // Initialize the appropriate adapter based on platform
    this.adapter = this.initializeAdapter()
  }

  private initializeAdapter(): ProductAdapter {
    switch (this.config.platform) {
      case "shopify": {
        const storeDomain = this.config.platformConfig?.storeDomain as string
        const accessToken = this.config.platformConfig?.accessToken as string
        if (!storeDomain || !accessToken) {
          console.warn("Shopify configuration missing, falling back to demo adapter")
          return new DemoProductAdapter()
        }
        return new ShopifyProductAdapter(storeDomain, accessToken)
      }

      case "woocommerce":
        // TODO: Implement WooCommerce adapter
        console.warn("WooCommerce adapter not yet implemented, using demo adapter")
        return new DemoProductAdapter()

      case "custom":
        // TODO: Allow custom adapter injection
        console.warn("Custom adapter not configured, using demo adapter")
        return new DemoProductAdapter()

      case "demo":
      default:
        return new DemoProductAdapter()
    }
  }

  getConfig(): CloselookConfig {
    return { ...this.config }
  }

  getAdapter(): ProductAdapter {
    return this.adapter
  }

  updateConfig(updates: Partial<CloselookConfig>) {
    this.config = { ...this.config, ...updates }
    // Reinitialize adapter if platform changed
    if (updates.platform) {
      this.adapter = this.initializeAdapter()
    }
  }
}

// Singleton instance
let pluginInstance: CloselookPluginConfig | null = null

export function initializeCloselookPlugin(config?: Partial<CloselookConfig>): CloselookPluginConfig {
  if (!pluginInstance) {
    pluginInstance = new CloselookPluginConfig(config)
  }
  return pluginInstance
}

export function getCloselookPlugin(): CloselookPluginConfig {
  if (!pluginInstance) {
    pluginInstance = new CloselookPluginConfig()
  }
  return pluginInstance
}
