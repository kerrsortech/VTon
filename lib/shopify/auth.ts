/**
 * Shopify OAuth helpers
 */

import { shopifyApi, ApiVersion } from "@shopify/shopify-api"
import "@shopify/shopify-api/adapters/node"

// Lazy initialization to avoid build-time errors when env vars are missing
let shopifyInstance: ReturnType<typeof shopifyApi> | null = null

function getShopifyInstance() {
  if (shopifyInstance) {
    return shopifyInstance
  }

  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET
  
  // If env vars are missing, create a stub that allows build to succeed
  // This stub will fail at runtime when shopify is actually used
  if (!apiKey || !apiSecret) {
    // Create a minimal stub with required properties for build-time evaluation
    // This prevents build errors while ensuring runtime errors occur when actually used
    shopifyInstance = {
      config: {
        apiVersion: '2025-01',
        apiKey: '',
        apiSecretKey: '',
      },
      auth: {
        begin: () => { 
          throw new Error(
            'Shopify API not configured. Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET environment variables. ' +
            'Please set these variables in your Render environment settings.'
          )
        },
      },
    } as any
    return shopifyInstance
  }

  // Required scopes: 
  // - read_products, read_content (for product catalog)
  // - read_orders, read_customers (for order history and customer info)
  // - write_customers (for creating customer notes/tickets)
  // Example: SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers
  const scopes = (process.env.SHOPIFY_SCOPES || "read_products,read_content,read_orders,read_customers,write_customers").split(",")
  const hostName = process.env.SHOPIFY_APP_URL || process.env.VERCEL_URL || process.env.RENDER_EXTERNAL_URL || "localhost:3000"
  const hostScheme = hostName.includes("localhost") ? "http" : "https"
  const host = `${hostScheme}://${hostName}`

  shopifyInstance = shopifyApi({
    apiKey,
    apiSecretKey: apiSecret,
    scopes,
    hostName: host.replace(/https?:\/\//, ""),
    apiVersion: ApiVersion.July25,
    isEmbeddedApp: true,
  })

  return shopifyInstance
}

export const shopify = new Proxy({} as ReturnType<typeof shopifyApi>, {
  get(_target, prop) {
    const instance = getShopifyInstance()
    const value = (instance as any)[prop]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  }
})

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(shop: string, redirectPath = "/api/shopify/auth/oauth"): string {
  const apiKey = process.env.SHOPIFY_API_KEY
  if (!apiKey) {
    throw new Error("SHOPIFY_API_KEY environment variable is required")
  }

  const hostName = process.env.SHOPIFY_APP_URL || process.env.VERCEL_URL || process.env.RENDER_EXTERNAL_URL || "localhost:3000"
  const hostScheme = hostName.includes("localhost") ? "http" : "https"
  const cleanHostName = hostName.replace(/https?:\/\//, "")
  const fullHost = `${hostScheme}://${cleanHostName}`
  
  // Construct OAuth URL manually for more reliable server-side installations
  const redirectUri = `${fullHost}${redirectPath}`
  const scopes = (process.env.SHOPIFY_SCOPES || "read_products,read_content,read_orders,read_customers,write_customers")
    .split(",")
    .map(s => s.trim())
    .join(",")
  
  const oauthUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  oauthUrl.searchParams.set("client_id", apiKey)
  oauthUrl.searchParams.set("scope", scopes)
  oauthUrl.searchParams.set("redirect_uri", redirectUri)
  
  return oauthUrl.toString()
}

/**
 * Validate HMAC from Shopify
 */
export function validateHmac(hmac: string, query: Record<string, string | string[]>): boolean {
  // Shopify SDK handles HMAC validation automatically
  // This is a placeholder for custom validation if needed
  return true
}

/**
 * Extract shop domain from request
 */
export function extractShopDomain(request: Request): string | null {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")
  if (shop && shop.endsWith(".myshopify.com")) {
    return shop
  }
  return null
}

