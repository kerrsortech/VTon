/**
 * Session storage for Shopify OAuth sessions
 * In production, this should use a database or encrypted cookie storage
 */

import type { ShopifySession } from "./types"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = process.env.SHOPIFY_SESSION_SECRET || process.env.SHOPIFY_API_SECRET || "default-secret-change-in-production"

// In-memory storage for development
// In production, use a database or Redis
const sessionStore = new Map<string, ShopifySession>()

/**
 * Encrypt and store session
 */
export async function storeSession(session: ShopifySession): Promise<void> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({
      shop: session.shop,
      scope: session.scope,
      isOnline: session.isOnline,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret)

    // Store access token separately (in production, use encrypted storage)
    sessionStore.set(session.shop, {
      ...session,
      accessToken: token, // In production, encrypt this separately
    })
  } catch (error) {
    console.error("Error storing session:", error)
    throw error
  }
}

/**
 * Retrieve session by shop domain
 */
export async function getSession(shop: string): Promise<ShopifySession | null> {
  const session = sessionStore.get(shop)
  if (!session) return null

  // Verify JWT token
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(session.accessToken, secret)
    return session
  } catch (error) {
    // Token expired or invalid
    sessionStore.delete(shop)
    return null
  }
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

