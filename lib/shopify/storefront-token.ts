/**
 * Utility functions for managing Shopify Storefront Access Tokens
 * Ensures the backend always has a Storefront token to fetch product data
 */

import { logger } from "../server-logger"
import { getSession, storeSession } from "./session-storage"
import type { ShopifySession } from "./types"

/**
 * Create a Storefront Access Token using Admin API GraphQL mutation
 * Matches official Shopify documentation format
 */
export async function createStorefrontToken(
  shop: string,
  adminAccessToken: string
): Promise<string | null> {
  try {
    logger.info("Creating Storefront Access Token via GraphQL", { shop })

    const mutation = `
      mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) {
          userErrors {
            field
            message
          }
          shop {
            id
          }
          storefrontAccessToken {
            accessScopes {
              handle
            }
            accessToken
            title
            id
            createdAt
          }
        }
      }
    `

    const variables = {
      input: {
        title: "Closelook Virtual Try-On Widget",
      },
    }

    const response = await fetch(
      `https://${shop}/admin/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminAccessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to create Storefront token", {
        shop,
        status: response.status,
        error: errorText,
      })
      return null
    }

    const data = await response.json()

    // Check for GraphQL errors
    if (data.errors || data.data?.storefrontAccessTokenCreate?.userErrors?.length > 0) {
      const errors = data.errors || data.data?.storefrontAccessTokenCreate?.userErrors
      logger.error("GraphQL errors creating Storefront token", {
        shop,
        errors,
      })
      return null
    }

    const token =
      data.data?.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken

    if (!token) {
      logger.error("No Storefront token in response", { shop, data })
      return null
    }

    logger.info("Storefront Access Token created successfully", { shop })
    return token
  } catch (error) {
    logger.error("Error creating Storefront Access Token", {
      shop,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Ensure we have a Storefront Access Token
 * Priority:
 * 1. Environment variable (SHOPIFY_STOREFRONT_TOKEN)
 * 2. Session storefrontToken
 * 3. Create new token using Admin access token (if available)
 */
export async function ensureStorefrontToken(
  shop: string
): Promise<string | null> {
  try {
    // Priority 1: Check environment variable
    const envToken = process.env.SHOPIFY_STOREFRONT_TOKEN
    if (envToken && envToken.trim().length > 0) {
      logger.debug("Using Storefront token from environment variable", {
        shop,
      })
      return envToken.trim()
    }

    // Priority 2: Check session
    const session = await getSession(shop)
    if (session?.storefrontToken && session.storefrontToken.trim().length > 0) {
      logger.debug("Using Storefront token from session", { shop })
      return session.storefrontToken.trim()
    }

    // Priority 3: Try to create a new token using Admin access token
    if (session?.accessToken) {
      logger.info(
        "No Storefront token found, attempting to create one using Admin access token",
        { shop }
      )

      const newToken = await createStorefrontToken(shop, session.accessToken)

      if (newToken) {
        // Update session with new Storefront token
        const updatedSession: ShopifySession = {
          ...session,
          storefrontToken: newToken,
        }
        await storeSession(updatedSession)
        logger.info("Storefront token created and stored in session", { shop })
        return newToken
      }
    }

    logger.warn("No Storefront Access Token available", {
      shop,
      hasEnvToken: !!envToken,
      hasSessionToken: !!session?.storefrontToken,
      hasAdminToken: !!session?.accessToken,
    })

    return null
  } catch (error) {
    logger.error("Error ensuring Storefront token", {
      shop,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Test if a Storefront token is valid by attempting to fetch a product
 */
export async function testStorefrontToken(
  shop: string,
  storefrontToken: string
): Promise<boolean> {
  try {
    const testQuery = `
      query {
        shop {
          id
          name
        }
      }
    `

    const response = await fetch(
      `https://${shop}/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query: testQuery,
        }),
      }
    )

    if (!response.ok) {
      logger.warn("Storefront token test failed", {
        shop,
        status: response.status,
      })
      return false
    }

    const data = await response.json()
    if (data.errors) {
      logger.warn("Storefront token test returned errors", {
        shop,
        errors: data.errors,
      })
      return false
    }

    logger.info("Storefront token is valid", { shop })
    return true
  } catch (error) {
    logger.error("Error testing Storefront token", {
      shop,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}








