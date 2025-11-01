import { NextRequest, NextResponse } from "next/server"
import { extractShopDomain, getAuthUrl } from "@/lib/shopify/auth"
import { logger } from "@/lib/server-logger"

/**
 * Initiate Shopify OAuth flow
 * GET /api/shopify/auth/install?shop=store.myshopify.com
 */
export async function GET(request: NextRequest) {
  try {
    const shop = extractShopDomain(request)
    if (!shop) {
      return NextResponse.json(
        { error: "Missing or invalid shop parameter" },
        { status: 400 }
      )
    }

    logger.info("Shopify OAuth install initiated", { shop })

    // Generate OAuth URL
    const authUrl = getAuthUrl(shop)

    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error("Shopify OAuth install error", { error })
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    )
  }
}

