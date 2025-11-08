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
    
    // Get Shopify customer ID from header (REQUIRED for authenticated users)
    const shopifyCustomerId = request.headers.get("x-shopify-customer-id") || undefined
    
    // Get Shopify customer username from header
    const shopifyCustomerUsername = request.headers.get("x-shopify-customer-username") || undefined
    
    // REQUIRE authentication: Only logged-in Shopify users can upload images
    if (!shopifyCustomerId) {
      logger.warn("Authentication required: No Shopify customer ID provided", { requestId })
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "Please log in to your Shopify account to upload images. Only logged-in users can upload photos.",
        },
        { status: 401 },
      )
    }
    
    // Use Shopify customer ID as the effective user ID
    const effectiveUserId = shopifyCustomerId
    
    logger.info("User image upload request received", { 
      requestId, 
      userId: effectiveUserId, 
      shopifyCustomerId,
      username: shopifyCustomerUsername,
      hasFullBody: !!fullBodyPhoto, 
      hasHalfBody: !!halfBodyPhoto,
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
            username: shopifyCustomerUsername || null,
            imageType: "fullBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Full body photo saved to database", { requestId, userId: effectiveUserId, username: shopifyCustomerUsername })
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
            username: shopifyCustomerUsername || null,
            imageType: "halfBody",
            imageUrl: blob.url,
            blobFilename: filename,
          }
          await saveUserImage(userImage)
          logger.info("Half body photo saved to database", { requestId, userId: effectiveUserId, username: shopifyCustomerUsername })
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
      username: shopifyCustomerUsername,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        uploadCount: uploadedImages.length,
      },
    })

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

