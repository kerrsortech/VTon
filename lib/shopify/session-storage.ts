/**
 * Session storage for Shopify OAuth sessions
 * In production, this should use a database or encrypted cookie storage
 */

import type { ShopifySession } from "./types"
import { SignJWT, jwtVerify } from "jose"
import { logger } from "../server-logger"

const JWT_SECRET = process.env.SHOPIFY_SESSION_SECRET || process.env.SHOPIFY_API_SECRET || "default-secret-change-in-production"

// In-memory storage for development
// In production, use a database or Redis
const sessionStore = new Map<string, ShopifySession>()

/**
 * Encrypt and store session
 * Note: In production, store the actual access token in encrypted storage (database/Redis)
 */
export async function storeSession(session: ShopifySession): Promise<void> {
  try {
    // Store the session with the actual access token
    // In production, encrypt the access token before storing
    sessionStore.set(session.shop, {
      ...session,
      // accessToken should be the actual Shopify access token
      // If it's a JWT token (from previous bug), we need to handle migration
      // For now, store it as-is
    })
  } catch (error) {
    logger.error("Error storing session", { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

/**
 * Retrieve session by shop domain
 * Note: In production, retrieve from encrypted storage (database/Redis)
 */
export async function getSession(shop: string): Promise<ShopifySession | null> {
  const session = sessionStore.get(shop)
  if (!session) return null

  // In production, decrypt and verify the access token
  // For now, return the session if it exists
  // The access token should be the actual Shopify access token, not a JWT
  return session
}

/**
 * Delete session
 */
export async function deleteSession(shop: string): Promise<void> {
  sessionStore.delete(shop)
}

/**
 * Check if session exists
 */
export async function hasSession(shop: string): Promise<boolean> {
  const session = await getSession(shop)
  return session !== null
}

