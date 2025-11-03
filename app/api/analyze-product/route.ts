import { GoogleGenAI } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"
import {
  analyzeProductPage,
  buildEnhancedProductDescription,
  enhancePromptWithPageAnalysis,
} from "@/lib/product-page-analyzer"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

async function convertImageToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    return `data:${file.type || "image/jpeg"};base64,${base64}`
  } catch (error) {
    logger.error("Error converting image", { error })
    throw new Error("Failed to convert image")
  }
}

export async function POST(request: NextRequest) {
  logger.info("Product analysis started")

  try {
    const formData = await request.formData()
    const userPhoto = formData.get("userPhoto") as File
    const productImage = formData.get("productImage") as File
    const productUrl = formData.get("productUrl") as string | null

    if (!userPhoto || !productImage) {
      logger.warn("User photo or product image missing")
      return NextResponse.json({ error: "Both user photo and product image are required" }, { status: 400 })
    }

    // Optional: Analyze product page URL for enhanced product understanding
    let pageAnalysis = null
    if (productUrl && productUrl.trim().length > 0 && productUrl.startsWith("http")) {
      logger.debug("Product page URL provided", { productUrl })
      try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (apiKey) {
          // Analyze product page in parallel with image analysis
          pageAnalysis = await analyzeProductPage(productUrl, apiKey).catch((error) => {
            logger.warn("Product page analysis failed, continuing without it", { error })
            return null
          })

          if (pageAnalysis) {
            logger.debug("Product page analysis successful")
          }
        }
      } catch (error) {
        logger.warn("Error during product page analysis, continuing without it", { error })
      }
    }

    logger.debug("Processing images", { userPhotoName: userPhoto.name, productImageName: productImage.name })

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      logger.error("AI Engine configuration missing")
      return NextResponse.json(
        {
          error: "Configuration error",
        },
        { status: 500 },
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    logger.debug("Converting images to base64")
    const userPhotoDataUrl = await convertImageToBase64(userPhoto)
    const productImageDataUrl = await convertImageToBase64(productImage)

    const systemMessage = `Return ONLY a single JSON object with keys: "productCategory","detailedVisualDescription","imageGenerationPrompt","cameraHint","productScaleCategory","productScaleRatioToHead","requiresFullBodyReconstruction","userCharacteristics","forcePoseChange","targetFraming","backgroundInstruction","positivePrompt","negativePrompt". If uncertain, use exactly "Unknown". Do NOT add any other text.`

    const analysisPrompt = `You are a strict image analyst. ${systemMessage}

You will receive TWO images:
1. USER PHOTO (first image) - The person who will wear the product
2. PRODUCT IMAGE (second image) - The product to be worn

Analyze BOTH images and return ONLY the following JSON object (no explanation):

{
  "productCategory": "category name",
  "detailedVisualDescription": "comprehensive visual description",
  "imageGenerationPrompt": "detailed instructions for the image-generation model",
  "cameraHint": "camera and framing suggestion",
  "productScaleCategory": "small|medium|large",
  "productScaleRatioToHead": 1.0,
  "requiresFullBodyReconstruction": true|false,
  "userCharacteristics": {},
  "forcePoseChange": true,
  "targetFraming": "full-body|three-quarter|upper-body|head-and-shoulders|mid-shot",
  "backgroundInstruction": "studio background description",
  "positivePrompt": "positive prompt additions",
  "negativePrompt": "negative prompt additions"
}

CRITICAL: Analyze the USER PHOTO (first image) for userCharacteristics, NOT the product image. The product image may show a model, but we need characteristics of the ACTUAL USER from the first image.

Rules and details to produce:

1) productCategory (from PRODUCT IMAGE - second image):
 - Identify the product type from one of these main categories: Clothing (T-Shirts, Shirts, Hoodies, Sweaters, Jackets, Jeans, Pants, Shorts, Dresses), Footwear (Sneakers, Shoes, Boots, Sandals), Headwear (Sunglasses, Glasses, Caps, Hats, Beanies), Accessories (Watches, Necklaces, Earrings, Bracelets, Rings, Bags, Backpacks, Belts, Scarves, Gloves).
 - For BAGS, analyze the product image carefully to determine the bag type based on visible features:
   * Look at the straps/handles: Single short handle or top handles = "Handbag" (held in hand)
   * Shoulder strap visible = "Shoulder Bag" (worn on shoulder)
   * Long diagonal strap visible = "Crossbody Bag" (worn diagonally across body)
   * Two straps for back = "Backpack" (worn on back)
   * Large open top with handles = "Tote Bag" (held by handles or shoulder)
   * Small handheld with no strap = "Clutch" (held in hand)
   * Waist-worn style = "Belt Bag" (worn around waist)
   - Be VERY specific: "Handbag", "Shoulder Bag", "Crossbody Bag", "Backpack", "Tote Bag", "Clutch", "Belt Bag", "Mini Purse" - NOT just "Bag". 
   - CRITICAL: Analyze the PRODUCT IMAGE itself to determine bag type from visible straps, handles, and design features. Do NOT guess - only identify based on what you actually see in the image.
 - Return the most specific category name (e.g., "Running Shoes", "Leather Crossbody Bag", "Sunglasses", "T-Shirt", "Wristwatch", "Handbag", "Shoulder Bag").
 - Be specific about the product type but concise.
 - If unsure, return "Unknown".

2) detailedVisualDescription (from PRODUCT IMAGE - second image, 2–4 concise sentences):
 - State exact visible COLORS (primary + accent), MATERIALS (e.g., knit, suede, pebbled leather), TEXTURES (matte, glossy, woven).
 - Call out visible logos/patterns (location on product), key hardware (color/finish, e.g., "brushed brass buckle") and construction (zippers, straps, midsole window).
 - For BAGS: Describe handle/strap type (short handles, shoulder strap, crossbody strap, backpack straps, etc.), hardware details (buckles, zippers, clasps), closure mechanism, and overall design structure. This is critical for determining how the bag should be held/worn.
 - Note scale / size hints (e.g., "low-profile running shoe with pronounced air midsole").

3) imageGenerationPrompt (4–6 sentences; imperative instructions for the image model):
 - Start with: "Use product reference images to reproduce exact colors, textures, logos, hardware, and scale. DO NOT manipulate or change product features from the reference images - preserve them exactly as shown."
 - For BAGS specifically: Analyze the productCategory you identified and specify how the user should hold/wear it:
   * If "Handbag": "User holds the handbag in one hand at waist/hip level, exactly as shown in product reference. Preserve all product features: handles, logos, hardware, textures, and colors from reference image."
   * If "Shoulder Bag": "User wears the shoulder bag on one shoulder with strap visible, exactly as designed. Preserve all product features: strap, logos, hardware, textures, and colors from reference image."
   * If "Crossbody Bag": "User wears the crossbody bag diagonally across the body with strap visible, exactly as designed. Preserve all product features: strap length and style, logos, hardware, textures, and colors from reference image."
   * If "Backpack": "User wears the backpack on back with both straps over shoulders, exactly as designed. Preserve all product features: straps, logos, hardware, textures, and colors from reference image."
   * If "Tote Bag": "User holds the tote bag by handles or wears on shoulder, exactly as shown in product reference. Preserve all product features: handles, logos, hardware, textures, and colors from reference image."
   * If "Clutch": "User holds the clutch in hand at waist/chest level, exactly as shown in product reference. Preserve all product features: design, logos, hardware, textures, and colors from reference image."
   * If "Belt Bag": "User wears the belt bag around waist with strap visible, exactly as designed. Preserve all product features: strap, buckle, logos, hardware, textures, and colors from reference image."
 - Specify framing/pose for the product (for sunglasses: "head-and-shoulders, straight-on, show full frame without cropping"; for shoes: "full-body, feet visible, front or 3/4 front").
 - INCLUDE the cameraHint: "{{cameraHint}}".
 - INCLUDE productScale guidance fields: "productScaleCategory" and "productScaleRatioToHead" that must be used to preserve realistic product size (e.g., "productScaleCategory: medium; productScaleRatioToHead: 1.1").
 - Also include in imageGenerationPrompt: "Use userCharacteristics for identity preservation. forcePoseChange=true — change pose, camera angle, clothing, and lighting to match targetFraming. Replace background with studio (see backgroundInstruction)."
 - Add strict fidelity & logo rule: "Preserve user identity and skin tone exactly. DO NOT add, remove, move, or alter logos, hardware, straps, handles, or any product features from the reference images. NEVER place logos/text on reflective surfaces (lenses/metal) unless the reference clearly shows the logo at that exact location. Ensure full product visibility with ~12% padding around product in frame."
 - End: "Photorealistic, high-resolution, studio product shot suitable for e-commerce."

4) cameraHint (from PRODUCT IMAGE - second image):
 - A short single-line suggestion for focal length/framing/padding (e.g., "sunglasses: 85mm headshot, tight head-and-shoulders; shoes: 50mm full-body, include ~12% padding").
 - If unsure, return "Unknown".

5) productScaleCategory (from PRODUCT IMAGE - second image):
 - Return "small" for items like watches, rings, small accessories.
 - Return "medium" for items like sunglasses, hats, bags.
 - Return "large" for items like shoes, jackets, full garments.
 - If unsure, return "Unknown".

6) productScaleRatioToHead (from PRODUCT IMAGE - second image):
 - Provide a numeric ratio representing the product's width relative to a human head width (e.g., sunglasses: 1.2, shoes: 0.9, watch: 0.25).
 - This helps the image model maintain realistic product scale.
 - If unsure, return 1.0 as default.

7) requiresFullBodyReconstruction (from BOTH images):
 - Return true if the product requires seeing the full body to evaluate/position correctly (e.g., shoes require full-body), AND the user photo is not full-body. Otherwise false.

8) userCharacteristics (OBJECT) - CRITICAL: Analyze the USER PHOTO (first image) ONLY, NOT the product image. Return a concise structured object describing only the visible user attributes from the USER PHOTO (do NOT guess). Allowed structure:

"userCharacteristics": {
  "visibility": "head-only" | "upper-body" | "full-body",
  "genderHint": "male" | "female" | "unknown",
  "ageRange": "teen|20-29|30-39|40-49|50+|Unknown",
  "bodyBuild": "slim|average|athletic|stocky|Unknown",
  "skinTone": "light|medium|tan|dark|Unknown",
  "hairColor": "black|brown|blonde|grey|bald|Unknown",
  "facialHair": "none|stubble|beard|mustache|Unknown",
  "headOrientation": "frontal|slight-3-4|profile|tilted|Unknown",
  "visibleClothing": "short description or 'Unknown'",
  "faceWidthToHeightRatio": "approx numeric ratio or 'Unknown'"
}

CRITICAL: The genderHint field is extremely important for accurate image generation. Analyze facial features, bone structure, and other visible characteristics to determine if the person appears male or female. Only use "unknown" if truly impossible to determine. This will be used to generate anatomically correct and realistic person in the try-on image.

9) forcePoseChange & targetFraming (DETERMINISTIC, based on PRODUCT IMAGE - second image):
 - forcePoseChange: true  // ALWAYS true: generator MUST change pose, angle, clothing, background as needed.
 - targetFraming: a single value chosen from { "full-body", "three-quarter", "upper-body", "head-and-shoulders", "mid-shot" } depending on productCategory. Rules:
    • Footwear (shoes, sneakers, boots, sandals), Lower body clothing (pants, jeans, shorts, skirts), Full-body garments (dresses, jumpsuits) -> "full-body"
    • Upper body clothing (shirts, t-shirts, hoodies, jackets, coats, sweaters) -> "three-quarter"
    • Headwear (sunglasses, glasses, caps, hats, beanies), Small jewelry (earrings, small necklaces) -> "head-and-shoulders"
    • Watches, Bracelets, Necklaces (larger), Bags (when worn/held) -> "mid-shot"
    • Small accessories (rings, small studs), Belts -> "upper-body" or "mid-shot" as appropriate
 - Gemini must set targetFraming based on the productCategory it identifies. Use these rules strictly. Do NOT ask for permission — always change to the chosen framing.

10) backgroundInstruction (from PRODUCT IMAGE - second image):
 - Return a short description of the studio background (e.g., "neutral light-gray gradient (#e6e6e6 center), softbox key + soft fill + subtle rim light").
 - If unsure, return "Unknown".

11) positivePrompt:
 - Return additional positive prompt keywords to enhance quality (e.g., "photorealistic, high-resolution, professional studio lighting, sharp focus").
 - If unsure, return "Unknown".

12) negativePrompt:
 - Return negative prompt keywords to avoid common issues (e.g., "no duplicate person, no extra limbs, no floating body parts, no giant foreground product overlay").
 - If unsure, return "Unknown".

Important: use plain factual language only. If uncertain about gender, color names, or material, output "Unknown" for those specific descriptors.

REMEMBER: Analyze USER PHOTO (first image) for userCharacteristics, and PRODUCT IMAGE (second image) for product details.`

    logger.debug("Calling AI for analysis")

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [
            { text: analysisPrompt },
            {
              inlineData: {
                mimeType: userPhoto.type || "image/jpeg",
                data: userPhotoDataUrl.split(",")[1],
              },
            },
            {
              inlineData: {
                mimeType: productImage.type || "image/jpeg",
                data: productImageDataUrl.split(",")[1],
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.0,
        maxOutputTokens: 768,
      },
    })

    logger.debug("AI response received")

    const analysisText = response.text || ""

    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.error("Failed to parse JSON from response")
      return NextResponse.json(
        {
          error: "Failed to parse product analysis",
        },
        { status: 500 },
      )
    }

    let productMetadata = JSON.parse(jsonMatch[0])
    logger.debug("Product metadata extracted", { category: productMetadata.productCategory })

    // Enhance product description with page analysis if available
    if (pageAnalysis) {
      logger.debug("Enhancing product description with page analysis")
      const originalDescription = productMetadata.detailedVisualDescription || ""
      productMetadata.detailedVisualDescription = buildEnhancedProductDescription(originalDescription, pageAnalysis)
      
      // Enhance image generation prompt with page insights
      if (productMetadata.imageGenerationPrompt) {
        productMetadata.imageGenerationPrompt = enhancePromptWithPageAnalysis(
          productMetadata.imageGenerationPrompt,
          pageAnalysis,
        )
      }

      // Store page analysis for reference
      productMetadata.pageAnalysis = {
        summary: pageAnalysis.summary,
        designElements: pageAnalysis.designElements,
        materials: pageAnalysis.materials,
        keyFeatures: pageAnalysis.keyFeatures,
      }
    }

    const validation = {
      hasUnknownValues:
        productMetadata.productCategory === "Unknown" ||
        productMetadata.detailedVisualDescription === "Unknown" ||
        productMetadata.imageGenerationPrompt === "Unknown" ||
        productMetadata.cameraHint === "Unknown" ||
        productMetadata.productScaleCategory === "Unknown" ||
        productMetadata.targetFraming === "Unknown",
      promptLength: productMetadata.imageGenerationPrompt?.length || 0,
      isValid: true,
    }

    if (validation.hasUnknownValues) {
      logger.warn("AI returned Unknown values")
    }
    if (validation.promptLength < 100) {
      logger.warn("Image generation prompt is too short")
    }

    return NextResponse.json({
      success: true,
      metadata: productMetadata,
      validation,
      pageAnalysis: pageAnalysis
        ? {
            summary: pageAnalysis.summary,
            enhancedDescription: pageAnalysis.enhancedDescription,
          }
        : null,
    })
  } catch (error) {
    logger.error("Error analyzing product", { error: error instanceof Error ? error.message : "Unknown error" })
    const sanitizedError = sanitizeErrorForClient(error)
    
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

export const config = {
  maxDuration: 60,
}
