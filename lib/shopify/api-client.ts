/**
 * Shopify API client wrapper
 */

import { shopify } from "./auth"
import type { ShopifySession } from "./types"

/**
 * Make authenticated API request to Shopify
 * Includes timeout and error handling
 */
export async function shopifyRequest(
  session: ShopifySession,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Validate session
  if (!session || !session.shop || !session.accessToken) {
    throw new Error("Invalid Shopify session: missing shop or access token")
  }

  // NOTE: For Shopify Admin API calls, we need the myshopify.com domain
  // Session.shop should always be myshopify.com (from OAuth), but validate just in case
  // If it's not myshopify.com format, the API call will fail, so we validate here
  if (!session.shop.includes(".myshopify.com")) {
    // This should never happen if sessions are created correctly via OAuth
    // But handle gracefully: try to normalize or throw helpful error
    throw new Error(`Shopify Admin API requires myshopify.com domain, got: ${session.shop}. Ensure session is created via OAuth.`)
  }

  const url = `https://${session.shop}/admin/api/${shopify.config.apiVersion}${endpoint}`

  // Add timeout to fetch request (15 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60"
      throw new Error(`Rate limit exceeded. Please try again after ${retryAfter} seconds.`)
    }

    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === "AbortError") {
      throw new Error("Shopify API request timeout")
    }
    
    throw error
  }
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

/**
 * Fetch customer orders by email using Admin API
 */
export async function fetchCustomerOrders(
  session: ShopifySession,
  customerEmail: string,
  limit = 10
): Promise<any[]> {
  const query = `
    query getCustomerOrders($email: String!, $first: Int!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
            orders(first: $first, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  id
                  name
                  createdAt
                  updatedAt
                  displayFulfillmentStatus
                  displayFinancialStatus
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  lineItems(first: 10) {
                    edges {
                      node {
                        title
                        quantity
                        variant {
                          id
                          title
                          price
                          selectedOptions {
                            name
                            value
                          }
                        }
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                  shippingAddress {
                    address1
                    address2
                    city
                    province
                    country
                    zip
                  }
                  fulfillments {
                    trackingInfo {
                      company
                      number
                      url
                    }
                    estimatedDeliveryAt
                    status
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  // Query format: "email:customer@example.com"
  const queryString = `email:${customerEmail}`
  const variables = {
    email: queryString,
    first: limit,
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  const customer = data.data?.customers?.edges?.[0]?.node
  if (!customer) {
    return []
  }

  return customer.orders.edges.map((edge: any) => edge.node)
}

/**
 * Fetch order by order name (e.g., "#1001" or "1001")
 */
export async function fetchOrderByName(
  session: ShopifySession,
  orderName: string
): Promise<any | null> {
  // Remove # if present
  const cleanOrderName = orderName.replace(/^#/, "")
  
  const query = `
    query getOrderByName($name: String!) {
      orders(first: 1, query: $name, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            updatedAt
            displayFulfillmentStatus
            displayFinancialStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    id
                    title
                    price
                    selectedOptions {
                      name
                      value
                    }
                  }
                  product {
                    id
                    title
                  }
                }
              }
            }
            shippingAddress {
              address1
              address2
              city
              province
              country
              zip
            }
            fulfillments {
              trackingInfo {
                company
                number
                url
              }
              estimatedDeliveryAt
              status
            }
            customer {
              id
              email
            }
          }
        }
      }
    }
  `

  // Query format: "name:1001"
  const queryString = `name:${cleanOrderName}`
  const variables = {
    name: queryString,
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  const order = data.data?.orders?.edges?.[0]?.node
  return order || null
}

/**
 * Fetch customer by email
 */
export async function fetchCustomerByEmail(
  session: ShopifySession,
  email: string
): Promise<any | null> {
  const query = `
    query getCustomer($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
            firstName
            lastName
            phone
            createdAt
            numberOfOrders
            totalSpent {
              amount
              currencyCode
            }
            addresses {
              address1
              address2
              city
              province
              country
              zip
            }
            tags
          }
        }
      }
    }
  `

  const queryString = `email:${email}`
  const variables = {
    email: queryString,
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data?.customers?.edges?.[0]?.node || null
}

/**
 * Fetch customer by customer ID (GID format)
 */
export async function fetchCustomerById(
  session: ShopifySession,
  customerId: string
): Promise<any | null> {
  // Convert numeric ID to GID format if needed
  let gid = customerId
  if (!customerId.startsWith("gid://")) {
    // If it's a numeric ID, convert to GID format
    gid = `gid://shopify/Customer/${customerId}`
  }

  const query = `
    query getCustomerById($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
        phone
        createdAt
        numberOfOrders
        totalSpent {
          amount
          currencyCode
        }
        addresses {
          address1
          address2
          city
          province
          country
          zip
        }
        tags
      }
    }
  `

  const variables = {
    id: gid,
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data?.customer || null
}

/**
 * Fetch customer orders by customer ID
 */
export async function fetchCustomerOrdersById(
  session: ShopifySession,
  customerId: string,
  limit = 10
): Promise<any[]> {
  // Convert numeric ID to GID format if needed
  let gid = customerId
  if (!customerId.startsWith("gid://")) {
    gid = `gid://shopify/Customer/${customerId}`
  }

  const query = `
    query getCustomerOrders($id: ID!, $first: Int!) {
      customer(id: $id) {
        id
        email
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
              displayFulfillmentStatus
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      title
                      price
                      selectedOptions {
                        name
                        value
                      }
                    }
                    product {
                      id
                      title
                    }
                  }
                }
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              fulfillments {
                trackingInfo {
                  company
                  number
                  url
                }
                estimatedDeliveryAt
                status
              }
            }
          }
        }
      }
    }
  `

  const variables = {
    id: gid,
    first: limit,
  }

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  const customer = data.data?.customer
  if (!customer) {
    return []
  }

  return customer.orders.edges.map((edge: any) => edge.node)
}

/**
 * Fetch store policies (shipping, refund, privacy, terms)
 */
export async function fetchStorePolicies(
  session: ShopifySession
): Promise<{
  shippingPolicy?: string
  refundPolicy?: string
  privacyPolicy?: string
  termsOfService?: string
}> {
  const query = `
    query getShopPolicies {
      shop {
        shippingPolicy {
          body
        }
        refundPolicy {
          body
        }
        privacyPolicy {
          body
        }
        termsOfService {
          body
        }
      }
    }
  `

  const response = await shopifyRequest(session, "/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`)
  }

  const data = await response.json()
  const shop = data.data?.shop || {}

  return {
    shippingPolicy: shop.shippingPolicy?.body,
    refundPolicy: shop.refundPolicy?.body,
    privacyPolicy: shop.privacyPolicy?.body,
    termsOfService: shop.termsOfService?.body,
  }
}

