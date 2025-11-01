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
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    logger.info("Try-on request started", { requestId })

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
      logger.warn("Validation failed: Missing required fields", { requestId })
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
      logger.warn("User photo validation failed", { requestId, errors: userPhotoValidation.errors })
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
      logger.warn("Product images validation failed", { requestId, errors: productImagesValidation.errors })
      return NextResponse.json(
        {
          error: "Invalid product images",
          details: productImagesValidation.errors.join("; "),
          warnings: productImagesValidation.warnings,
        },
        { status: 400 },
      )
    }

    logger.info("Try-on request received", { requestId, productName, imageCount: productImages.length })
    if (userPhotoValidation.warnings.length > 0) {
      logger.warn("User photo warnings", { requestId, warnings: userPhotoValidation.warnings })
    }
    if (productImagesValidation.warnings.length > 0) {
      logger.warn("Product images warnings", { requestId, warnings: productImagesValidation.warnings })
    }

    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      logger.error("Image generation service configuration missing")
      return NextResponse.json({ error: "Configuration error" }, { status: 500 })
    }

    // Detect body availability (using sync version for now - can be enhanced with async later)
    const userBodyAvailability = detectBodyAvailabilitySync(userPhoto)
    logger.debug("Detected body availability", { requestId, bodyAvailability: userBodyAvailability })

    logger.info("Analyzing product", { requestId })
    const productAnalysisFormData = new FormData()
    productAnalysisFormData.append("userPhoto", userPhoto)
    productAnalysisFormData.append("productImage", productImages[0])
    
    // Add product URL for enhanced page analysis (if available)
    if (productUrl && productUrl.trim().length > 0 && productUrl.startsWith("http")) {
      productAnalysisFormData.append("productUrl", productUrl)
      logger.debug("Product URL provided for page analysis", { requestId })
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
      logger.info("Product analysis successful", { requestId })

      // Check if page analysis was performed
      if (analysisData.pageAnalysis) {
        logger.debug("Product page analysis was used", { requestId })
      }

      // Validate product metadata
      const metadataValidation = validateProductMetadata(productMetadata)
      if (metadataValidation.warnings.length > 0) {
        logger.warn("Product metadata warnings", { requestId, warnings: metadataValidation.warnings })
      }

      if (analysisData.validation?.hasUnknownValues || analysisData.validation?.promptLength < 100) {
        logger.warn("Low quality analysis detected, using fallback", { requestId })
        usedFallback = true
      }

      // Sanitize metadata early (category config will be added later)
      productMetadata.productCategory = sanitizeCategory(productMetadata.productCategory || productCategory || "Fashion Accessory")
      productMetadata.detailedVisualDescription = sanitizeDescription(
        productMetadata.detailedVisualDescription || `${productName} - A stylish product with premium design.`,
      )
    } else {
      logger.warn("Product analysis failed, using fallback", { requestId })
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

    logger.debug("Uploading images to Blob storage", { requestId })
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
    logger.debug("Images uploaded successfully", { requestId })

    // Map detected category to our standardized category type
    const detectedCategory = productMetadata.productCategory || productCategory || "Unknown"
    const categoryType = mapCategoryToType(detectedCategory)
    const categoryConfig = getCategoryConfig(categoryType, detectedCategory)

    // Enhance metadata with category config now that it's available
    productMetadata = enhanceProductMetadata(productMetadata, productName, productCategory, categoryConfig)

    logger.debug("Detected category", { requestId, detectedCategory, categoryType })

    // Determine if body reconstruction is needed
    const needsBodyReconstruction = requiresBodyReconstruction(categoryType, userBodyAvailability)
    logger.debug("Body reconstruction needed", { requestId, needsBodyReconstruction })

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

    const userCharacteristicsJson =
      productMetadata.userCharacteristics && typeof productMetadata.userCharacteristics === "object"
        ? JSON.stringify(productMetadata.userCharacteristics)
        : '{"visibility":"Unknown","genderHint":"unknown"}'

    // Extract gender hint from user characteristics
    let userGender = "unknown"
    if (productMetadata.userCharacteristics && typeof productMetadata.userCharacteristics === "object") {
      userGender = productMetadata.userCharacteristics.genderHint || "unknown"
    }

    // Build category-specific prompt
    // Enhanced product description already includes page analysis if available
    let prompt = buildCategoryPrompt(categoryConfig, {
      userImageUrl: userPhotoBlob.url,
      productImageUrls: productImageBlobs.map((b) => b.url).join(", "),
      productCategory: detectedCategory,
      productDescription: productMetadata.detailedVisualDescription || sanitizeDescription(`${productName} - a stylish ${detectedCategory}`),
      genImageInstructions: productMetadata.imageGenerationPrompt || `Show the person wearing the ${detectedCategory} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`,
      userCharacteristicsJson: userCharacteristicsJson,
      userGender: userGender,
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
        logger.debug("Added body reconstruction instructions", { requestId })
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
      logger.error("Prompt validation errors", { requestId, errors: promptValidation.errors })
    }
    if (promptValidation.warnings.length > 0 || promptWarnings.length > 0) {
      logger.warn("Prompt quality warnings", { requestId, warnings: [...promptValidation.warnings, ...promptWarnings] })
    }

    logger.debug("Generated category-specific prompt", { requestId, promptLength: prompt.length })

    const replicate = new Replicate({ auth: apiKey })

    // The prompt still references all product URLs for context
    const imageInputArray = [userPhotoBlob.url, productImageBlobs[0].url]
    logger.debug("Preparing image generation", { requestId, imageInputCount: imageInputArray.length })

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

    logger.debug("Calling image generation service", { requestId })

    let output
    try {
      output = await replicate.run("bytedance/seedream-4", { input })
    } catch (replicateError) {
      logger.error("Image generation service error", { requestId, error: replicateError })
      throw new Error(
        `Image generation failed: ${replicateError instanceof Error ? replicateError.message : String(replicateError)}`,
      )
    }

    logger.debug("Image generation output received", { requestId })

    let imageUrl: string | undefined

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0]

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
      throw new Error("No output received from service")
    }

    // Validate generated image URL
    const imageUrlValidation = validateGeneratedImageUrl(imageUrl)
    if (!imageUrlValidation.isValid) {
      logger.error("Generated image URL validation failed", { requestId, errors: imageUrlValidation.errors })
      throw new Error(`Invalid generated image URL: ${imageUrlValidation.errors.join("; ")}`)
    }
    if (imageUrlValidation.warnings.length > 0) {
      logger.warn("Image URL warnings", { requestId, warnings: imageUrlValidation.warnings })
    }

    return NextResponse.json({
      imageUrl,
      productName,
      metadata: {
        model: "closelook-v1",
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
          analysisConfidence: usedFallback ? "low" : "high",
          productScaleRatio,
          productScaleCategory,
        },
      },
    })
  } catch (error) {
    logger.error("Try-on request failed", { requestId, error: error instanceof Error ? error.message : String(error) })
    const sanitizedError = sanitizeErrorForClient(error, requestId)
    
    let statusCode = 500
    if (sanitizedError.errorType === "RATE_LIMIT_EXCEEDED") {
      statusCode = 429
    } else if (sanitizedError.errorType === "VALIDATION_ERROR") {
      statusCode = 400
    } else if (sanitizedError.errorType === "REQUEST_TIMEOUT") {
      statusCode = 504
    }
    
    return NextResponse.json(sanitizedError, { status: statusCode })
  }
}
