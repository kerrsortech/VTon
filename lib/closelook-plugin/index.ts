/**
 * Closelook Plugin - Main Entry Point
 *
 * This is the main export for the Closelook virtual try-on plugin.
 * It provides a platform-agnostic interface for e-commerce integrations.
 *
 * Usage:
 * ```typescript
 * import { initializeCloselookPlugin } from '@/lib/closelook-plugin'
 *
 * // For demo/development
 * const plugin = initializeCloselookPlugin({ platform: 'demo' })
 *
 * // For Shopify
 * const plugin = initializeCloselookPlugin({
 *   platform: 'shopify',
 *   platformConfig: {
 *     storeDomain: 'your-store.myshopify.com',
 *     accessToken: 'your-storefront-access-token'
 *   }
 * })
 *
 * // Get product adapter
 * const adapter = plugin.getAdapter()
 * const product = await adapter.getProduct('product-id')
 * ```
 */

export * from "./types"
export * from "./config"
export * from "./adapters/base-adapter"
export * from "./adapters/demo-adapter"
export * from "./adapters/shopify-adapter"

export { initializeCloselookPlugin, getCloselookPlugin } from "./config"
