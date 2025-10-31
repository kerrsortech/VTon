import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// System prompt for the Closelook sales assistant
const SYSTEM_PROMPT = `You are a friendly and knowledgeable sales assistant for Closelook, a premium virtual try-on platform for fashion and sportswear products. Your role is to help customers make informed purchasing decisions by:

1. **Product Expertise**: Provide detailed information about products including fit, materials, sizing, styling tips, and care instructions.

2. **Personalized Recommendations**: Suggest complementary products that match well with what the customer is viewing. When recommending products, ALWAYS format them as JSON objects in this exact format:
   PRODUCT_RECOMMENDATION: {"id": "product-id", "name": "Product Name", "price": 99, "reason": "Why this matches"}

3. **Fit & Sizing Guidance**: Help customers determine if a product will fit them based on their questions. Ask clarifying questions about their preferences, body type, or intended use.

4. **Style Advice**: Offer styling suggestions and outfit combinations. Explain how products can be worn for different occasions.

5. **Brand Voice**: Be enthusiastic, helpful, and professional. Use a conversational tone while maintaining expertise. Show genuine interest in helping customers find the perfect products.

6. **Context Awareness**: You have access to the current product the customer is viewing. Reference it naturally in your responses.

Key Guidelines:
- Keep responses concise but informative (2-4 sentences typically)
- When recommending products, always use the PRODUCT_RECOMMENDATION format
- Be honest about product limitations or fit concerns
- Encourage customers to use the virtual try-on feature
- Focus on value and quality, not just making a sale
- If you don't know something specific, acknowledge it and offer to help in other ways

Remember: Your goal is to be a trusted advisor who helps customers feel confident in their purchase decisions.`

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, currentProduct, allProducts } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Build context about current product
    let contextMessage = ""
    if (currentProduct) {
      contextMessage = `\n\nCURRENT PRODUCT CONTEXT:\nThe customer is currently viewing: ${currentProduct.name}\nCategory: ${currentProduct.category}\nType: ${currentProduct.type}\nColor: ${currentProduct.color}\nPrice: $${currentProduct.price}\nDescription: ${currentProduct.description}\n`
    }

    // Add available products for recommendations
    if (allProducts && allProducts.length > 0) {
      contextMessage += `\n\nAVAILABLE PRODUCTS FOR RECOMMENDATIONS:\n${allProducts
        .map((p: any) => `- ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Type: ${p.type}, Price: $${p.price}`)
        .join("\n")}\n`
    }

    // Build conversation history
    const history = conversationHistory || []
    const messages = [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT + contextMessage }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Hello! I'm your Closelook sales assistant. I'm here to help you find the perfect products and answer any questions you have. How can I assist you today?",
          },
        ],
      },
      ...history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ]

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const chat = model.startChat({
      history: messages.slice(0, -1),
    })

    const result = await chat.sendMessage(message)
    const response = result.response
    const text = response.text()

    // Parse product recommendations from the response
    const recommendations: any[] = []
    const productRegex = /PRODUCT_RECOMMENDATION:\s*({[^}]+})/g
    let match
    let cleanedText = text

    while ((match = productRegex.exec(text)) !== null) {
      try {
        const productData = JSON.parse(match[1])
        recommendations.push(productData)
        // Remove the recommendation marker from the text
        cleanedText = cleanedText.replace(match[0], "")
      } catch (e) {
        console.error("Failed to parse product recommendation:", e)
      }
    }

    return NextResponse.json({
      message: cleanedText.trim(),
      recommendations,
    })
  } catch (error: any) {
    console.error("Chat API Error:", error)

    // Handle quota exceeded errors
    if (error.message?.includes("quota") || error.message?.includes("429")) {
      return NextResponse.json(
        {
          error: "API quota exceeded",
          details:
            "The Google Gemini API quota has been exceeded. Please check your API plan and billing details at https://aistudio.google.com/",
          errorType: "QUOTA_EXCEEDED",
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
