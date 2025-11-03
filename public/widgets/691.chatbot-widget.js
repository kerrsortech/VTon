"use strict";
(self["webpackChunkCloselookChatbotWidget"] = self["webpackChunkCloselookChatbotWidget"] || []).push([[691],{

/***/ 691:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  detectShopifyCustomer: () => (/* binding */ detectShopifyCustomer)
});

;// ../../lib/server-logger.ts
/**
 * Server-side Logger
 * Secure logging utility that hides third-party API details
 * and only exposes business-level information
 */
class ServerLogger {
    constructor() {
        this.isDevelopment = "production" === "development";
        this.enableStructuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === "true";
    }
    sanitizeMessage(message) {
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
        ];
        let sanitized = message;
        for (const pattern of apiPatterns) {
            sanitized = sanitized.replace(pattern, "[AI Engine]");
        }
        return sanitized;
    }
    sanitizeContext(context) {
        if (!context)
            return context;
        const sanitized = { ...context };
        // Remove API keys and sensitive data
        const sensitiveKeys = ["apiKey", "api_token", "token", "auth", "key", "secret"];
        for (const key of sensitiveKeys) {
            if (sanitized[key]) {
                sanitized[key] = "[REDACTED]";
            }
        }
        // Sanitize error messages
        if (sanitized.error) {
            sanitized.error = this.sanitizeError(sanitized.error);
        }
        // Sanitize message strings
        if (typeof sanitized.message === "string") {
            sanitized.message = this.sanitizeMessage(sanitized.message);
        }
        return sanitized;
    }
    sanitizeError(error) {
        if (typeof error === "string") {
            return this.sanitizeMessage(error);
        }
        if (error instanceof Error) {
            const sanitizedError = new Error(this.sanitizeMessage(error.message));
            sanitizedError.name = error.name;
            return sanitizedError;
        }
        return error;
    }
    log(level, message, context) {
        const sanitizedMessage = this.sanitizeMessage(message);
        const sanitizedContext = context ? this.sanitizeContext(context) : undefined;
        // Always log - server-side console logs are safe (clients never see these)
        // Logs go to the terminal/server logs, not to the browser console
        const timestamp = new Date().toISOString();
        // Optionally use structured JSON logging for better parsing in production
        if (this.enableStructuredLogging) {
            const structuredLog = {
                timestamp,
                level: level.toUpperCase(),
                message: sanitizedMessage,
                ...sanitizedContext,
            };
            console[level](JSON.stringify(structuredLog));
        }
        else {
            console[level](`[${timestamp}] [Closelook Server] ${sanitizedMessage}`, sanitizedContext || "");
        }
    }
    info(message, context) {
        this.log("info", message, context);
    }
    warn(message, context) {
        this.log("warn", message, context);
    }
    error(message, context) {
        this.log("error", message, context);
    }
    debug(message, context) {
        // Only show debug logs in development to reduce noise in production
        if (this.isDevelopment) {
            this.log("debug", message, context);
        }
    }
}
// Export singleton instance
const logger = new ServerLogger();
/**
 * Sanitizes error responses before sending to client
 */
function sanitizeErrorForClient(error, requestId) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    const sanitizedDetails = logger.sanitizeMessage(errorDetails);
    // Don't expose quota or API-specific errors to clients
    const sanitizedError = sanitizedDetails
        .replace(/quota/i, "rate limit")
        .replace(/429/i, "rate limit")
        .replace(/exceeded/i, "limit reached")
        .replace(/replicate/i, "[Processing Service]")
        .replace(/gemini/i, "[AI Service]")
        .replace(/seedream/i, "[Generation Model]")
        .replace(/bytedance/i, "");
    // Determine generic error type
    let errorType = "PROCESSING_ERROR";
    if (sanitizedDetails.toLowerCase().includes("rate limit") || sanitizedDetails.includes("429")) {
        errorType = "RATE_LIMIT_EXCEEDED";
    }
    else if (sanitizedDetails.toLowerCase().includes("timeout")) {
        errorType = "REQUEST_TIMEOUT";
    }
    else if (sanitizedDetails.toLowerCase().includes("validation") || sanitizedDetails.toLowerCase().includes("invalid")) {
        errorType = "VALIDATION_ERROR";
    }
    const isDevelopment = "production" === "development";
    return {
        error: errorType === "RATE_LIMIT_EXCEEDED"
            ? "Service temporarily unavailable. Please try again in a moment."
            : "Failed to process request",
        errorType,
        details: isDevelopment ? sanitizedError : undefined,
        requestId,
    };
}
// Export the class for advanced usage if needed


;// ../../lib/shopify/customer-detector.ts
/**
 * Helper to detect customer context from Shopify storefront
 * Checks for customer information in Shopify storefront context
 */

/**
 * Detect customer from Shopify storefront context
 * Checks for window.Shopify.customer or customer access token
 */
function detectShopifyCustomer() {
    if (typeof window === "undefined") {
        return { isLoggedIn: false };
    }
    try {
        // Method 1: Check window.Shopify.customer (if available)
        const shopify = window.Shopify;
        if (shopify?.customer) {
            const firstName = shopify.customer.first_name;
            const lastName = shopify.customer.last_name;
            const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
            return {
                name: name || undefined,
                isLoggedIn: !!shopify.customer.email,
                _internal: {
                    id: shopify.customer.id?.toString(),
                    email: shopify.customer.email,
                },
            };
        }
        // Method 2: Check for customer name from cookies or meta tags
        const customerName = getCookie("customer_name") ||
            document.querySelector('meta[name="shopify-customer-name"]')?.getAttribute("content");
        if (customerName) {
            return {
                name: customerName,
                isLoggedIn: true,
            };
        }
        // Method 3: Check for customer ID in meta tags (if present) - for internal use only
        const customerMeta = document.querySelector('meta[name="shopify-customer-id"]');
        const customerAccessToken = getCookie("customer_access_token") ||
            getCookie("customer_auth_token");
        if (customerMeta || customerAccessToken) {
            const customerId = customerMeta?.getAttribute("content");
            return {
                isLoggedIn: true,
                _internal: {
                    id: customerId || undefined,
                    accessToken: customerAccessToken || undefined,
                },
            };
        }
        // Method 4: Check document for customer data in Shopify theme
        try {
            const themeCustomer = window.customer || document.customer;
            if (themeCustomer) {
                const firstName = themeCustomer.first_name || themeCustomer.firstName;
                const lastName = themeCustomer.last_name || themeCustomer.lastName;
                const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
                return {
                    name: name || undefined,
                    isLoggedIn: !!(themeCustomer.email || themeCustomer.id),
                    _internal: {
                        id: themeCustomer.id?.toString(),
                        email: themeCustomer.email,
                    },
                };
            }
        }
        catch (e) {
            // Ignore errors
        }
        return { isLoggedIn: false };
    }
    catch (error) {
        logger.debug("Error detecting Shopify customer", { error: error instanceof Error ? error.message : String(error) });
        return { isLoggedIn: false };
    }
}
/**
 * Get cookie value by name
 */
function getCookie(name) {
    if (typeof document === "undefined")
        return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
    }
    return null;
}


/***/ })

}]);