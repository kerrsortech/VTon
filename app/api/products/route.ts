import { NextRequest, NextResponse } from "next/server"
import { getCloselookPlugin } from "@/lib/closelook-plugin"
import type { Product } from "@/lib/closelook-types"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"
import { logger } from "@/lib/server-logger"

// Helper to convert CloselookProduct to Product for compatibility
function closelookProductToProduct(closelookProduct: CloselookProduct): Product {
  return {
    id: closelookProduct.id,
    name: closelookProduct.name,
    category: closelookProduct.category,
    type: closelookProduct.type,
    color: closelookProduct.color,
    price: closelookProduct.price,
    images: closelookProduct.images,
    description: closelookProduct.description,
    sizes: closelookProduct.sizes,
  }
}

// Cache products for 5 minutes to reduce load
let cachedProducts: Product[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get all products using the plugin adapter
 * GET /api/products
 */
export async function GET(request: NextRequest) {
  try {
    // Return cached products if still valid
    const now = Date.now()
    if (cachedProducts && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({ products: cachedProducts })
    }

    // Use the plugin adapter (currently using demo adapter, but demonstrates Shopify adapter pattern)
    const plugin = getCloselookPlugin()
    const adapter = plugin.getAdapter()
    const closelookProducts = await adapter.getAllProducts()

    // Convert to Product type for compatibility
    const products: Product[] = closelookProducts.map(closelookProductToProduct)
    
    // Cache the results
    cachedProducts = products
    cacheTimestamp = now

    return NextResponse.json({ products })
  } catch (error) {
    logger.error("Error fetching products", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}


