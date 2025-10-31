import { GoogleGenAI } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"

async function convertImageToSupportedFormat(file: File): Promise<{ buffer: Buffer; mimeType: string }> {
  const supportedTypes = ["image/png", "image/jpeg", "image/webp"]

  if (supportedTypes.includes(file.type)) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return {
      buffer,
      mimeType: file.type,
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  return {
    buffer,
    mimeType: "image/jpeg",
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Try-on generation started")

  try {
    const formData = await request.formData()

    const userPhoto = formData.get("userPhoto") as File
    const productImage = formData.get("productImage") as File
    const productName = formData.get("productName") as string
    const productCategory = formData.get("productCategory") as string

    if (!userPhoto || !productImage || !productName) {
      console.log("[v0] Error: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] User photo:", userPhoto.name, userPhoto.size, "bytes")
    console.log("[v0] Product image:", productImage.name, productImage.size, "bytes")
    console.log("[v0] Product name:", productName)
    console.log("[v0] Product category:", productCategory)

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      console.log("[v0] Error: API key not configured")
      return NextResponse.json(
        {
          error: "Google Gemini API key not configured",
          hint: "Add GOOGLE_GEMINI_API_KEY to your environment variables",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Step 1: Analyzing product image")
    const productAnalysisFormData = new FormData()
    productAnalysisFormData.append("productImage", productImage)

    const analysisResponse = await fetch(`${request.nextUrl.origin}/api/analyze-product`, {
      method: "POST",
      body: productAnalysisFormData,
    })

    let productMetadata = null
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json()
      productMetadata = analysisData.metadata
      console.log("[v0] Product analysis successful")
      console.log("[v0] - Category:", productMetadata.productCategory)
      console.log("[v0] - Description:", productMetadata.shortDescription)
    } else {
      console.log("[v0] Product analysis failed, using fallback")
      productMetadata = {
        productCategory: productCategory || "Clothing",
        shortDescription: `${productName} - a stylish product`,
      }
    }

    console.log("[v0] Step 2: Generating try-on image")
    console.log("[v0] Initializing Google GenAI client")
    const ai = new GoogleGenAI({ apiKey })

    console.log("[v0] Converting images to supported formats")
    const convertedUserPhoto = await convertImageToSupportedFormat(userPhoto)
    const convertedProductImage = await convertImageToSupportedFormat(productImage)
    console.log("[v0] User photo converted:", convertedUserPhoto.mimeType)
    console.log("[v0] Product image converted:", convertedProductImage.mimeType)

    const prompt = buildDynamicTryOnPrompt(productMetadata.productCategory, productMetadata.shortDescription)

    console.log("[v0] Prompt generated, length:", prompt.length)
    console.log("[v0] Calling Gemini API for image generation")

    let response
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image", // Updated to gemini-2.5-flash-image model
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: convertedUserPhoto.mimeType,
                  data: convertedUserPhoto.buffer.toString("base64"),
                },
              },
              {
                inlineData: {
                  mimeType: convertedProductImage.mimeType,
                  data: convertedProductImage.buffer.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.7,
          responseModalities: ["Image", "Text"],
        },
      })

      console.log("[v0] Gemini API response received")
    } catch (apiError: any) {
      console.error("[v0] Gemini API Error:", apiError)

      if (apiError.message?.includes("quota") || apiError.message?.includes("429")) {
        console.log("[v0] Error type: QUOTA_EXCEEDED")
        return NextResponse.json(
          {
            error: "API quota exceeded",
            errorType: "QUOTA_EXCEEDED",
            details:
              "Your Google Gemini API has reached its usage limit. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits",
          },
          { status: 429 },
        )
      }

      console.log("[v0] Error type: API_ERROR")
      return NextResponse.json(
        {
          error: "Failed to generate image",
          errorType: "API_ERROR",
          details: apiError.message || "An error occurred while calling the Gemini API",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Extracting generated image from response")
    let generatedImageData: string | null = null

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            generatedImageData = part.inlineData.data
            console.log("[v0] Image data found, size:", generatedImageData.length)
            break
          }
        }
      }
    }

    if (!generatedImageData) {
      console.log("[v0] Error: No image was generated in response")
      return NextResponse.json({ error: "No image was generated" }, { status: 500 })
    }

    const base64Image = `data:image/png;base64,${generatedImageData}`
    console.log("[v0] Try-on generation completed successfully")

    return NextResponse.json({
      imageUrl: base64Image,
      productName,
      metadata: {
        model: "gemini-2.5-flash-image", // Updated model name in metadata
        timestamp: new Date().toISOString(),
        productAnalysis: productMetadata,
      },
    })
  } catch (error) {
    console.error("[v0] Error in Closelook try-on POST handler:", error)
    return NextResponse.json({ error: "Failed to generate try-on image" }, { status: 500 })
  }
}

function buildDynamicTryOnPrompt(productCategory: string, shortDescription: string): string {
  const intro = `Create a professional product modeling photo showing the person from the first image wearing the product from the second image.

PRODUCT INFORMATION:
- Category: ${productCategory}
- Description: ${shortDescription}
`

  const identityPreservation = `
ABSOLUTELY CRITICAL - FACIAL FIDELITY: Preserve the EXACT facial features, bone structure, eye shape, nose shape, lip shape, eyebrow shape, and facial proportions from the uploaded person's photo. DO NOT add, remove, or modify any facial features. DO NOT change or add hairstyles, haircuts, or hair textures - keep the exact same hair as in the original photo. DO NOT alter facial hair, makeup, or any other facial characteristics. The face should be an EXACT replica of the uploaded photo with zero modifications or "improvements."`

  const skinToneConsistency = `

ABSOLUTELY CRITICAL - COMPLETE BODY SKIN TONE UNITY: Every single visible part of the person's body - face, forehead, cheeks, chin, neck, throat, hands, fingers, wrists, forearms, arms, legs, and ANY other exposed skin - must be IDENTICAL in skin tone, color, and ethnicity to the uploaded person's photo. This is NON-NEGOTIABLE: if the uploaded person has light skin, then their face AND hands AND all visible skin must be light; if they have dark skin, then their face AND hands AND all visible skin must be dark. NEVER mix skin tones on the same person - the hands must be the EXACT same color as the face. Pay special attention to the hands and fingers - they must perfectly match the facial skin tone without any variation.`

  const productAccuracy = `

CRITICAL PRODUCT ACCURACY: The product must match EXACTLY what is shown in the second image - same colors, same design, same materials, same fit, same style. DO NOT substitute with different products or modify the design. The product should look identical to the reference image.`

  const framingAndFit = getFramingInstructions(productCategory)

  const backgroundAndQuality = `

BACKGROUND & QUALITY: The background should be a smooth dark gray gradient transitioning from darker gray at the top to lighter gray at the bottom, exactly like professional product photography studio backgrounds. The lighting should be studio-quality with soft, even illumination. Make it look like a high-quality professional advertisement photo. IMPORTANT: Do not include any watermarks, logos, text overlays, or branding marks. Generate a clean, professional image without any watermarks or text overlays.`

  return intro + identityPreservation + skinToneConsistency + productAccuracy + framingAndFit + backgroundAndQuality
}

function getFramingInstructions(productCategory: string): string {
  const categoryLower = productCategory.toLowerCase()

  if (categoryLower.includes("shoes") || categoryLower.includes("sneakers") || categoryLower.includes("footwear")) {
    return `

FRAMING & FIT: Frame the shot to show the full body with clear focus on the feet and shoes. The person should be posed naturally as a model in a standing or athletic stance that showcases the footwear. The shoes must fit naturally and look realistic on the person's feet.`
  }

  if (
    categoryLower.includes("cap") ||
    categoryLower.includes("hat") ||
    categoryLower.includes("beanie") ||
    categoryLower.includes("headwear")
  ) {
    return `

FRAMING & FIT: Frame the shot from the chest up, focusing on the head and face area to showcase the headwear clearly. The person should be posed naturally as a model. The headwear should fit naturally on the person and look realistic. Make it look like a high-quality advertisement photo with a portrait-style framing.`
  }

  if (
    categoryLower.includes("pants") ||
    categoryLower.includes("joggers") ||
    categoryLower.includes("bottoms") ||
    categoryLower.includes("shorts") ||
    categoryLower.includes("trousers")
  ) {
    return `

FRAMING & FIT: Frame the shot to show the full body to showcase the bottoms clearly. The person should be posed naturally as a model. CRITICAL: The pants/bottoms MUST maintain the EXACT SAME fit and silhouette as shown in the product image - if they're loose and baggy, keep them loose and baggy; if they're slim fit, keep them slim fit. DO NOT alter the original fit or design. The garment should drape and fit exactly like the reference product image.`
  }

  if (
    categoryLower.includes("jacket") ||
    categoryLower.includes("hoodie") ||
    categoryLower.includes("shirt") ||
    categoryLower.includes("top") ||
    categoryLower.includes("sweater") ||
    categoryLower.includes("sweatshirt")
  ) {
    return `

FRAMING & FIT: Frame the shot from the waist up to showcase the upper body garment clearly. The person should be posed naturally as a model. CRITICAL: The garment MUST maintain the EXACT SAME fit and silhouette as shown in the product image - if it's oversized, keep it oversized; if it's fitted, keep it fitted. DO NOT modify the original design characteristics or how it naturally drapes on the body. Preserve the authentic garment proportions exactly as designed.`
  }

  return `

FRAMING & FIT: Frame the shot appropriately to showcase the product clearly. The person should be posed naturally as a model. The product should fit naturally on the person and maintain the exact same fit, proportions, and design characteristics as shown in the reference product image.`
}
