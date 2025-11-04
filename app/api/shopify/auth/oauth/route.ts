import { NextRequest, NextResponse } from "next/server"
import { shopify } from "@/lib/shopify/auth"
import { storeSession } from "@/lib/shopify/session-storage"
import { logger } from "@/lib/server-logger"
// COMMENTED OUT: Dashboard/Analytics functionality - will work on later
// import { getOrCreateStore } from "@/lib/db/analytics"
import type { ShopifySession } from "@/lib/shopify/types"

/**
 * Handle Shopify OAuth callback
 * GET /api/shopify/auth/oauth?shop=store.myshopify.com&code=...
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")
    const code = url.searchParams.get("code")
    const hmac = url.searchParams.get("hmac")

    if (!shop || !code || !hmac) {
      return NextResponse.json(
        { error: "Missing required OAuth parameters" },
        { status: 400 }
      )
    }

    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json(
        { error: "Invalid shop domain" },
        { status: 400 }
      )
    }

    logger.info("Shopify OAuth callback received", { shop })

    // Validate HMAC (handled by Shopify SDK in production)
    // For now, proceed with token exchange

    // Exchange code for access token
    // Note: In production, use Shopify SDK's callback handler
    const accessTokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      }
    )

    if (!accessTokenResponse.ok) {
      const errorData = await accessTokenResponse.json().catch(() => ({}))
      logger.error("Shopify OAuth token exchange failed", { 
        shop, 
        error: errorData 
      })
      return NextResponse.json(
        { error: "Failed to exchange OAuth code for token" },
        { status: 500 }
      )
    }

    const tokenData = await accessTokenResponse.json()
    const accessToken = tokenData.access_token
    const scope = tokenData.scope || "read_products,read_content"

    logger.info("Access token retrieved successfully", { shop })

    // PRODUCTION FIX: Generate Storefront API token using GraphQL (matches official docs)
    // This allows the backend to fetch products without requiring Admin API access
    let storefrontToken: string | undefined = undefined
    try {
      logger.info("Generating Storefront API token via GraphQL", { shop })
      
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

      const storefrontResponse = await fetch(
        `https://${shop}/admin/api/2025-10/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: mutation,
            variables,
          }),
        }
      )

      if (storefrontResponse.ok) {
        const storefrontData = await storefrontResponse.json()
        
        // Check for GraphQL errors
        if (storefrontData.errors || storefrontData.data?.storefrontAccessTokenCreate?.userErrors?.length > 0) {
          const errors = storefrontData.errors || storefrontData.data?.storefrontAccessTokenCreate?.userErrors
          logger.warn("GraphQL errors creating Storefront token", { 
            shop,
            errors 
          })
        } else {
          storefrontToken = storefrontData.data?.storefrontAccessTokenCreate?.storefrontAccessToken?.accessToken
          if (storefrontToken) {
            logger.info("Storefront token generated successfully via GraphQL", { shop })
          } else {
            logger.warn("No Storefront token in response", { shop, data: storefrontData })
          }
        }
      } else {
        const errorText = await storefrontResponse.text()
        logger.warn("Failed to generate storefront token via GraphQL", { 
          shop,
          status: storefrontResponse.status,
          error: errorText
        })
      }
    } catch (storefrontError) {
      logger.error("Error generating storefront token", { 
        shop, 
        error: storefrontError instanceof Error ? storefrontError.message : String(storefrontError)
      })
      // Non-critical: continue without storefront token
    }

    // Store session with all tokens
    const session: ShopifySession = {
      shop,
      accessToken,
      scope,
      isOnline: false,
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for offline tokens
      storefrontToken, // PRODUCTION FIX: Store storefront token
    }

    await storeSession(session)

    // COMMENTED OUT: Dashboard/Analytics functionality - will work on later
    // // Create or update store record in analytics database
    // try {
    //   await getOrCreateStore(shop, shop.replace(".myshopify.com", ""), accessToken)
    //   logger.info("Store record created/updated", { shop })
    // } catch (error) {
    //   logger.error("Failed to create store record", { shop, error })
    //   // Don't fail OAuth if analytics setup fails
    // }

    logger.info("Shopify OAuth completed successfully", { shop })

    // Redirect to our admin page with instructions on how to enable the chatbot
    // This provides a better user experience than redirecting to Shopify admin
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.RENDER_EXTERNAL_URL || "https://vton-1-hqmc.onrender.com"
    const adminUrl = `${appUrl}/admin?shop=${encodeURIComponent(shop)}`
    
    logger.info("Redirecting to admin page with setup instructions", { shop, adminUrl })
    return NextResponse.redirect(adminUrl)
  } catch (error) {
    logger.error("Shopify OAuth callback error", { error })
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    )
  }
}

export const config = {
  maxDuration: 30,
}

