import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/server-logger"
import { validateUserPhoto } from "@/lib/production-validators"
import { saveUserImage, type UserImage } from "@/lib/db/user-images"
import { addCorsHeaders, createCorsPreflightResponse } from "@/lib/cors-headers"

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestId = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    logger.info("User image upload request started", { requestId })

    const formData = await request.formData()
    const fullBodyPhoto = formData.get("fullBodyPhoto") as File | null
    const halfBodyPhoto = formData.get("halfBodyPhoto") as File | null
    
    // Get Shopify customer ID from header (preferred for authenticated users)
    const shopifyCustomerId = request.headers.get("x-shopify-customer-id") || undefined
    
    // Get or create anonymous user ID from cookie (for unauthenticated users)
    let userId = request.cookies.get("closelook-user-id")?.value
    
    // If no user ID exists, create a new anonymous user ID
    const isNewUser = !userId
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`
    }
    
    // Prefer Shopify customer ID over anonymous user ID
    const effectiveUserId = shopifyCustomerId || userId
    
    logger.info("User image upload request received", { 
      requestId, 
      userId: effectiveUserId, 
      shopifyCustomerId,
      hasFullBody: !!fullBodyPhoto, 
      hasHalfBody: !!halfBodyPhoto,
      isNewUser
    })

    // Validate that at least one image is provided
    if (!fullBodyPhoto && !halfBodyPhoto) {
      logger.warn("Validation failed: No images provided", { requestId })
      return NextResponse.json(
        {
          error: "No images provided",
          details: "Please upload at least one image (full body or half body)",
        },
        { status: 400 },
      )
    }

    const uploadedImages: { type: string; url: string; filename: string }[] = []

    // Upload full body photo if provided
    if (fullBodyPhoto) {
      const validation = validateUserPhoto(fullBodyPhoto)
      if (!validation.isValid) {
        logger.warn("Full body photo validation failed", { requestId, errors: validation.errors })
        return NextResponse.json(
          {
            error: "Invalid full body photo",
            details: validation.errors.join("; "),
          },
          { status: 400 },
        )
      }

      logger.debug("Uploading full body photo to Blob storage", { requestId, userId: effectiveUserId })
      const timestamp = Date.now()
      const filename = `user-profiles/${effectiveUserId}/full-body-${timestamp}.jpg`
      
      try {
        const blob = await put(filename, fullBodyPhoto, {
          access: "public",
          contentType: "image/jpeg",
        })
        uploadedImages.push({ type: "fullBody", url: blob.url, filename })
        logger.info("Full body photo uploaded successfully", { requestId, userId: effectiveUserId, blobUrl: blob.url })
        
        // Save to database
        try {
          const userImage: UserImage = {
            userId: effectiveUserId,
            shopifyCustomerId: shopifyCustomerId || null,
            imageType: "fullBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Full body photo saved to database", { requestId, userId: effectiveUserId })
        } catch (dbError) {
          // Log database error but don't fail the upload
          logger.warn("Failed to save full body photo to database", { requestId, userId: effectiveUserId, error: dbError })
        }
      } catch (error) {
        logger.error("Failed to upload full body photo", { requestId, error })
        throw new Error("Failed to upload full body photo to storage")
      }
    }

    // Upload half body photo if provided
    if (halfBodyPhoto) {
      const validation = validateUserPhoto(halfBodyPhoto)
      if (!validation.isValid) {
        logger.warn("Half body photo validation failed", { requestId, errors: validation.errors })
        return NextResponse.json(
          {
            error: "Invalid half body photo",
            details: validation.errors.join("; "),
          },
          { status: 400 },
        )
      }

      logger.debug("Uploading half body photo to Blob storage", { requestId, userId: effectiveUserId })
      const timestamp = Date.now()
      const filename = `user-profiles/${effectiveUserId}/half-body-${timestamp}.jpg`
      
      try {
        const blob = await put(filename, halfBodyPhoto, {
          access: "public",
          contentType: "image/jpeg",
        })
        uploadedImages.push({ type: "halfBody", url: blob.url, filename })
        logger.info("Half body photo uploaded successfully", { requestId, userId: effectiveUserId, blobUrl: blob.url })
        
        // Save to database
        try {
          const userImage: UserImage = {
            userId: effectiveUserId,
            shopifyCustomerId: shopifyCustomerId || null,
            imageType: "halfBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Half body photo saved to database", { requestId, userId: effectiveUserId })
        } catch (dbError) {
          // Log database error but don't fail the upload
          logger.warn("Failed to save half body photo to database", { requestId, userId: effectiveUserId, error: dbError })
        }
      } catch (error) {
        logger.error("Failed to upload half body photo", { requestId, error })
        throw new Error("Failed to upload half body photo to storage")
      }
    }

    // Prepare response
    const response = NextResponse.json({
      success: true,
      images: uploadedImages,
      userId: effectiveUserId,
      shopifyCustomerId,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        uploadCount: uploadedImages.length,
      },
    })

    // Set cookie for anonymous users (only if no Shopify customer ID)
    // This allows subsequent requests to identify the user
    if (!shopifyCustomerId) {
      const origin = request.headers.get("origin")
      const isHttps = origin?.startsWith("https://") || false
      const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1") || false
      
      // For cross-origin requests, use SameSite=None with Secure
      // For same-origin/localhost, use SameSite=Lax (more permissive)
      const cookieOptions: {
        httpOnly: boolean
        secure: boolean
        sameSite: "none" | "lax"
        path: string
        maxAge: number
      } = {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        secure: isHttps || process.env.NODE_ENV === "production",
        sameSite: (isHttps && !isLocalhost) ? "none" : "lax", // Use "none" for cross-origin HTTPS, "lax" for localhost
      }
      
      response.cookies.set("closelook-user-id", userId, cookieOptions)
      
      if (isNewUser) {
        logger.info("Set new user ID cookie", { requestId, userId, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure })
      } else {
        logger.debug("Updated user ID cookie", { requestId, userId })
      }
    }

    return addCorsHeaders(response, request)
  } catch (error) {
    logger.error("User image upload request failed", { requestId, error: error instanceof Error ? error.message : String(error) })
    
    const response = NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        requestId,
      },
      { status: 500 },
    )

    return addCorsHeaders(response, request)
  }
}

export const config = {
  maxDuration: 60,
}

