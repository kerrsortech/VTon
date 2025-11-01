import { GoogleGenAI } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

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
      logger.error("AI Engine configuration missing")
      return NextResponse.json({ error: "Configuration error" }, { status: 500 })
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
      logger.error("Image generation API error", { error: apiError.message })
      const sanitizedError = sanitizeErrorForClient(apiError)
      
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
    logger.error("Error in generate-image POST handler", { error })
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
