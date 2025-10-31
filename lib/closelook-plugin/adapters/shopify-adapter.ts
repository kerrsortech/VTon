/**
 * Shopify Product Adapter
 * Integrates with Shopify Storefront API
 *
 * To use this adapter:
 * 1. Set up Shopify Storefront API access token
 * 2. Configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN
 * 3. Initialize: new ShopifyProductAdapter(storeDomain, accessToken)
 */

import type { ProductAdapter } from "./base-adapter"
import type { CloselookProduct } from "../types"

interface ShopifyProduct {
  id: string
  title: string
  productType: string
  variants: Array<{
    id: string
    price: string
    image?: { url: string }
  }>
  images: Array<{ url: string }>
  description: string
  tags: string[]
}

export class ShopifyProductAdapter implements ProductAdapter {
  private storeDomain: string
  private accessToken: string
  private apiVersion = "2024-01"

  constructor(storeDomain: string, accessToken: string) {
    this.storeDomain = storeDomain
    this.accessToken = accessToken
  }

  private async fetchShopify(query: string, variables?: Record<string, unknown>) {
    const response = await fetch(`https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`)
    }

    return response.json()
  }

  private mapShopifyProduct(shopifyProduct: ShopifyProduct): CloselookProduct {
    const variant = shopifyProduct.variants[0]
    return {
      id: shopifyProduct.id,
      name: shopifyProduct.title,
      category: shopifyProduct.productType || "Uncategorized",
      type: shopifyProduct.productType || "",
      color: shopifyProduct.tags.find((tag) => tag.startsWith("color:"))?.replace("color:", "") || "",
      price: Number.parseFloat(variant?.price || "0"),
      images: shopifyProduct.images.map((img) => img.url),
      description: shopifyProduct.description,
      metadata: {
        platform: "shopify",
        shopifyId: shopifyProduct.id,
        tags: shopifyProduct.tags,
      },
    }
  }

  async getProduct(id: string): Promise<CloselookProduct | null> {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          productType
          description
          tags
          images(first: 10) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price {
                  amount
                }
              }
            }
          }
        }
      }
    `

    const result = await this.fetchShopify(query, { id })
    if (!result.data?.product) return null

    return this.mapShopifyProduct(result.data.product)
  }

  async getProducts(ids: string[]): Promise<CloselookProduct[]> {
    // Implement batch fetching for multiple products
    const products = await Promise.all(ids.map((id) => this.getProduct(id)))
    return products.filter((p): p is CloselookProduct => p !== null)
  }

  async getProductsByCategory(category: string): Promise<CloselookProduct[]> {
    // Implement category filtering using Shopify collections
    throw new Error("Not implemented - use Shopify collections API")
  }

  async searchProducts(query: string): Promise<CloselookProduct[]> {
    // Implement Shopify product search
    throw new Error("Not implemented - use Shopify search API")
  }

  async getAllProducts(options?: { limit?: number; offset?: number }): Promise<CloselookProduct[]> {
    // Implement pagination for all products
    throw new Error("Not implemented - use Shopify products API with pagination")
  }

  async getRecommendedProducts(productId: string, limit = 4): Promise<CloselookProduct[]> {
    // Implement product recommendations
    throw new Error("Not implemented - use Shopify recommendations API or custom logic")
  }
}
