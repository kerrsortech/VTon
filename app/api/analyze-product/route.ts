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
  console.log("[v0] Product analysis started")

  try {
    const formData = await request.formData()
    const productImage = formData.get("productImage") as File

    if (!productImage) {
      console.log("[v0] Error: Product image missing")
      return NextResponse.json({ error: "Product image is required" }, { status: 400 })
    }

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

    console.log("[v0] Initializing Google GenAI client")
    const ai = new GoogleGenAI({ apiKey })

    console.log("[v0] Converting image to supported format")
    const convertedImage = await convertImageToSupportedFormat(productImage)
    console.log("[v0] Image converted:", convertedImage.mimeType)

    const analysisPrompt = `Analyze this product image and provide a JSON response with exactly two fields:

1. "productCategory": The product category (e.g., "Running Shoes", "Winter Jacket", "Baseball Cap", "Joggers", "Hoodie", etc.)
2. "shortDescription": A brief visual description of the product focusing on colors, style, and key visual features (2-3 sentences maximum)

Return ONLY valid JSON in this exact format:
{
  "productCategory": "category name",
  "shortDescription": "brief visual description of the product"
}

Do not include any other text, just the JSON.`

    console.log("[v0] Calling Gemini API for product analysis with image")
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [
            { text: analysisPrompt },
            {
              inlineData: {
                mimeType: convertedImage.mimeType,
                data: convertedImage.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 512,
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
    console.log("[v0] - Description:", productMetadata.shortDescription)

    return NextResponse.json({
      success: true,
      metadata: productMetadata,
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
