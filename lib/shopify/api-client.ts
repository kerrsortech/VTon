/**
 * Shopify API client wrapper
 */

import { shopify } from "./auth"
import type { ShopifySession } from "./types"

/**
 * Make authenticated API request to Shopify
 */
export async function shopifyRequest(
  session: ShopifySession,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://${session.shop}/admin/api/${shopify.config.apiVersion}${endpoint}`

  return fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

/**
 * Fetch products from Shopify
 */
export async function fetchShopifyProducts(
  session: ShopifySession,
  limit = 50,
  cursor?: string
): Promise<{ products: any[]; nextCursor?: string }> {
  const query = `
    query getProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            vendor
            tags
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  availableForSale
                  image {
                    url
                  }
                }
              }
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
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

  const variables = {
    first: limit,
    ...(cursor && { after: cursor }),
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  const products = data.data?.products?.edges || []
  const pageInfo = data.data?.products?.pageInfo

  return {
    products: products.map((edge: any) => edge.node),
    nextCursor: pageInfo?.hasNextPage ? pageInfo.endCursor : undefined,
  }
}

/**
 * Fetch single product by ID or handle
 */
export async function fetchShopifyProduct(
  session: ShopifySession,
  productIdOrHandle: string
): Promise<any | null> {
  // Check if it's a GID (GraphQL ID) or handle
  const isGID = productIdOrHandle.startsWith("gid://")
  const query = isGID
    ? `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          productType
          vendor
          tags
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                availableForSale
                image {
                  url
                }
              }
            }
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `
    : `
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          title
          handle
          description
          productType
          vendor
          tags
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                availableForSale
                image {
                  url
                }
              }
            }
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `

  const variables = isGID ? { id: productIdOrHandle } : { handle: productIdOrHandle }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data?.product || null
}

