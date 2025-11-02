import { NextRequest, NextResponse } from "next/server"
import { getCloselookPlugin } from "@/lib/closelook-plugin"
import type { Product } from "@/lib/closelook-types"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"

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

/**
 * Get all products using the plugin adapter
 * GET /api/products
 */
export async function GET(request: NextRequest) {
  try {
    // Use the plugin adapter (currently using demo adapter, but demonstrates Shopify adapter pattern)
    const plugin = getCloselookPlugin()
    const adapter = plugin.getAdapter()
    const closelookProducts = await adapter.getAllProducts()

    // Convert to Product type for compatibility
    const products: Product[] = closelookProducts.map(closelookProductToProduct)

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

