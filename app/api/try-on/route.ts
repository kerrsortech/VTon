import Replicate from "replicate"
import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { detectBodyAvailabilitySync } from "@/lib/prompt-helpers"
import {
  mapCategoryToType,
  getCategoryConfig,
  requiresBodyReconstruction,
  getStudioBackground,
  getCategoryNegativePrompt,
} from "@/lib/category-system"
import { buildCategoryPrompt } from "@/lib/category-prompts"
import {
  validateUserPhoto,
  validateProductImages,
  validateProductMetadata,
  validateGeneratedImageUrl,
  sanitizeCategory,
  sanitizeDescription,
} from "@/lib/production-validators"
import {
  enhancePromptForProduction,
  enhanceBodyReconstructionInstructions,
  enhanceProductMetadata,
  validatePromptQuality,
} from "@/lib/production-enhancements"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    console.log(`[${requestId}] Try-on request started`)

    const formData = await request.formData()
    const userPhoto = formData.get("userPhoto") as File
    const productImageCount = Number.parseInt(formData.get("productImageCount") as string) || 1
    const productImages: File[] = []

    for (let i = 0; i < productImageCount; i++) {
      const productImage = formData.get(`productImage${i}`) as File
      if (productImage) {
        productImages.push(productImage)
      }
    }

    const productName = formData.get("productName") as string
    const productCategory = formData.get("productCategory") as string
    const productUrl = formData.get("productUrl") as string | null

    // Input validation
    if (!userPhoto || productImages.length === 0 || !productName) {
      console.log(`[${requestId}] Validation failed: Missing required fields`)
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "User photo, product images, and product name are required",
        },
        { status: 400 },
      )
    }

    // Validate user photo
    const userPhotoValidation = validateUserPhoto(userPhoto)
    if (!userPhotoValidation.isValid) {
      console.log(`[${requestId}] User photo validation failed:`, userPhotoValidation.errors)
      return NextResponse.json(
        {
          error: "Invalid user photo",
          details: userPhotoValidation.errors.join("; "),
          warnings: userPhotoValidation.warnings,
        },
        { status: 400 },
      )
    }

    // Validate product images
    const productImagesValidation = validateProductImages(productImages)
    if (!productImagesValidation.isValid) {
      console.log(`[${requestId}] Product images validation failed:`, productImagesValidation.errors)
      return NextResponse.json(
        {
          error: "Invalid product images",
          details: productImagesValidation.errors.join("; "),
          warnings: productImagesValidation.warnings,
        },
        { status: 400 },
      )
    }

    console.log(`[${requestId}] Try-on request received for:`, productName)
    console.log(`[${requestId}] Number of product images:`, productImages.length)
    if (userPhotoValidation.warnings.length > 0) {
      console.log(`[${requestId}] User photo warnings:`, userPhotoValidation.warnings)
    }
    if (productImagesValidation.warnings.length > 0) {
      console.log(`[${requestId}] Product images warnings:`, productImagesValidation.warnings)
    }

    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 })
    }

    // Detect body availability (using sync version for now - can be enhanced with async later)
    const userBodyAvailability = detectBodyAvailabilitySync(userPhoto)
    console.log(`[${requestId}] Detected body availability:`, userBodyAvailability)

    console.log(`[${requestId}] Analyzing product with Gemini (sending user photo + product image)...`)
    const productAnalysisFormData = new FormData()
    productAnalysisFormData.append("userPhoto", userPhoto)
    productAnalysisFormData.append("productImage", productImages[0])
    
    // Add product URL for enhanced page analysis (if available)
    // This allows Gemini to analyze the full product page for better understanding
    if (productUrl && productUrl.trim().length > 0 && productUrl.startsWith("http")) {
      productAnalysisFormData.append("productUrl", productUrl)
      console.log(`[${requestId}] Product URL provided for page analysis:`, productUrl)
    }
    
    const analysisResponse = await fetch(`${request.nextUrl.origin}/api/analyze-product`, {
      method: "POST",
      body: productAnalysisFormData,
    })

    let productMetadata
    let usedFallback = false

    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json()
      productMetadata = analysisData.metadata
      console.log(`[${requestId}] Product analysis successful`)

      // Check if page analysis was performed
      if (analysisData.pageAnalysis) {
        console.log(`[${requestId}] Product page analysis was used`)
        console.log(`[${requestId}] Page analysis summary:`, analysisData.pageAnalysis.summary?.substring(0, 100))
      }

      // Validate product metadata
      const metadataValidation = validateProductMetadata(productMetadata)
      if (metadataValidation.warnings.length > 0) {
        console.log(`[${requestId}] Product metadata warnings:`, metadataValidation.warnings)
      }

      if (analysisData.validation?.hasUnknownValues || analysisData.validation?.promptLength < 100) {
        console.log(`[${requestId}] Warning: Low quality analysis detected, using fallback`)
        usedFallback = true
      }

      // Sanitize metadata early (category config will be added later)
      productMetadata.productCategory = sanitizeCategory(productMetadata.productCategory || productCategory || "Fashion Accessory")
      productMetadata.detailedVisualDescription = sanitizeDescription(
        productMetadata.detailedVisualDescription || `${productName} - A stylish product with premium design.`,
      )
    } else {
      console.log(`[${requestId}] Product analysis failed, using fallback`)
      usedFallback = true
      const fallbackCategory = sanitizeCategory(productCategory || "Fashion Accessory")
      productMetadata = {
        productCategory: fallbackCategory,
        detailedVisualDescription: sanitizeDescription(
          `${productName} - A stylish ${fallbackCategory} with premium design and quality materials.`,
        ),
        imageGenerationPrompt: `Show the person wearing the ${fallbackCategory} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`,
        cameraHint: "Unknown",
        productScaleCategory: "Unknown",
        productScaleRatioToHead: 1.0,
        targetFraming: "Unknown",
        backgroundInstruction: "Unknown",
        positivePrompt: "Unknown",
        negativePrompt: "Unknown",
        userCharacteristics: { visibility: "Unknown", genderHint: "unknown" },
      }
    }

    console.log(`[${requestId}] Uploading images to Blob storage...`)
    const userPhotoBlob = await put(`try-on/user-${Date.now()}-${userPhoto.name}`, userPhoto, {
      access: "public",
    })

    const productImageBlobs = await Promise.all(
      productImages.map((img, idx) =>
        put(`try-on/product-${Date.now()}-${idx}-${img.name}`, img, {
          access: "public",
        }),
      ),
    )
    console.log(`[${requestId}] Images uploaded successfully`)
    console.log(`[${requestId}] Product image URLs:`, productImageBlobs.map((b) => b.url).join(", "))

    // Map detected category to our standardized category type
    const detectedCategory = productMetadata.productCategory || productCategory || "Unknown"
    const categoryType = mapCategoryToType(detectedCategory)
    const categoryConfig = getCategoryConfig(categoryType, detectedCategory)

    // Enhance metadata with category config now that it's available
    productMetadata = enhanceProductMetadata(productMetadata, productName, productCategory, categoryConfig)

    console.log(`[${requestId}] Detected category:`, detectedCategory)
    console.log(`[${requestId}] Mapped to category type:`, categoryType)
    console.log(`[${requestId}] Category config:`, JSON.stringify(categoryConfig, null, 2))

    // Determine if body reconstruction is needed
    const needsBodyReconstruction = requiresBodyReconstruction(categoryType, userBodyAvailability)
    console.log(`[${requestId}] Body reconstruction needed:`, needsBodyReconstruction)

    // Use category-specific config with fallback to Gemini analysis
    const cameraHint =
      productMetadata.cameraHint && productMetadata.cameraHint !== "Unknown"
        ? productMetadata.cameraHint
        : categoryConfig.cameraHint

    const productScaleRatio =
      productMetadata.productScaleRatioToHead && productMetadata.productScaleRatioToHead !== 1.0
        ? productMetadata.productScaleRatioToHead
        : categoryConfig.productScaleRatioToHead

    const productScaleCategory =
      productMetadata.productScaleCategory && productMetadata.productScaleCategory !== "Unknown"
        ? productMetadata.productScaleCategory
        : categoryConfig.productScaleCategory

    const targetFramingToUse =
      productMetadata.targetFraming && productMetadata.targetFraming !== "Unknown"
        ? productMetadata.targetFraming
        : categoryConfig.targetFraming

    const backgroundInstruction =
      productMetadata.backgroundInstruction && productMetadata.backgroundInstruction !== "Unknown"
        ? productMetadata.backgroundInstruction
        : getStudioBackground(categoryConfig)

    const positivePrompt =
      productMetadata.positivePrompt && productMetadata.positivePrompt !== "Unknown"
        ? productMetadata.positivePrompt
        : "photorealistic, high-resolution, professional studio lighting, sharp focus, natural skin texture, commercial product photography"

    const negativePrompt =
      productMetadata.negativePrompt && productMetadata.negativePrompt !== "Unknown"
        ? productMetadata.negativePrompt
        : getCategoryNegativePrompt(categoryType)

    console.log(`[${requestId}] Using camera hint:`, cameraHint)
    console.log(`[${requestId}] Using product scale ratio:`, productScaleRatio)
    console.log(`[${requestId}] Using product scale category:`, productScaleCategory)
    console.log(`[${requestId}] Using target framing:`, targetFramingToUse)
    console.log(`[${requestId}] Using background instruction:`, backgroundInstruction)

    const userCharacteristicsJson =
      productMetadata.userCharacteristics && typeof productMetadata.userCharacteristics === "object"
        ? JSON.stringify(productMetadata.userCharacteristics)
        : '{"visibility":"Unknown","genderHint":"unknown"}'

    console.log(`[${requestId}] Using positive prompt:`, positivePrompt.substring(0, 100) + "...")
    console.log(`[${requestId}] Using negative prompt:`, negativePrompt.substring(0, 100) + "...")
    console.log(`[${requestId}] Using user characteristics:`, userCharacteristicsJson)

    // Build category-specific prompt
    // Enhanced product description already includes page analysis if available
    let prompt = buildCategoryPrompt(categoryConfig, {
      userImageUrl: userPhotoBlob.url,
      productImageUrls: productImageBlobs.map((b) => b.url).join(", "),
      productCategory: detectedCategory,
      productDescription: productMetadata.detailedVisualDescription || sanitizeDescription(`${productName} - a stylish ${detectedCategory}`),
      genImageInstructions: productMetadata.imageGenerationPrompt || `Show the person wearing the ${detectedCategory} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`,
      userCharacteristicsJson: userCharacteristicsJson,
      cameraHint: cameraHint,
      productScaleRatio: String(productScaleRatio),
      productScaleCategory: productScaleCategory,
      targetFraming: targetFramingToUse,
      backgroundInstruction: backgroundInstruction,
      positivePrompt: positivePrompt,
      negativePrompt: negativePrompt,
    })

    // Add body reconstruction instructions if needed
    if (needsBodyReconstruction) {
      const bodyReconstructionInstructions = enhanceBodyReconstructionInstructions(
        categoryConfig,
        userBodyAvailability,
        needsBodyReconstruction,
      )
      if (bodyReconstructionInstructions) {
        prompt = bodyReconstructionInstructions + "\n\n" + prompt
        console.log(`[${requestId}] Added body reconstruction instructions`)
      }
    }

    // Enhance prompt for production quality
    const { enhancedPrompt, warnings: promptWarnings } = enhancePromptForProduction(
      prompt,
      categoryConfig,
      detectedCategory,
    )
    prompt = enhancedPrompt

    // Validate prompt quality
    const promptValidation = validatePromptQuality(prompt, categoryConfig)
    if (promptValidation.errors.length > 0) {
      console.error(`[${requestId}] Prompt validation errors:`, promptValidation.errors)
    }
    if (promptValidation.warnings.length > 0 || promptWarnings.length > 0) {
      console.log(`[${requestId}] Prompt quality warnings:`, [...promptValidation.warnings, ...promptWarnings])
    }

    console.log(`[${requestId}] Generated category-specific prompt with placeholders filled`)
    console.log(`[${requestId}] Prompt length:`, prompt.length)

    const replicate = new Replicate({ auth: apiKey })

    // The prompt still references all product URLs for context
    const imageInputArray = [userPhotoBlob.url, productImageBlobs[0].url]
    console.log(`[${requestId}] Image input array length:`, imageInputArray.length)
    console.log(`[${requestId}] Sending to SeeDream-4: user photo + first product image`)

    const input = {
      size: "2K",
      width: 2048,
      height: 2048,
      prompt: prompt,
      max_images: 1,
      image_input: imageInputArray,
      aspect_ratio: "4:3",
      sequential_image_generation: "disabled",
    }

    console.log(`[${requestId}] Calling Replicate SeeDream-4...`)

    let output
    try {
      output = await replicate.run("bytedance/seedream-4", { input })
    } catch (replicateError) {
      console.error(`[${requestId}] Replicate API error:`, replicateError)
      throw new Error(
        `Replicate API failed: ${replicateError instanceof Error ? replicateError.message : String(replicateError)}`,
      )
    }

    console.log(`[${requestId}] Replicate output received`)
    console.log(`[${requestId}] Output type:`, typeof output)
    console.log(`[${requestId}] Output is array:`, Array.isArray(output))

    let imageUrl: string | undefined

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0]
      console.log(`[${requestId}] First item type:`, typeof firstItem)

      if (typeof firstItem === "string") {
        imageUrl = firstItem
      } else if (firstItem && typeof firstItem === "object") {
        if (typeof firstItem.url === "function") {
          const urlResult = await firstItem.url()
          imageUrl = String(urlResult)
        } else if (firstItem.url) {
          imageUrl = String(firstItem.url)
        } else {
          imageUrl = String(firstItem)
        }
      } else {
        throw new Error("Unexpected output format")
      }
    } else {
      throw new Error("No output received from Replicate")
    }

    console.log(`[${requestId}] Final image URL:`, imageUrl)

    // Validate generated image URL
    const imageUrlValidation = validateGeneratedImageUrl(imageUrl)
    if (!imageUrlValidation.isValid) {
      console.error(`[${requestId}] Generated image URL validation failed:`, imageUrlValidation.errors)
      throw new Error(`Invalid generated image URL: ${imageUrlValidation.errors.join("; ")}`)
    }
    if (imageUrlValidation.warnings.length > 0) {
      console.log(`[${requestId}] Image URL warnings:`, imageUrlValidation.warnings)
    }

    return NextResponse.json({
      imageUrl,
      productName,
      metadata: {
        model: "bytedance/seedream-4",
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        productAnalysis: productMetadata,
        categorySystem: {
          detectedCategory,
          categoryType,
          categoryConfig: {
            type: categoryConfig.type,
            targetFraming: categoryConfig.targetFraming,
            cameraHint: categoryConfig.cameraHint,
            requiresFullBody: categoryConfig.requiresFullBody,
          },
          needsBodyReconstruction,
        },
        flags: {
          usedFallback,
          userBodyAvailability,
          geminiConfidence: usedFallback ? "low" : "high",
          productScaleRatio,
          productScaleCategory,
        },
      },
    })
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] Error:`, errorDetails)
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : "No stack trace")

    // Enhanced error handling
    let statusCode = 500
    let errorMessage = "Failed to generate try-on image"
    let errorType = "UNKNOWN_ERROR"

    if (errorDetails.includes("quota") || errorDetails.includes("429")) {
      statusCode = 429
      errorMessage = "API quota exceeded"
      errorType = "QUOTA_EXCEEDED"
    } else if (errorDetails.includes("timeout") || errorDetails.includes("TIMEOUT")) {
      statusCode = 504
      errorMessage = "Request timeout - image generation took too long"
      errorType = "TIMEOUT"
    } else if (errorDetails.includes("Invalid") || errorDetails.includes("validation")) {
      statusCode = 400
      errorMessage = errorDetails
      errorType = "VALIDATION_ERROR"
    } else if (errorDetails.includes("Replicate")) {
      errorType = "REPLICATE_API_ERROR"
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        errorType,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    )
  }
}
