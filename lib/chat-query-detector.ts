/**
 * Helper functions to detect different types of queries in chatbot messages
 */

/**
 * Detect if query is about order status or order history
 */
export function isOrderQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const orderKeywords = [
    "order",
    "orders",
    "ordered",
    "purchase",
    "purchased",
    "delivery",
    "delivered",
    "track",
    "tracking",
    "shipment",
    "shipped",
    "fulfill",
    "status",
    "when will",
    "where is",
    "my order",
    "order number",
    "order #",
  ]
  
  return orderKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Detect if query is about store policies
 */
export function isPolicyQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const policyKeywords = [
    "policy",
    "policies",
    "shipping",
    "return",
    "refund",
    "exchange",
    "warranty",
    "terms",
    "conditions",
    "privacy",
    "faq",
    "frequently asked",
    "how to return",
    "return policy",
    "refund policy",
    "shipping policy",
    "delivery policy",
  ]
  
  return policyKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Detect if query is about account information
 */
export function isAccountQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const accountKeywords = [
    "account",
    "profile",
    "my info",
    "my information",
    "customer",
    "previous order",
    "past order",
    "order history",
    "purchase history",
    "what did i buy",
    "my purchases",
    "my size",
    "size i ordered",
  ]
  
  return accountKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Extract order number from message (e.g., "#1001", "1001", "order 1001")
 */
export function extractOrderNumber(message: string): string | null {
  // Match patterns like #1001, order 1001, order#1001, etc.
  const patterns = [
    /#(\d+)/,                    // #1001
    /order\s*#?(\d+)/i,          // order #1001 or order1001
    /order\s+(\d+)/i,            // order 1001
    /number\s*#?(\d+)/i,         // number #1001
  ]
  
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Extract email from message
 */
export function extractEmail(message: string): string | null {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const match = message.match(emailPattern)
  return match ? match[0] : null
}

/**
 * Determine query type
 */
export interface QueryType {
  isOrder: boolean
  isPolicy: boolean
  isAccount: boolean
  orderNumber: string | null
  email: string | null
}

export function detectQueryType(message: string): QueryType {
  return {
    isOrder: isOrderQuery(message),
    isPolicy: isPolicyQuery(message),
    isAccount: isAccountQuery(message),
    orderNumber: extractOrderNumber(message),
    email: extractEmail(message),
  }
}

