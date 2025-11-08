/**
 * Helper to detect customer context from Shopify storefront
 * Checks for customer information in Shopify storefront context
 */

import { logger } from "../server-logger"

export interface DetectedCustomer {
  name?: string // Customer name for personalization (e.g., "John" or "John Doe")
  isLoggedIn: boolean
  // Internal fields (not exposed to chat API)
  _internal?: {
    id?: string
    email?: string
    accessToken?: string
  }
}

/**
 * Detect customer from Shopify storefront context
 * Checks for window.Shopify.customer or customer access token
 */
export function detectShopifyCustomer(): DetectedCustomer {
  if (typeof window === "undefined") {
    return { isLoggedIn: false }
  }

  try {
    // Method 1: Check window.Shopify.customer (if available)
    const shopify = (window as any).Shopify
    if (shopify?.customer) {
      const firstName = shopify.customer.first_name
      const lastName = shopify.customer.last_name
      const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined
      
      return {
        name: name || undefined,
        isLoggedIn: !!shopify.customer.email,
        _internal: {
          id: shopify.customer.id?.toString(),
          email: shopify.customer.email,
        },
      }
    }

    // Method 2: Check for customer name from cookies or meta tags
    const customerName = getCookie("customer_name") || 
                         document.querySelector('meta[name="shopify-customer-name"]')?.getAttribute("content")
    
    if (customerName) {
      return {
        name: customerName,
        isLoggedIn: true,
      }
    }

    // Method 3: Check for customer ID in meta tags (if present) - for internal use only
    const customerMeta = document.querySelector('meta[name="shopify-customer-id"]')
    const customerAccessToken = getCookie("customer_access_token") || 
                               getCookie("customer_auth_token")
    
    // Method 3b: Check __st object (Shopify analytics) - often available even in test accounts
    let customerIdFromSt: string | undefined = undefined
    if (typeof (window as any).__st !== "undefined" && (window as any).__st?.cid) {
      const cid = (window as any).__st.cid
      if (cid && cid !== "0") {
        customerIdFromSt = cid.toString()
      }
    }
    
    if (customerMeta || customerAccessToken || customerIdFromSt) {
      const customerId = customerMeta?.getAttribute("content") || customerIdFromSt
      return {
        isLoggedIn: true,
        _internal: {
          id: customerId || undefined,
          accessToken: customerAccessToken || undefined,
        },
      }
    }

    // Method 4: Check document for customer data in Shopify theme
    try {
      const themeCustomer = (window as any).customer || (document as any).customer
      if (themeCustomer) {
        const firstName = themeCustomer.first_name || themeCustomer.firstName
        const lastName = themeCustomer.last_name || themeCustomer.lastName
        const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined
        
        return {
          name: name || undefined,
          isLoggedIn: !!(themeCustomer.email || themeCustomer.id),
          _internal: {
            id: themeCustomer.id?.toString(),
            email: themeCustomer.email,
          },
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return { isLoggedIn: false }
  } catch (error) {
    logger.debug("Error detecting Shopify customer", { error: error instanceof Error ? error.message : String(error) })
    return { isLoggedIn: false }
  }
}

/**
 * Get Shopify customer ID from multiple sources
 * This is a more robust method that checks multiple locations where Shopify stores customer ID
 */
export function getShopifyCustomerId(): string | null {
  if (typeof window === "undefined") return null
  
  try {
    // Method 1: window.Shopify.customer (most reliable)
    if ((window as any).Shopify?.customer?.id) {
      return (window as any).Shopify.customer.id.toString()
    }
    
    // Method 2: Check __st object (Shopify analytics) - often available even in test accounts
    if (typeof (window as any).__st !== "undefined" && (window as any).__st?.cid) {
      const cid = (window as any).__st.cid
      if (cid && cid !== "0") {
        return cid.toString()
      }
    }
    
    // Method 3: Check meta tag
    if (typeof document !== "undefined") {
      const customerMeta = document.querySelector('meta[name="customer-id"], meta[name="shopify-customer-id"]')
      if (customerMeta) {
        const customerId = customerMeta.getAttribute("content")
        if (customerId && customerId !== "0") {
          return customerId
        }
      }
    }
    
    // Method 4: Check cookies for customer ID
    const customerIdCookie = getCookie("customer_id") || getCookie("shopify_customer_id")
    if (customerIdCookie && customerIdCookie !== "0") {
      return customerIdCookie
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Get Shopify customer username (first name + last name)
 */
export function getShopifyCustomerUsername(): string | null {
  if (typeof window === "undefined") return null
  
  try {
    // Method 1: window.Shopify.customer (most reliable)
    if ((window as any).Shopify?.customer) {
      const firstName = (window as any).Shopify.customer.first_name || ""
      const lastName = (window as any).Shopify.customer.last_name || ""
      const name = `${firstName} ${lastName}`.trim()
      if (name) {
        return name
      }
    }
    
    // Method 2: Check meta tag
    if (typeof document !== "undefined") {
      const customerNameMeta = document.querySelector('meta[name="shopify-customer-name"]')
      if (customerNameMeta) {
        const customerName = customerNameMeta.getAttribute("content")
        if (customerName && customerName.trim()) {
          return customerName.trim()
        }
      }
      
      // Also check for customer first/last name in separate meta tags
      const firstNameMeta = document.querySelector('meta[name="shopify-customer-first-name"]')
      const lastNameMeta = document.querySelector('meta[name="shopify-customer-last-name"]')
      if (firstNameMeta || lastNameMeta) {
        const firstName = firstNameMeta?.getAttribute("content") || ""
        const lastName = lastNameMeta?.getAttribute("content") || ""
        const name = `${firstName} ${lastName}`.trim()
        if (name) {
          return name
        }
      }
    }
    
    // Method 3: Check cookie
    const customerName = getCookie("customer_name")
    if (customerName && customerName.trim()) {
      return customerName.trim()
    }
    
    // Method 4: Check localStorage (some themes store customer info here)
    try {
      const storedCustomer = localStorage.getItem("shopify_customer")
      if (storedCustomer) {
        const customer = JSON.parse(storedCustomer)
        if (customer) {
          const firstName = customer.first_name || customer.firstName || ""
          const lastName = customer.last_name || customer.lastName || ""
          const name = `${firstName} ${lastName}`.trim()
          if (name) {
            return name
          }
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Method 5: Check window.customer or document.customer (theme-specific)
    try {
      const themeCustomer = (window as any).customer || (document as any).customer
      if (themeCustomer) {
        const firstName = themeCustomer.first_name || themeCustomer.firstName || ""
        const lastName = themeCustomer.last_name || themeCustomer.lastName || ""
        const name = `${firstName} ${lastName}`.trim()
        if (name) {
          return name
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null
  }
  return null
}

