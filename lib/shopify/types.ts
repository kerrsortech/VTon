/**
 * Shopify-specific types
 */

export interface ShopifySession {
  shop: string
  accessToken: string
  scope: string
  expires?: Date
  isOnline?: boolean
}

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  productType: string
  vendor: string
  tags: string[]
  images: Array<{
    id: string
    url: string
    altText?: string
  }>
  variants: Array<{
    id: string
    title: string
    price: string
    sku?: string
    availableForSale: boolean
    image?: {
      url: string
    }
  }>
  priceRangeV2?: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
}

export interface ShopifyProductEdge {
  node: ShopifyProduct
  cursor: string
}

export interface ShopifyProductConnection {
  edges: ShopifyProductEdge[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string
  }
}

