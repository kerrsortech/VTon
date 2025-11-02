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
import { logger } from "../../server-logger"

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

  private async fetchShopify(query: string, variables?: Record<string, unknown>, retries = 3) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(`https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle rate limiting with retry
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "2") * 1000
        await new Promise(resolve => setTimeout(resolve, retryAfter))
        return this.fetchShopify(query, variables, retries - 1)
      }

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        throw new Error(`Shopify GraphQL error: ${result.errors[0].message}`)
      }

      return result
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === "AbortError") {
        throw new Error("Shopify API request timeout")
      }
      
      throw error
    }
  }

  private mapShopifyProduct(shopifyProduct: any): CloselookProduct {
    // Handle both GraphQL edge/node format and direct format
    const product = shopifyProduct.node || shopifyProduct
    
    // Extract variant (handle both GraphQL edge format and array format)
    const variantEdge = product.variants?.edges?.[0]?.node
    const variant = variantEdge || product.variants?.[0]
    
    // Extract price (handle both string and MoneyV2 format)
    let price = 0
    if (variant?.price?.amount) {
      price = Number.parseFloat(variant.price.amount)
    } else if (variant?.price) {
      price = Number.parseFloat(variant.price)
    }
    
    // Extract images (handle GraphQL edge format)
    const images = product.images?.edges?.map((e: any) => e.node.url) || 
                   product.images?.map((img: any) => img.url) || 
                   []
    
    return {
      id: product.id,
      name: product.title,
      category: product.productType || "Uncategorized",
      type: product.productType || "",
      color: product.tags?.find((tag: string) => tag.toLowerCase().startsWith("color:"))?.replace(/^color:/i, "") || "",
      price: price,
      images: images,
      description: product.description || "",
      metadata: {
        platform: "shopify",
        shopifyId: product.id,
        tags: product.tags || [],
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
    if (ids.length === 0) return []
    
    // Use batch GraphQL query for efficiency (max 5 products per query)
    const batchSize = 5
    const results: CloselookProduct[] = []
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const batchQuery = `
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
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
        }
      `
      
      try {
        const result = await this.fetchShopify(batchQuery, { ids: batch })
        const products = result.data?.nodes || []
        results.push(...products.map((p: ShopifyProduct) => this.mapShopifyProduct(p)).filter(Boolean))
      } catch (error) {
        logger.warn(`Failed to fetch batch ${i}-${i + batchSize}`, { error: error instanceof Error ? error.message : String(error) })
        // Continue with other batches
      }
    }
    
    return results
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
    const { limit = 250 } = options || {}
    const allProducts: CloselookProduct[] = []
    let hasNextPage = true
    let cursor: string | undefined

    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
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
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    try {
      while (hasNextPage && allProducts.length < limit) {
        const result = await this.fetchShopify(query, { 
          first: Math.min(limit - allProducts.length, 250), 
          after: cursor 
        })
        
        const products = result.data?.products?.edges || []
        const pageInfo = result.data?.products?.pageInfo
        
        allProducts.push(...products.map((edge: any) => this.mapShopifyProduct(edge.node)))
        
        hasNextPage = pageInfo?.hasNextPage || false
        cursor = pageInfo?.endCursor
      }
    } catch (error) {
      logger.error("Error fetching all products from Shopify", { error: error instanceof Error ? error.message : String(error) })
      // Return what we have so far if there's an error
    }

    return allProducts.slice(0, limit)
  }

  async getRecommendedProducts(productId: string, limit = 4): Promise<CloselookProduct[]> {
    // Implement product recommendations
    throw new Error("Not implemented - use Shopify recommendations API or custom logic")
  }
}
