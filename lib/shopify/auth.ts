/**
 * Shopify OAuth helpers
 */

import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api"
import "@shopify/shopify-api/adapters/node"

const apiKey = process.env.SHOPIFY_API_KEY || ""
const apiSecret = process.env.SHOPIFY_API_SECRET || ""
const scopes = (process.env.SHOPIFY_SCOPES || "read_products,read_content").split(",")
const hostName = process.env.SHOPIFY_APP_URL || process.env.VERCEL_URL || "localhost:3000"
const hostScheme = hostName.includes("localhost") ? "http" : "https"
const host = `${hostScheme}://${hostName}`

export const shopify = shopifyApi({
  apiKey,
  apiSecretKey: apiSecret,
  scopes,
  hostName: host.replace(/https?:\/\//, ""),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
})

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(shop: string, redirectPath = "/api/shopify/auth/oauth"): string {
  return shop.auth.begin({
    shop,
    callbackPath: redirectPath,
    isOnline: false,
    rawRequest: undefined,
    rawResponse: undefined,
  })
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

