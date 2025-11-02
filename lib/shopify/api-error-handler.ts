/**
 * Shopify API error handling and retry logic
 * Handles API failures gracefully with retries and proper error messages
 */

export interface ApiError {
  message: string
  code?: string
  retryable: boolean
  statusCode?: number
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false

  const statusCode = error.statusCode || error.status
  
  // Retryable HTTP status codes
  if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
    return true
  }

  // Network errors are retryable
  if (error.message?.includes("network") || error.message?.includes("timeout")) {
    return true
  }

  return false
}

/**
 * Extract meaningful error message from Shopify API response
 */
export function extractShopifyError(error: any): ApiError {
  if (!error) {
    return {
      message: "Unknown error occurred",
      retryable: false,
    }
  }

  // Handle response object
  if (error.response) {
    const statusCode = error.response.status
    const data = error.response.data

    // Shopify GraphQL errors
    if (data?.errors) {
      const firstError = data.errors[0]
      return {
        message: firstError.message || "Shopify API error",
        code: firstError.extensions?.code,
        retryable: isRetryableError({ statusCode }),
        statusCode,
      }
    }

    // HTTP errors
    return {
      message: error.response.statusText || `HTTP ${statusCode} error`,
      retryable: isRetryableError({ statusCode }),
      statusCode,
    }
  }

  // Handle error with status code
  if (error.statusCode || error.status) {
    const statusCode = error.statusCode || error.status
    return {
      message: error.message || `HTTP ${statusCode} error`,
      retryable: isRetryableError({ statusCode }),
      statusCode,
    }
  }

  // Generic error
  return {
    message: error.message || "Unknown error occurred",
    retryable: false,
  }
}

/**
 * Retry API call with exponential backoff
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error
      const apiError = extractShopifyError(error)

      // Don't retry if not retryable or last attempt
      if (!apiError.retryable || attempt === maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Add timeout to API call
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("API request timeout")), timeoutMs)
  )

  return Promise.race([promise, timeout])
}

