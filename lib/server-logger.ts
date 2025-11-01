/**
 * Server-side Logger
 * Secure logging utility that hides third-party API details
 * and only exposes business-level information
 */

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  requestId?: string
  userId?: string
  [key: string]: any
}

class ServerLogger {
  private isDevelopment: boolean
  private enableStructuredLogging: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development"
    this.enableStructuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === "true"
  }

  sanitizeMessage(message: string): string {
    // Remove references to third-party APIs
    const apiPatterns = [
      /Google\s*(Gen|Generative)*AI/gi,
      /Gemini\s*API/gi,
      /Replicate\s*API/gi,
      /SeeDream/gi,
      /seedream/gi,
      /gemini-2\.0-flash-exp/gi,
      /gemini-2\.5-flash-image/gi,
      /bytedance\//gi,
    ]

    let sanitized = message
    for (const pattern of apiPatterns) {
      sanitized = sanitized.replace(pattern, "[AI Engine]")
    }

    return sanitized
  }

  private sanitizeContext(context: any): any {
    if (!context) return context

    const sanitized = { ...context }

    // Remove API keys and sensitive data
    const sensitiveKeys = ["apiKey", "api_token", "token", "auth", "key", "secret"]
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = "[REDACTED]"
      }
    }

    // Sanitize error messages
    if (sanitized.error) {
      sanitized.error = this.sanitizeError(sanitized.error)
    }

    // Sanitize message strings
    if (typeof sanitized.message === "string") {
      sanitized.message = this.sanitizeMessage(sanitized.message)
    }

    return sanitized
  }

  private sanitizeError(error: any): any {
    if (typeof error === "string") {
      return this.sanitizeMessage(error)
    }

    if (error instanceof Error) {
      const sanitizedError = new Error(this.sanitizeMessage(error.message))
      sanitizedError.name = error.name
      return sanitizedError
    }

    return error
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const sanitizedMessage = this.sanitizeMessage(message)
    const sanitizedContext = context ? this.sanitizeContext(context) : undefined

    // Always log - server-side console logs are safe (clients never see these)
    // Logs go to the terminal/server logs, not to the browser console
    const timestamp = new Date().toISOString()
    
    // Optionally use structured JSON logging for better parsing in production
    if (this.enableStructuredLogging) {
      const structuredLog = {
        timestamp,
        level: level.toUpperCase(),
        message: sanitizedMessage,
        ...sanitizedContext,
      }
      console[level](JSON.stringify(structuredLog))
    } else {
      console[level](`[${timestamp}] [Closelook Server] ${sanitizedMessage}`, sanitizedContext || "")
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context)
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context)
  }

  debug(message: string, context?: LogContext) {
    // Only show debug logs in development to reduce noise in production
    if (this.isDevelopment) {
      this.log("debug", message, context)
    }
  }
}

// Export singleton instance
export const logger = new ServerLogger()

/**
 * Sanitizes error responses before sending to client
 */
export function sanitizeErrorForClient(error: any, requestId?: string): {
  error: string
  errorType: string
  details?: string
  requestId?: string
} {
  const errorDetails = error instanceof Error ? error.message : String(error)
  const sanitizedDetails = logger.sanitizeMessage(errorDetails)

  // Don't expose quota or API-specific errors to clients
  const sanitizedError = sanitizedDetails
    .replace(/quota/i, "rate limit")
    .replace(/429/i, "rate limit")
    .replace(/exceeded/i, "limit reached")
    .replace(/replicate/i, "[Processing Service]")
    .replace(/gemini/i, "[AI Service]")
    .replace(/seedream/i, "[Generation Model]")
    .replace(/bytedance/i, "")

  // Determine generic error type
  let errorType = "PROCESSING_ERROR"
  if (sanitizedDetails.toLowerCase().includes("rate limit") || sanitizedDetails.includes("429")) {
    errorType = "RATE_LIMIT_EXCEEDED"
  } else if (sanitizedDetails.toLowerCase().includes("timeout")) {
    errorType = "REQUEST_TIMEOUT"
  } else if (sanitizedDetails.toLowerCase().includes("validation") || sanitizedDetails.toLowerCase().includes("invalid")) {
    errorType = "VALIDATION_ERROR"
  }

  const isDevelopment = process.env.NODE_ENV === "development"

  return {
    error: errorType === "RATE_LIMIT_EXCEEDED" 
      ? "Service temporarily unavailable. Please try again in a moment."
      : "Failed to process request",
    errorType,
    details: isDevelopment ? sanitizedError : undefined,
    requestId,
  }
}

// Export the class for advanced usage if needed
export { ServerLogger }

