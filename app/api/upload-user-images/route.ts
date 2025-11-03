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
    
    // Get user ID from headers or cookies
    // Priority: 
    // 1. Shopify customer ID from header (when authenticated in production)
    // 2. Anonymous user ID from cookie (for session persistence)
    // 3. Generate new anonymous ID (will be set as cookie)
    
    const shopifyCustomerId = request.headers.get("x-shopify-customer-id") || null
    let userId = shopifyCustomerId || 
                 request.headers.get("x-user-id") || 
                 request.cookies.get("closelook-user-id")?.value
    
    // If no user ID exists, generate one and prepare to set cookie
    const isNewUser = !userId
    if (!userId) {
      // Generate a secure anonymous user ID
      userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    }
    
    logger.info("User image upload request received", { requestId, userId, hasFullBody: !!fullBodyPhoto, hasHalfBody: !!halfBodyPhoto, isNewUser })

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

      logger.debug("Uploading full body photo to Blob storage", { requestId, userId })
      const timestamp = Date.now()
      const filename = `user-profiles/${userId}/full-body-${timestamp}.jpg`
      
      try {
        const blob = await put(filename, fullBodyPhoto, {
          access: "public",
          contentType: "image/jpeg",
        })
        uploadedImages.push({ type: "fullBody", url: blob.url, filename })
        logger.info("Full body photo uploaded successfully", { requestId, userId, blobUrl: blob.url })
        
        // Save to database
        try {
          const userImage: UserImage = {
            userId,
            shopifyCustomerId: shopifyCustomerId || null,
            imageType: "fullBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Full body photo saved to database", { requestId, userId })
        } catch (dbError) {
          // Log database error but don't fail the upload
          logger.warn("Failed to save full body photo to database", { requestId, userId, error: dbError })
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

      logger.debug("Uploading half body photo to Blob storage", { requestId, userId })
      const timestamp = Date.now()
      const filename = `user-profiles/${userId}/half-body-${timestamp}.jpg`
      
      try {
        const blob = await put(filename, halfBodyPhoto, {
          access: "public",
          contentType: "image/jpeg",
        })
        uploadedImages.push({ type: "halfBody", url: blob.url, filename })
        logger.info("Half body photo uploaded successfully", { requestId, userId, blobUrl: blob.url })
        
        // Save to database
        try {
          const userImage: UserImage = {
            userId,
            shopifyCustomerId: shopifyCustomerId || null,
            imageType: "halfBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Half body photo saved to database", { requestId, userId })
        } catch (dbError) {
          // Log database error but don't fail the upload
          logger.warn("Failed to save half body photo to database", { requestId, userId, error: dbError })
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
      userId,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        uploadCount: uploadedImages.length,
      },
    })

    // Set user ID cookie for new users (30 days expiration)
    if (isNewUser) {
      response.cookies.set("closelook-user-id", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })
      logger.info("Set new user ID cookie", { requestId, userId })
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

