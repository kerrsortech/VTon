import { GoogleGenAI } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"

async function convertImageToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    return `data:${file.type || "image/jpeg"};base64,${base64}`
  } catch (error) {
    console.error("[v0] Error converting image:", error)
    throw new Error("Failed to convert image")
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Product analysis started")

  try {
    const formData = await request.formData()
    const userPhoto = formData.get("userPhoto") as File
    const productImage = formData.get("productImage") as File

    if (!userPhoto || !productImage) {
      console.log("[v0] Error: User photo or product image missing")
      return NextResponse.json({ error: "Both user photo and product image are required" }, { status: 400 })
    }

    console.log("[v0] User photo received:", userPhoto.name, userPhoto.type, userPhoto.size, "bytes")
    console.log("[v0] Product image received:", productImage.name, productImage.type, productImage.size, "bytes")

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      console.log("[v0] Error: API key not configured")
      return NextResponse.json(
        {
          error: "Google Gemini API key not configured",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Initializing Google Gemini client")
    const ai = new GoogleGenAI({ apiKey })

    console.log("[v0] Converting images to base64")
    const userPhotoDataUrl = await convertImageToBase64(userPhoto)
    const productImageDataUrl = await convertImageToBase64(productImage)
    console.log("[v0] Images converted")

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
 - Provide the most specific shopper-facing category (e.g., "Running Shoes", "Leather Crossbody Bag", "Sunglasses - Aviator").
 - If unsure, return "Unknown".

2) detailedVisualDescription (from PRODUCT IMAGE - second image, 2–4 concise sentences):
 - State exact visible COLORS (primary + accent), MATERIALS (e.g., knit, suede, pebbled leather), TEXTURES (matte, glossy, woven).
 - Call out visible logos/patterns (location on product), key hardware (color/finish, e.g., "brushed brass buckle") and construction (zippers, straps, midsole window).
 - Note scale / size hints (e.g., "low-profile running shoe with pronounced air midsole").

3) imageGenerationPrompt (4–6 sentences; imperative instructions for the image model):
 - Start with: "Use product reference images to reproduce exact colors, textures, and scale."
 - Specify framing/pose for the product (for sunglasses: "head-and-shoulders, straight-on, show full frame without cropping"; for shoes: "full-body, feet visible, front or 3/4 front").
 - INCLUDE the cameraHint: "{{cameraHint}}".
 - INCLUDE productScale guidance fields: "productScaleCategory" and "productScaleRatioToHead" that must be used to preserve realistic product size (e.g., "productScaleCategory: medium; productScaleRatioToHead: 1.1").
 - Also include in imageGenerationPrompt: "Use userCharacteristics for identity preservation. forcePoseChange=true — change pose, camera angle, clothing, and lighting to match targetFraming. Replace background with studio (see backgroundInstruction)."
 - Add strict fidelity & logo rule: "Preserve user identity and skin tone exactly. DO NOT add or move logos; NEVER place logos/text on reflective surfaces (lenses/metal) unless the reference clearly shows the logo at that exact location. Ensure full product visibility with ~12% padding around product in frame."
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

9) forcePoseChange & targetFraming (DETERMINISTIC, based on PRODUCT IMAGE - second image):
 - forcePoseChange: true  // ALWAYS true: generator MUST change pose, angle, clothing, background as needed.
 - targetFraming: a single value chosen from { "full-body", "three-quarter", "upper-body", "head-and-shoulders", "mid-shot" } depending on productCategory. Rules:
    • Shoes, Pants, Full-length garments -> "full-body"
    • Jackets, Dresses (if length unknown), Bags (if worn) -> "three-quarter" or "full-body" favor full-body when uncertain
    • Sunglasses, Earrings, Necklaces, Watches -> "head-and-shoulders" or "mid-shot" (show upper body & accessories)
    • Small accessories (rings, small studs) -> "upper-body" or "mid-shot" as appropriate
 - Gemini must set targetFraming based on the productCategory it identifies. Do NOT ask for permission — always change to the chosen framing.

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

    console.log("[v0] Calling Google Gemini API for analysis with BOTH images")

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

    console.log("[v0] Gemini API response received")

    const analysisText = response.text || ""
    console.log("[v0] Analysis text:", analysisText)

    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log("[v0] Error: Failed to parse JSON from response")
      console.log("[v0] Raw response:", analysisText)
      return NextResponse.json(
        {
          error: "Failed to parse product analysis",
          rawResponse: analysisText,
        },
        { status: 500 },
      )
    }

    const productMetadata = JSON.parse(jsonMatch[0])
    console.log("[v0] Product metadata extracted:")
    console.log("[v0] - Category:", productMetadata.productCategory)
    console.log("[v0] - Detailed Description:", productMetadata.detailedVisualDescription)
    console.log("[v0] - Image Generation Prompt:", productMetadata.imageGenerationPrompt)
    console.log("[v0] - Camera Hint:", productMetadata.cameraHint)
    console.log("[v0] - Product Scale Category:", productMetadata.productScaleCategory)
    console.log("[v0] - Product Scale Ratio To Head:", productMetadata.productScaleRatioToHead)
    console.log("[v0] - Requires Full Body Reconstruction:", productMetadata.requiresFullBodyReconstruction)
    console.log("[v0] - User Characteristics:", JSON.stringify(productMetadata.userCharacteristics))
    console.log("[v0] - Force Pose Change:", productMetadata.forcePoseChange)
    console.log("[v0] - Target Framing:", productMetadata.targetFraming)
    console.log("[v0] - Background Instruction:", productMetadata.backgroundInstruction)
    console.log("[v0] - Positive Prompt:", productMetadata.positivePrompt)
    console.log("[v0] - Negative Prompt:", productMetadata.negativePrompt)

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
      console.log("[v0] Warning: Gemini returned Unknown values")
    }
    if (validation.promptLength < 100) {
      console.log("[v0] Warning: Image generation prompt is too short")
    }

    return NextResponse.json({
      success: true,
      metadata: productMetadata,
      validation,
    })
  } catch (error) {
    console.error("[v0] Error analyzing product:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze product image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
