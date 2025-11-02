/**
 * Demo Product Adapter
 * Uses static demo data for testing and development
 * 
 * This adapter demonstrates the Shopify adapter pattern using demo data.
 * When switched to "shopify" platform, the ShopifyProductAdapter will be used instead.
 */

import type { ProductAdapter } from "./base-adapter"
import type { CloselookProduct } from "../types"
import { demoProducts as rawDemoProducts } from "../../demo-products"

// Convert Product[] to CloselookProduct[]
const demoProducts: CloselookProduct[] = rawDemoProducts.map((product) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  type: product.type,
  color: product.color,
  price: product.price,
  images: product.images,
  description: product.description,
  sizes: product.sizes, // Include sizes for compatibility
  metadata: {
    platform: "demo",
    source: "demo-products",
  },
}))

export class DemoProductAdapter implements ProductAdapter {
  async getProduct(id: string): Promise<CloselookProduct | null> {
    const product = demoProducts.find((p) => p.id === id)
    return product || null
  }

  async getProducts(ids: string[]): Promise<CloselookProduct[]> {
    return demoProducts.filter((p) => ids.includes(p.id))
  }

  async getProductsByCategory(category: string): Promise<CloselookProduct[]> {
    return demoProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase())
  }

  async searchProducts(query: string): Promise<CloselookProduct[]> {
    const lowerQuery = query.toLowerCase()
    return demoProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery) ||
        p.type.toLowerCase().includes(lowerQuery),
    )
  }

  async getAllProducts(options?: { limit?: number; offset?: number }): Promise<CloselookProduct[]> {
    const { limit = 100, offset = 0 } = options || {}
    return demoProducts.slice(offset, offset + limit)
  }

  async getRecommendedProducts(productId: string, limit = 4): Promise<CloselookProduct[]> {
    const product = await this.getProduct(productId)
    if (!product) return []

    // Simple recommendation: same category, different product
    const recommendations = demoProducts.filter((p) => p.category === product.category && p.id !== productId)

    return recommendations.slice(0, limit)
  }
}
