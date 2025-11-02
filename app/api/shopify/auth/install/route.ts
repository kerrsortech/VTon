import { NextRequest, NextResponse } from "next/server"
import { extractShopDomain, getAuthUrl } from "@/lib/shopify/auth"
import { logger } from "@/lib/server-logger"

/**
 * Initiate Shopify OAuth flow
 * GET /api/shopify/auth/install?shop=store.myshopify.com
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables first
    const apiKey = process.env.SHOPIFY_API_KEY
    const apiSecret = process.env.SHOPIFY_API_SECRET
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.RENDER_EXTERNAL_URL

    if (!apiKey || !apiSecret) {
      logger.error("Shopify OAuth install error - missing credentials", {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      })
      return NextResponse.json(
        {
          error: "Shopify API credentials not configured",
          details: "Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET environment variables. Please set these in your Render environment settings.",
        },
        { status: 500 }
      )
    }

    if (!appUrl) {
      logger.error("Shopify OAuth install error - missing app URL")
      return NextResponse.json(
        {
          error: "App URL not configured",
          details: "Missing SHOPIFY_APP_URL or RENDER_EXTERNAL_URL environment variable. Please set this to your deployed app URL.",
        },
        { status: 500 }
      )
    }

    // Extract and validate shop parameter
    const url = new URL(request.url)
    const shopParam = url.searchParams.get("shop")
    
    logger.info("OAuth install request received", { 
      url: request.url,
      shopParam,
      allParams: Object.fromEntries(url.searchParams.entries())
    })
    
    const shop = extractShopDomain(request)
    if (!shop) {
      logger.error("Shop parameter validation failed", { 
        shopParam,
        url: request.url,
        hasShopParam: !!shopParam
      })
      return NextResponse.json(
        { 
          error: "Missing or invalid shop parameter", 
          details: shopParam 
            ? `The shop parameter "${shopParam}" is invalid. It must be a valid .myshopify.com domain (e.g., "your-store.myshopify.com")`
            : "The 'shop' query parameter is required and must be a valid .myshopify.com domain",
          received: shopParam || "none"
        },
        { status: 400 }
      )
    }

    logger.info("Shopify OAuth install initiated", { shop, appUrl })

    // Generate OAuth URL
    let authUrl: string
    try {
      authUrl = getAuthUrl(shop)
    } catch (urlError: any) {
      logger.error("Shopify OAuth URL generation failed", { 
        shop, 
        error: urlError,
        errorMessage: urlError?.message,
        stack: urlError?.stack 
      })
      return NextResponse.json(
        {
          error: "Failed to generate OAuth URL",
          details: urlError?.message || "Unknown error during OAuth URL generation",
        },
        { status: 500 }
      )
    }

    if (!authUrl) {
      logger.error("Shopify OAuth install error - empty auth URL", { shop })
      return NextResponse.json(
        {
          error: "Failed to generate OAuth URL",
          details: "The OAuth URL generation returned an empty value",
        },
        { status: 500 }
      )
    }

    logger.info("Redirecting to Shopify OAuth", { shop, authUrl })

    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    logger.error("Shopify OAuth install error", { 
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    })
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        details: error?.message || "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

