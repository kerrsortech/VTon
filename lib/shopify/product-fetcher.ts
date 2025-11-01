/**
 * Fetch and map Shopify products to Closelook Product format
 */

import type { ShopifySession } from "./types"
import { fetchShopifyProduct, fetchShopifyProducts } from "./api-client"
import type { CloselookProduct } from "../closelook-plugin/types"

/**
 * Map Shopify product to Closelook Product
 */
export function mapShopifyToCloselook(shopifyProduct: any): CloselookProduct {
  const variant = shopifyProduct.variants?.edges?.[0]?.node || shopifyProduct.variants?.[0]
  const images = shopifyProduct.images?.edges?.map((e: any) => e.node.url) || 
                 shopifyProduct.images?.map((img: any) => img.url || img.src) || 
                 []
  
  const price = variant?.price ? parseFloat(variant.price) : 
                shopifyProduct.priceRangeV2?.minVariantPrice?.amount ? 
                parseFloat(shopifyProduct.priceRangeV2.minVariantPrice.amount) : 0

  // Extract sizes from variants
  const sizes = shopifyProduct.variants?.edges?.map((e: any) => e.node.title) || 
                shopifyProduct.variants?.map((v: any) => v.title) || 
                undefined

  // Extract color from tags or variant title
  const colorTag = shopifyProduct.tags?.find((tag: string) => tag.toLowerCase().startsWith("color:"))
  const color = colorTag ? colorTag.replace(/^color:/i, "") : 
                variant?.title?.split("/")[0]?.trim() || 
                shopifyProduct.tags?.find((tag: string) => /^(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey)/i.test(tag)) ||
                ""

  return {
    id: shopifyProduct.id || shopifyProduct.handle,
    name: shopifyProduct.title,
    category: shopifyProduct.productType || "Uncategorized",
    type: shopifyProduct.productType || "",
    color: color,
    price: price,
    images: images,
    description: shopifyProduct.description || "",
    url: shopifyProduct.handle ? `https://${shopifyProduct.shop || ""}/products/${shopifyProduct.handle}` : undefined,
    sizes: sizes,
    metadata: {
      platform: "shopify",
      shopifyId: shopifyProduct.id,
      shopifyHandle: shopifyProduct.handle,
      tags: shopifyProduct.tags || [],
      vendor: shopifyProduct.vendor,
    },
  }
}

/**
 * Fetch product from Shopify and map to Closelook format
 */
export async function fetchProduct(
  session: ShopifySession,
  productIdOrHandle: string
): Promise<CloselookProduct | null> {
  const shopifyProduct = await fetchShopifyProduct(session, productIdOrHandle)
  if (!shopifyProduct) return null
  return mapShopifyToCloselook(shopifyProduct)
}

/**
 * Fetch all products from Shopify and map to Closelook format
 */
export async function fetchAllProducts(
  session: ShopifySession,
  limit = 250
): Promise<CloselookProduct[]> {
  const allProducts: CloselookProduct[] = []
  let cursor: string | undefined

  do {
    const { products, nextCursor } = await fetchShopifyProducts(session, limit, cursor)
    allProducts.push(...products.map(mapShopifyToCloselook))
    cursor = nextCursor
  } while (cursor)

  return allProducts
}

