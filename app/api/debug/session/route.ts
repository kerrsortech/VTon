import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/shopify/session-storage"
import { logger } from "@/lib/server-logger"
import { addCorsHeaders, createCorsPreflightResponse } from "@/lib/cors-headers"

export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      const response = NextResponse.json(
        { error: "shop parameter is required" },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    logger.info("Debug: Checking session for shop", { shop })

    const session = await getSession(shop)

    if (!session) {
      const response = NextResponse.json({
        found: false,
        message: "No session found for this shop",
        shop,
        hint: "App may not be installed or session expired. Please reinstall the app.",
      })
      return addCorsHeaders(response, request)
    }

    // Return sanitized session info (DO NOT expose actual tokens)
    const response = NextResponse.json({
      found: true,
      shop: session.shop,
      hasAccessToken: !!session.accessToken,
      hasStorefrontToken: !!session.storefrontToken,
      accessTokenLength: session.accessToken?.length || 0,
      storefrontTokenLength: session.storefrontToken?.length || 0,
      scope: session.scope,
      isOnline: session.isOnline,
      expires: session.expires,
      customDomain: session.customDomain,
      message: session.storefrontToken
        ? "✅ Session found with storefront token"
        : "⚠️ Session found but NO storefront token - reinstall app to generate token",
    })

    return addCorsHeaders(response, request)
  } catch (error) {
    logger.error("Debug session error", {
      error: error instanceof Error ? error.message : String(error),
    })
    const response = NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

