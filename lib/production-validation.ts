/**
 * Production validation and security utilities
 * Ensures all inputs are safe and validated before processing
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: any
}

/**
 * Validate shop domain format
 * NOTE: Shop can be any domain (custom domain or myshopify.com)
 * The myshopify.com domain is only required for Shopify Admin API calls
 * When shop comes from frontend (browsing on custom domain), accept any valid domain
 */
export function validateShopDomain(shop: string | undefined | null): ValidationResult {
  if (!shop || typeof shop !== "string") {
    return { isValid: false, errors: ["Shop domain is required"] }
  }

  // Remove protocol if present
  let cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()

  // Accept any valid domain format (custom domain or myshopify.com)
  // Basic domain validation: must have at least one dot and valid characters
  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/
  
  if (!domainPattern.test(cleanShop)) {
    return { 
      isValid: false, 
      errors: ["Invalid domain format"] 
    }
  }

  return { isValid: true, errors: [], sanitized: cleanShop }
}

/**
 * Validate customer name (only for display, not for API calls)
 */
export function validateCustomerName(name: string | undefined | null): ValidationResult {
  if (!name) {
    return { isValid: true, errors: [], sanitized: undefined } // Optional field
  }

  if (typeof name !== "string") {
    return { isValid: false, errors: ["Customer name must be a string"] }
  }

  // Sanitize name - remove any potential script tags or special characters
  const sanitized = name
    .trim()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .substring(0, 100) // Max length
  
  if (sanitized.length < 1) {
    return { isValid: false, errors: ["Customer name is too short"] }
  }

  return { isValid: true, errors: [], sanitized }
}

/**
 * Validate message input
 */
export function validateMessage(message: string | undefined | null): ValidationResult {
  if (!message || typeof message !== "string") {
    return { isValid: false, errors: ["Message is required"] }
  }

  const trimmed = message.trim()
  
  if (trimmed.length === 0) {
    return { isValid: false, errors: ["Message cannot be empty"] }
  }

  if (trimmed.length > 2000) {
    return { isValid: false, errors: ["Message is too long (max 2000 characters)"] }
  }

  // Basic sanitization (don't remove all special chars, just dangerous ones)
  const sanitized = trimmed
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
  
  return { isValid: true, errors: [], sanitized }
}

/**
 * Validate conversation history
 */
export function validateConversationHistory(
  history: any[] | undefined | null
): ValidationResult {
  if (!history) {
    return { isValid: true, errors: [], sanitized: [] } // Optional
  }

  if (!Array.isArray(history)) {
    return { isValid: false, errors: ["Conversation history must be an array"] }
  }

  // Limit conversation history length
  if (history.length > 50) {
    return { isValid: false, errors: ["Conversation history is too long (max 50 messages)"] }
  }

  // Validate each message
  const sanitized: Array<{ role: string; content: string }> = []
  for (let i = 0; i < history.length; i++) {
    const msg = history[i]
    if (!msg || typeof msg !== "object") {
      continue
    }

    if (msg.role !== "user" && msg.role !== "assistant") {
      continue
    }

    const contentValidation = validateMessage(msg.content)
    if (!contentValidation.isValid) {
      continue
    }

    sanitized.push({
      role: msg.role,
      content: contentValidation.sanitized || "",
    })
  }

  return { isValid: true, errors: [], sanitized }
}

/**
 * Validate customer internal data (for API calls only, not exposed to chat)
 */
export function validateCustomerInternal(data: any): ValidationResult {
  if (!data || typeof data !== "object") {
    return { isValid: true, errors: [], sanitized: undefined } // Optional
  }

  const sanitized: any = {}

  if (data.id && typeof data.id === "string") {
    // Validate GID format
    if (data.id.startsWith("gid://shopify/")) {
      sanitized.id = data.id.substring(0, 200)
    }
  }

  if (data.email && typeof data.email === "string") {
    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailPattern.test(data.email)) {
      sanitized.email = data.email.substring(0, 255)
    }
  }

  if (data.accessToken && typeof data.accessToken === "string") {
    sanitized.accessToken = data.accessToken.substring(0, 500)
  }

  return { isValid: true, errors: [], sanitized }
}

/**
 * Sanitize and validate all chat API inputs
 */
export function validateChatInput(data: {
  message?: any
  conversationHistory?: any
  shop?: any
  customerName?: any
  customerInternal?: any
  pageContext?: any
  currentProduct?: any
  allProducts?: any
}): { isValid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = []
  const sanitized: any = {}

  // Validate message
  const messageValidation = validateMessage(data.message)
  if (!messageValidation.isValid) {
    errors.push(...messageValidation.errors)
  } else {
    sanitized.message = messageValidation.sanitized
  }

  // Validate shop domain
  if (data.shop) {
    const shopValidation = validateShopDomain(data.shop)
    if (!shopValidation.isValid) {
      errors.push(...shopValidation.errors)
    } else {
      sanitized.shop = shopValidation.sanitized
    }
  }

  // Validate customer name
  const nameValidation = validateCustomerName(data.customerName)
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors)
  } else {
    sanitized.customerName = nameValidation.sanitized
  }

  // Validate customer internal
  const internalValidation = validateCustomerInternal(data.customerInternal)
  sanitized.customerInternal = internalValidation.sanitized

  // Validate conversation history
  const historyValidation = validateConversationHistory(data.conversationHistory)
  if (!historyValidation.isValid) {
    errors.push(...historyValidation.errors)
  } else {
    sanitized.conversationHistory = historyValidation.sanitized
  }

  // Validate page context
  if (data.pageContext && typeof data.pageContext === "string") {
    const allowedContexts = ["home", "product", "other"]
    if (allowedContexts.includes(data.pageContext)) {
      sanitized.pageContext = data.pageContext
    } else {
      sanitized.pageContext = "other"
    }
  }

  // Products validation (optional, but if present should be array)
  if (data.allProducts !== undefined) {
    if (Array.isArray(data.allProducts)) {
      sanitized.allProducts = data.allProducts.slice(0, 1000) // Limit to 1000 products
    } else {
      sanitized.allProducts = []
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  }
}

