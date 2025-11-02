/**
 * Shopify Storefront API client for customer-related queries
 * Used when customer is logged in on the Shopify storefront
 */

import { logger } from "../server-logger"

export interface CustomerInfo {
  id: string
  email: string
  firstName?: string
  lastName?: string
  numberOfOrders?: number
}

/**
 * Fetch customer info using Storefront API
 * Requires customer access token from Shopify storefront
 */
export async function fetchCustomerFromStorefront(
  storefrontDomain: string,
  storefrontToken: string,
  customerAccessToken?: string
): Promise<CustomerInfo | null> {
  if (!customerAccessToken) {
    return null
  }

  const query = `
    query getCustomer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        email
        firstName
        lastName
        numberOfOrders
      }
    }
  `

  try {
    const response = await fetch(
      `https://${storefrontDomain}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query,
          variables: { customerAccessToken },
        }),
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.data?.customer || null
  } catch (error) {
    logger.debug("Failed to fetch customer from storefront", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Fetch customer orders using Storefront API
 */
export async function fetchCustomerOrdersFromStorefront(
  storefrontDomain: string,
  storefrontToken: string,
  customerAccessToken: string,
  first = 10
): Promise<any[]> {
  const query = `
    query getCustomerOrders($customerAccessToken: String!, $first: Int!) {
      customer(customerAccessToken: $customerAccessToken) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              orderNumber
              createdAt
              fulfillmentStatus
              financialStatus
              totalPrice {
                amount
                currencyCode
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      title
                      selectedOptions {
                        name
                        value
                      }
                      price {
                        amount
                        currencyCode
                      }
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
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(
      `https://${storefrontDomain}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query,
          variables: { customerAccessToken, first },
        }),
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const customer = data.data?.customer
    if (!customer) {
      return []
    }

    return customer.orders.edges.map((edge: any) => edge.node)
  } catch (error) {
    logger.debug("Failed to fetch customer orders from storefront", { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

