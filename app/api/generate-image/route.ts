import { GoogleGenAI } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"

async function convertImageToSupportedFormat(file: File): Promise<{ buffer: Buffer; mimeType: string }> {
  const supportedTypes = ["image/png", "image/jpeg", "image/webp", "image/avif"]

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
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google Gemini API key not configured" }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const model = ai.models.get({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image", "Text"],
      },
    })

    const formData = await request.formData()

    const image1 = formData.get("image1") as File
    const image2 = formData.get("image2") as File
    const prompt = formData.get("prompt") as string

    if (!image1 || !image2 || !prompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const convertedImage1 = await convertImageToSupportedFormat(image1)
    const convertedImage2 = await convertImageToSupportedFormat(image2)

    let response
    try {
      response = await model.generateContent({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: convertedImage1.mimeType,
                  data: convertedImage1.buffer.toString("base64"),
                },
              },
              {
                inlineData: {
                  mimeType: convertedImage2.mimeType,
                  data: convertedImage2.buffer.toString("base64"),
                },
              },
            ],
          },
        ],
      })
    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError)

      // Handle quota exceeded errors specifically
      if (apiError.message?.includes("quota") || apiError.message?.includes("429")) {
        return NextResponse.json(
          {
            error: "API quota exceeded. Please check your Google Gemini API billing and quota limits.",
            errorType: "QUOTA_EXCEEDED",
            details:
              "Your Google Gemini API has reached its usage limit. Please upgrade your plan or wait for the quota to reset.",
          },
          { status: 429 },
        )
      }

      // Handle other API errors
      return NextResponse.json(
        {
          error: "Failed to generate image",
          errorType: "API_ERROR",
          details: apiError.message || "An error occurred while calling the Gemini API",
        },
        { status: 500 },
      )
    }

    let generatedImageData: string | null = null
    let generatedText = ""

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        generatedText += part.text
      } else if (part.inlineData) {
        generatedImageData = part.inlineData.data
      }
    }

    if (!generatedImageData) {
      return NextResponse.json({ error: "No image was generated" }, { status: 500 })
    }

    const base64Image = `data:image/png;base64,${generatedImageData}`

    return NextResponse.json({
      imageUrl: base64Image,
      text: generatedText,
    })
  } catch (error) {
    console.error("Error in generate-image POST handler:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
