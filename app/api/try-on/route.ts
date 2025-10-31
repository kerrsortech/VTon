import Replicate from "replicate"
import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { detectBodyAvailability, fillPromptPlaceholders } from "@/lib/prompt-helpers"

const SEEDREAM_PROMPT_TEMPLATE = `REFERENCE IMAGES:
- User image: {{USER_IMAGE_URL}} — preserve identity, face, hair, and skin tone.
- Product images: {{PRODUCT_IMAGE_URLS}} — use to reproduce colors, textures, logos, hardware, and scale.

GOAL:
Create a single photorealistic studio photograph of the same person wearing/using the product. Preserve user identity, facial features, and skin tone exactly.

MANDATORY FIDELITY RULES:
1) Face & identity preservation:
   - Preserve exact facial features, bone structure, hairline, facial hair, and skin tone from the user image. Do not alter face shape or facial hair.
2) Product fidelity:
   - Reproduce product color, texture, and hardware exactly from product images. Keep logos readable and at correct location/scale.
3) No duplicate people, no overlapping big foreground crops, and no partial floating limbs.
4) Scale & anatomical constraints:
   - Person must have realistic adult proportions (approx. 7–8 head heights). Legs must not be child-like or truncated. If reconstructing body, use standard adult proportions based on face-to-body ratio.

IDENTITY & POSE:
Extracted user characteristics: {{USER_CHARACTERISTICS_JSON}}. Preserve these identity attributes exactly: face shape, facial hair, hairline, eye shape, and skin tone. Do NOT alter these.

Pose & framing (MANDATORY):
- forcePoseChange is true. Ignore the user's original camera angle and pose. Use Gemini's targetFraming ({{TARGET_FRAMING}}) to pick framing:
  • "full-body": full-body, neutral standing pose facing camera, feet visible (use for shoes/pants).
  • "three-quarter": three-quarter body or 3/4 turn, neutral posture (use for bags/jackets).
  • "upper-body"/"mid-shot": chest-up to waist, neutral pose (use for watches, necklaces).
  • "head-and-shoulders": tight face + eyewear focus (use for sunglasses, glasses, earrings).
- When reconstructing full-body from head-only: build a realistic adult body using neutral fitted clothing (hoodie + tapered pants) with ~7–8 head heights and natural proportions.
- ALWAYS replace background with studio: neutral light-gray gradient (#e6e6e6 center), softbox key + soft fill + subtle rim light.

SCALE CONSTRAINT (MANDATORY):
- Match product size to the provided productScaleCategory and productScaleRatioToHead. Target product width ≈ {{PRODUCT_SCALE_RATIO}} × user's head width (use face width from user image). Do not exceed +/- 20% of this target. If product would be larger than real-life proportions, reduce camera focal length or zoom out to keep realistic scale.

CLOTHING-SWAP RULES:
 - If product is a garment (top/bottom/jacket), replace the corresponding user garment realistically with the product; preserve body shape and skin exposure.
 - If accessory (shoes/watch/sunglasses), keep user's clothing as-is; only add the accessory.

PHOTOGRAPHY SPECIFICATIONS:
 - Camera hint (apply exactly): {{CAMERA_HINT}}. Ensure entire product is visible with ~12% padding.
 - Studio background: {{BACKGROUND_INSTRUCTION}}
 - Lighting: softbox key + soft fill, gentle rim light to separate subject from background.
 - Lens: 50–85mm equivalent. Depth of field: slight background blur but both face and product in acceptable focus.
 - Output look: Photorealistic, natural skin texture (no plastic smoothing), high-resolution.
 - Logo placement rule: NEVER add logos or text onto reflective surfaces (lenses, shiny metal) unless the product reference clearly shows the logo at that exact location. If the product reference does not show a logo on a reflective surface, do NOT render one.

NEGATIVE PROMPT (MANDATORY):
{{NEGATIVE_PROMPT}}

GENERATOR CONTROL & QUALITY:
 - Use deterministic seed for reproducibility (optional per request).
 - Use strong guidance scale / high fidelity (engine-specific: high guidance / low denoising).
 - Generate 1–3 variations and select the most anatomically consistent; if face is modified or duplicates appear, automatically retry with higher guidance and different seed.

OUTPUT:
 - Return a single image URL (or base64). Output must be high-resolution and photorealistic.

PRODUCT CATEGORY: {{PRODUCT_CATEGORY}}
PRODUCT SCALE CATEGORY: {{PRODUCT_SCALE_CATEGORY}}

PRODUCT DETAILS:
{{PRODUCT_DESCRIPTION}}

IMAGE GENERATION INSTRUCTIONS FROM ANALYSIS:
{{GEN_IMAGE_INSTRUCTIONS}}

POSITIVE PROMPT:
{{POSITIVE_PROMPT}}`

export async function POST(request: NextRequest) {
  try {
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

    if (!userPhoto || productImages.length === 0 || !productName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Try-on request received for:", productName)
    console.log("[v0] Number of product images:", productImages.length)

    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 })
    }

    const userBodyAvailability = detectBodyAvailability(userPhoto)
    console.log("[v0] Detected body availability:", userBodyAvailability)

    console.log("[v0] Analyzing product with Gemini (sending user photo + product image)...")
    const productAnalysisFormData = new FormData()
    productAnalysisFormData.append("userPhoto", userPhoto)
    productAnalysisFormData.append("productImage", productImages[0])
    const analysisResponse = await fetch(`${request.nextUrl.origin}/api/analyze-product`, {
      method: "POST",
      body: productAnalysisFormData,
    })

    let productMetadata
    let usedFallback = false

    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json()
      productMetadata = analysisData.metadata
      console.log("[v0] Product analysis successful")

      if (analysisData.validation?.hasUnknownValues || analysisData.validation?.promptLength < 100) {
        console.log("[v0] Warning: Low quality analysis detected, using fallback")
        usedFallback = true
      }
    } else {
      console.log("[v0] Product analysis failed, using fallback")
      usedFallback = true
      productMetadata = {
        productCategory: productCategory || "Fashion Accessory",
        detailedVisualDescription: `${productName} - A stylish ${productCategory || "product"} with premium design and quality materials.`,
        imageGenerationPrompt: `Show the person wearing the ${productName} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`,
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

    console.log("[v0] Uploading images to Blob storage...")
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
    console.log("[v0] Images uploaded successfully")
    console.log("[v0] Product image URLs:", productImageBlobs.map((b) => b.url).join(", "))

    const defaultCameraHints: Record<string, string> = {
      Sunglasses: "85mm headshot, tight head-and-shoulders; include ~12% padding",
      Shoes: "50mm full-body, feet visible, include ~12% padding",
      Bag: "50-85mm 3/4 or full-body depending on bag size; ensure full bag visible with ~12% padding",
      Watch: "85mm mid-shot; show wrist and watch clearly; include ~12% padding",
      Default: "50mm neutral framing; ensure full product visible with ~12% padding",
    }

    const defaultScaleRatio: Record<string, number> = {
      Sunglasses: 1.2,
      Shoes: 0.9,
      Bag: 0.8,
      Watch: 0.25,
      Default: 1.0,
    }

    const cameraHint =
      productMetadata.cameraHint && productMetadata.cameraHint !== "Unknown"
        ? productMetadata.cameraHint
        : defaultCameraHints[productMetadata.productCategory] || defaultCameraHints["Default"]

    const productScaleRatio =
      productMetadata.productScaleRatioToHead && productMetadata.productScaleRatioToHead !== 1.0
        ? productMetadata.productScaleRatioToHead
        : defaultScaleRatio[productMetadata.productCategory] || defaultScaleRatio["Default"]

    const productScaleCategory =
      productMetadata.productScaleCategory && productMetadata.productScaleCategory !== "Unknown"
        ? productMetadata.productScaleCategory
        : "medium"

    console.log("[v0] Using camera hint:", cameraHint)
    console.log("[v0] Using product scale ratio:", productScaleRatio)
    console.log("[v0] Using product scale category:", productScaleCategory)

    const framingDefault: Record<string, string> = {
      Sunglasses: "head-and-shoulders",
      Earrings: "head-and-shoulders",
      Necklace: "mid-shot",
      Watch: "mid-shot",
      Shoes: "full-body",
      Pants: "full-body",
      Dress: "three-quarter",
      Jacket: "three-quarter",
      Bag: "three-quarter",
      Default: "three-quarter",
    }

    const targetFramingToUse =
      productMetadata.targetFraming && productMetadata.targetFraming !== "Unknown"
        ? productMetadata.targetFraming
        : framingDefault[productMetadata.productCategory] || framingDefault["Default"]

    console.log("[v0] Using target framing:", targetFramingToUse)

    const backgroundInstruction =
      productMetadata.backgroundInstruction && productMetadata.backgroundInstruction !== "Unknown"
        ? productMetadata.backgroundInstruction
        : "neutral light-gray gradient (#e6e6e6 center), softbox key + soft fill + subtle rim light"

    const positivePrompt =
      productMetadata.positivePrompt && productMetadata.positivePrompt !== "Unknown"
        ? productMetadata.positivePrompt
        : "photorealistic, high-resolution, professional studio lighting, sharp focus"

    const negativePrompt =
      productMetadata.negativePrompt && productMetadata.negativePrompt !== "Unknown"
        ? productMetadata.negativePrompt
        : "no duplicate person, no extra limbs, no multiple heads, no floating body parts, no giant foreground product overlay, no logos on lenses unless shown exactly in product refs, no child-like proportions, no cartoon, no text, no watermark, no home interiors"

    const userCharacteristicsJson =
      productMetadata.userCharacteristics && typeof productMetadata.userCharacteristics === "object"
        ? JSON.stringify(productMetadata.userCharacteristics)
        : '{"visibility":"Unknown","genderHint":"unknown"}'

    console.log("[v0] Using background instruction:", backgroundInstruction)
    console.log("[v0] Using positive prompt:", positivePrompt)
    console.log("[v0] Using negative prompt:", negativePrompt)
    console.log("[v0] Using user characteristics:", userCharacteristicsJson)

    const prompt = fillPromptPlaceholders(SEEDREAM_PROMPT_TEMPLATE, {
      userImageUrl: userPhotoBlob.url,
      productImageUrls: productImageBlobs.map((b) => b.url).join(", "),
      productCategory: productMetadata.productCategory,
      productDescription: productMetadata.detailedVisualDescription,
      genImageInstructions: productMetadata.imageGenerationPrompt,
      userGenderHint: "Unknown",
      userBodyAvailability: userBodyAvailability,
      cameraHint: cameraHint,
      productScaleRatio: String(productScaleRatio),
      productScaleCategory: productScaleCategory,
      userCharacteristicsJson: userCharacteristicsJson,
      targetFraming: targetFramingToUse,
      backgroundInstruction: backgroundInstruction,
      positivePrompt: positivePrompt,
      negativePrompt: negativePrompt,
    })

    console.log("[v0] Generated prompt with placeholders filled")

    const replicate = new Replicate({ auth: apiKey })

    // The prompt still references all product URLs for context
    const imageInputArray = [userPhotoBlob.url, productImageBlobs[0].url]
    console.log("[v0] Image input array length:", imageInputArray.length)
    console.log("[v0] Sending to SeeDream-4: user photo + first product image")

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

    console.log("[v0] Calling Replicate SeeDream-4...")

    let output
    try {
      output = await replicate.run("bytedance/seedream-4", { input })
    } catch (replicateError) {
      console.error("[v0] Replicate API error:", replicateError)
      throw new Error(
        `Replicate API failed: ${replicateError instanceof Error ? replicateError.message : String(replicateError)}`,
      )
    }

    console.log("[v0] Replicate output received")
    console.log("[v0] Output type:", typeof output)
    console.log("[v0] Output is array:", Array.isArray(output))

    let imageUrl: string | undefined

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0]
      console.log("[v0] First item type:", typeof firstItem)

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

    console.log("[v0] Final image URL:", imageUrl)

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
      throw new Error(`Invalid image URL: ${imageUrl}`)
    }

    return NextResponse.json({
      imageUrl,
      productName,
      metadata: {
        model: "bytedance/seedream-4",
        timestamp: new Date().toISOString(),
        productAnalysis: productMetadata,
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
    console.error("[v0] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate try-on image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
