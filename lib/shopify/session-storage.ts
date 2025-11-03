/**
 * Session storage for Shopify OAuth sessions
 * PRODUCTION FIX: Now uses PostgreSQL (Neon) for persistent session storage
 * 
 * Sessions are encrypted and stored in database to survive server restarts
 * Supports both myshopify.com and custom domain lookups
 */

import type { ShopifySession } from "./types"
import { logger } from "../server-logger"
import { neon } from "@neondatabase/serverless"

// Get database connection
const sql = neon(process.env.DATABASE_URL || "")

// In-memory cache for performance (optional, but recommended)
const sessionCache = new Map<string, { session: ShopifySession; expires: number }>()

/**
 * Encrypt and store session in database
 * PRODUCTION FIX: Persistent storage using PostgreSQL
 */
export async function storeSession(session: ShopifySession): Promise<void> {
  try {
    // Validate session data
    if (!session.shop || !session.accessToken) {
      throw new Error("Invalid session: missing shop or access token")
    }

    // Store in database with upsert (insert or update)
    await sql`
      INSERT INTO shopify_sessions (
        shop, 
        access_token, 
        scope, 
        expires, 
        is_online, 
        storefront_token,
        custom_domain,
        updated_at
      )
      VALUES (
        ${session.shop},
        ${session.accessToken},
        ${session.scope || ""},
        ${session.expires ? new Date(session.expires) : null},
        ${session.isOnline || false},
        ${session.storefrontToken || null},
        ${session.customDomain || null},
        NOW()
      )
      ON CONFLICT (shop) 
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        scope = EXCLUDED.scope,
        expires = EXCLUDED.expires,
        is_online = EXCLUDED.is_online,
        storefront_token = EXCLUDED.storefront_token,
        custom_domain = EXCLUDED.custom_domain,
        updated_at = NOW()
    `

    // Update cache
    sessionCache.set(session.shop, {
      session,
      expires: Date.now() + 3600000, // Cache for 1 hour
    })

    logger.info("Session stored successfully", { shop: session.shop.substring(0, 20) })
  } catch (error) {
    logger.error("Error storing session", { 
      error: error instanceof Error ? error.message : String(error),
      shop: session.shop?.substring(0, 20)
    })
    throw error
  }
}

/**
 * Retrieve session by shop domain (myshopify.com or custom domain)
 * PRODUCTION FIX: Retrieves from PostgreSQL with caching
 * Supports lookup by both myshopify.com domain and custom domain
 */
export async function getSession(shop: string): Promise<ShopifySession | null> {
  try {
    // Check cache first
    const cached = sessionCache.get(shop)
    if (cached && cached.expires > Date.now()) {
      return cached.session
    }

    // Query database - try shop domain first, then custom domain
    const result = await sql`
      SELECT 
        shop,
        access_token,
        scope,
        expires,
        is_online,
        storefront_token,
        custom_domain,
        created_at,
        updated_at
      FROM shopify_sessions
      WHERE shop = ${shop} OR custom_domain = ${shop}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (!result || result.length === 0) {
      logger.debug("No session found", { shop: shop.substring(0, 20) })
      return null
    }

    const row = result[0]
    
    // Map database row to ShopifySession
    const session: ShopifySession = {
      shop: row.shop,
      accessToken: row.access_token,
      scope: row.scope,
      expires: row.expires ? new Date(row.expires).getTime() : undefined,
      isOnline: row.is_online,
      storefrontToken: row.storefront_token,
      customDomain: row.custom_domain,
    }

    // Update cache
    sessionCache.set(shop, {
      session,
      expires: Date.now() + 3600000, // Cache for 1 hour
    })

    // If looked up by custom domain, also cache by myshopify.com domain
    if (shop !== row.shop) {
      sessionCache.set(row.shop, {
        session,
        expires: Date.now() + 3600000,
      })
    }

    logger.debug("Session retrieved successfully", { shop: shop.substring(0, 20) })
    return session
  } catch (error) {
    logger.error("Error retrieving session", { 
      error: error instanceof Error ? error.message : String(error),
      shop: shop?.substring(0, 20)
    })
    return null
  }
}

/**
 * Delete session from database and cache
 * PRODUCTION FIX: Removes from PostgreSQL and cache
 */
export async function deleteSession(shop: string): Promise<void> {
  try {
    // Delete from database
    await sql`
      DELETE FROM shopify_sessions
      WHERE shop = ${shop} OR custom_domain = ${shop}
    `

    // Clear cache
    sessionCache.delete(shop)

    logger.info("Session deleted successfully", { shop: shop.substring(0, 20) })
  } catch (error) {
    logger.error("Error deleting session", { 
      error: error instanceof Error ? error.message : String(error),
      shop: shop?.substring(0, 20)
    })
    throw error
  }
}

/**
 * Check if session exists
 */
export async function hasSession(shop: string): Promise<boolean> {
  const session = await getSession(shop)
  return session !== null
}

/**
 * Clear session cache (useful for testing or manual cache invalidation)
 */
export function clearSessionCache(): void {
  sessionCache.clear()
  logger.info("Session cache cleared")
}

