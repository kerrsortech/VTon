import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/server-logger"
import { getUserImages } from "@/lib/db/user-images"
import { addCorsHeaders, createCorsPreflightResponse } from "@/lib/cors-headers"

/**
 * OPTIONS /api/user-images
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request)
}

/**
 * GET /api/user-images
 * Retrieve user images by user ID or Shopify customer ID
 * 
 * Headers:
 * - x-shopify-customer-id: Shopify customer ID (priority)
 * - x-user-id: User ID
 * 
 * Cookies:
 * - closelook-user-id: Anonymous user ID
 */
export async function GET(request: NextRequest) {
  const requestId = `get-images-${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    logger.info("Get user images request started", { requestId })

    // Get Shopify customer ID from header (preferred for authenticated users)
    const shopifyCustomerId = request.headers.get("x-shopify-customer-id") || undefined
    
    // Fallback to user ID from header or cookie (for anonymous users)
    const userId = request.headers.get("x-user-id") || 
                   request.cookies.get("closelook-user-id")?.value ||
                   undefined

    // Require at least one form of user identification
    if (!shopifyCustomerId && !userId) {
      logger.warn("No user ID provided", { requestId })
      const response = NextResponse.json(
        {
          error: "User identification required",
          details: "Please upload an image first or sign in to your Shopify account.",
        },
        { status: 401 },
      )
      return addCorsHeaders(response, request)
    }
    
    // Prefer Shopify customer ID over anonymous user ID
    const effectiveUserId = shopifyCustomerId || userId

    logger.debug("Fetching user images from database", { requestId, userId, shopifyCustomerId, effectiveUserId })

    try {
      const userImages = await getUserImages(shopifyCustomerId ? undefined : userId, shopifyCustomerId)
      
      logger.info("User images retrieved successfully", { 
        requestId, 
        userId, 
        shopifyCustomerId,
        hasFullBody: !!userImages.fullBodyUrl,
        hasHalfBody: !!userImages.halfBodyUrl,
      })

      const response = NextResponse.json({
        success: true,
        images: userImages,
        userId: effectiveUserId,
        shopifyCustomerId: shopifyCustomerId || null,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      })
      return addCorsHeaders(response, request)
    } catch (dbError) {
      logger.error("Database error while fetching user images", { 
        requestId, 
        error: dbError instanceof Error ? dbError.message : String(dbError),
      })
      
      // If database is not configured, return empty result instead of error
      // This allows the system to work without database (graceful degradation)
      if (dbError instanceof Error && dbError.message.includes("database connection")) {
        logger.warn("Database not configured, returning empty images", { requestId })
        const response = NextResponse.json({
          success: true,
          images: {},
          userId: effectiveUserId,
          shopifyCustomerId: shopifyCustomerId || null,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            warning: "Database not configured",
          },
        })
        return addCorsHeaders(response, request)
      }
      
      throw dbError
    }
  } catch (error) {
    logger.error("Get user images request failed", { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
    })
    
    const response = NextResponse.json(
      {
        error: "Failed to retrieve user images",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        requestId,
      },
      { status: 500 },
    )
    return addCorsHeaders(response, request)
  }
}

export const config = {
  maxDuration: 30,
}

