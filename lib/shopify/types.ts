/**
 * Shopify-specific types
 */

export interface ShopifySession {
  shop: string // myshopify.com domain (e.g., store.myshopify.com)
  accessToken: string // Admin API access token
  scope: string // OAuth scopes granted
  expires?: Date // Token expiration date (for online tokens)
  isOnline?: boolean // Whether this is an online (user) or offline (app) token
  storefrontToken?: string // Storefront API token for public queries (PRODUCTION FIX)
  customDomain?: string // Custom domain if merchant uses one (e.g., www.example.com) (PRODUCTION FIX)
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

