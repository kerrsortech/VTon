import { NextRequest, NextResponse } from "next/server"
import { extractShopDomain } from "@/lib/shopify/auth"
import { getSession } from "@/lib/shopify/session-storage"
import { fetchAllProducts } from "@/lib/shopify/product-fetcher"
import { logger } from "@/lib/server-logger"

/**
 * Fetch products from Shopify
 * GET /api/shopify/products?shop=store.myshopify.com
 */
export async function GET(request: NextRequest) {
  try {
    const shop = request.headers.get("X-Shopify-Domain") || 
                 new URL(request.url).searchParams.get("shop") ||
                 extractShopDomain(request)

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSession(shop)
    if (!session) {
      return NextResponse.json(
        { error: "Shop not authenticated. Please install the app first." },
        { status: 401 }
      )
    }

    logger.info("Fetching Shopify products", { shop })

    // Fetch all products
    const products = await fetchAllProducts(session, 250)

    logger.info("Shopify products fetched successfully", { 
      shop, 
      productCount: products.length 
    })

    return NextResponse.json({
      products,
      count: products.length,
    })
  } catch (error) {
    logger.error("Error fetching Shopify products", { error })
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

export const config = {
  maxDuration: 60,
}

