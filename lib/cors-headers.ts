import { NextRequest, NextResponse } from "next/server"

/**
 * Check if origin is allowed (Shopify domains)
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  // Allow all Shopify domains (*.myshopify.com)
  if (origin.includes(".myshopify.com")) {
    return true
  }
  
  // Allow specific domains for development/testing
  if (
    origin === "https://vt-test-5.myshopify.com" ||
    origin.includes("localhost") || // For local development
    origin.includes("127.0.0.1") // For local development
  ) {
    return true
  }
  
  return false
}

/**
 * Add CORS headers to response for Shopify domains
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const origin = request.headers.get("origin")
  
  if (isAllowedOrigin(origin) && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-shopify-customer-id, x-user-id, x-shopify-shop"
    )
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Max-Age", "86400") // 24 hours
  }
  
  return response
}

/**
 * Create CORS preflight response
 */
export function createCorsPreflightResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  const response = new NextResponse(null, { status: 204 })
  
  if (isAllowedOrigin(origin) && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-shopify-customer-id, x-user-id, x-shopify-shop"
    )
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Max-Age", "86400")
  }
  
  return response
}

