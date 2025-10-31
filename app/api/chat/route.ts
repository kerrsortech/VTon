import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"
import { smartFilterProducts } from "@/lib/product-filter"
import type { Product } from "@/lib/closelook-types"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

const SYSTEM_PROMPT = `You are a friendly and knowledgeable sales assistant for Closelook, a premium virtual try-on platform for fashion and sportswear products. Your role is to help customers make informed purchasing decisions by:

1. **Product Expertise**: Provide detailed information about products including fit, materials, sizing, styling tips, and care instructions.

2. **Personalized Recommendations**: Suggest complementary products that match well with what the customer is viewing or asking about. When recommending products, ALWAYS format them as JSON objects in this exact format:
   PRODUCT_RECOMMENDATION: {"id": "product-id", "name": "Product Name", "price": 99, "reason": "Why this matches"}

3. **Fit & Sizing Guidance**: Help customers determine if a product will fit them based on their questions. Ask clarifying questions about their preferences, body type, or intended use.

4. **Style Advice**: Offer styling suggestions and outfit combinations. Explain how products can be worn for different occasions.

5. **Scenario-Based Recommendations**: When customers describe a scenario (e.g., "I need an outfit for a winter wedding", "What should I wear for a job interview?"), recommend appropriate products from the catalog that fit their needs.

6. **Brand Voice**: Be enthusiastic, helpful, and professional. Use a conversational tone while maintaining expertise. Show genuine interest in helping customers find the perfect products.

7. **Context Awareness**: You have access to the current page context and product catalog. Adapt your responses based on whether the customer is browsing the home page or viewing a specific product.

Key Guidelines:
- Keep responses concise but informative (2-4 sentences typically)
- When recommending products, always use the PRODUCT_RECOMMENDATION format
- Be honest about product limitations or fit concerns
- Encourage customers to use the virtual try-on feature
- Focus on value and quality, not just making a sale
- If you don't know something specific, acknowledge it and offer to help in other ways
- When on the home page, proactively suggest products based on customer queries
- When on a product page, focus on that product but also suggest complementary items

Remember: Your goal is to be a trusted advisor who helps customers feel confident in their purchase decisions.`

// Detect if the query is asking for product filtering/search
function isProductSearchQuery(message: string): boolean {
  const searchKeywords = [
    "show me",
    "find",
    "give me",
    "looking for",
    "search",
    "filter",
    "less than",
    "under",
    "below",
    "more than",
    "over",
    "above",
    "between",
    "which",
    "what",
    "can you",
    "i want",
    "i need",
  ]
  const lowerMessage = message.toLowerCase()
  return searchKeywords.some((keyword) => lowerMessage.includes(keyword))
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, currentProduct, allProducts, pageContext } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Check if this is a product search/filter query
    const isSearchQuery = isProductSearchQuery(message)
    let filteredProducts: Product[] = []
    let recommendations: any[] = []

    // If it's a search query, filter products programmatically
    if (isSearchQuery && allProducts && allProducts.length > 0) {
      filteredProducts = smartFilterProducts(allProducts as Product[], message)

      // If we found matching products, convert them to recommendations
      if (filteredProducts.length > 0) {
        recommendations = filteredProducts.slice(0, 10).map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          reason: `Matches your search criteria`,
        }))
      }
    }

    let contextMessage = ""

    if (pageContext === "home") {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the home page/catalog.\n`
    } else if (pageContext === "product" && currentProduct) {
      contextMessage = `\n\nPAGE CONTEXT: The customer is viewing a specific product page.\n\nCURRENT PRODUCT:\nName: ${currentProduct.name}\nCategory: ${currentProduct.category}\nType: ${currentProduct.type}\nColor: ${currentProduct.color}\nPrice: $${currentProduct.price}\nDescription: ${currentProduct.description}\n`
    } else {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the Closelook store.\n`
    }

    // Add available products for recommendations
    // If we have filtered products, prioritize those; otherwise use all products
    const productsToShow = filteredProducts.length > 0 ? filteredProducts : (allProducts || [])
    
    if (productsToShow.length > 0) {
      if (filteredProducts.length > 0) {
        contextMessage += `\n\nFILTERED PRODUCTS (matching the customer's search criteria):\n${filteredProducts
          .map((p: any) => {
            const sizeInfo = p.sizes && p.sizes.length > 0 ? `, Available Sizes: ${p.sizes.join(", ")}` : ""
            return `- ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Type: ${p.type}, Color: ${p.color}, Price: $${p.price}${sizeInfo}`
          })
          .join("\n")}\n`
      } else {
        contextMessage += `\n\nAVAILABLE PRODUCTS FOR RECOMMENDATIONS:\n${productsToShow
          .map((p: any) => {
            const sizeInfo = p.sizes && p.sizes.length > 0 ? `, Available Sizes: ${p.sizes.join(", ")}` : ""
            return `- ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Type: ${p.type}, Color: ${p.color}, Price: $${p.price}${sizeInfo}`
          })
          .join("\n")}\n`
      }
    }

    // Update system prompt for search queries
    let systemPrompt = SYSTEM_PROMPT
    if (isSearchQuery && filteredProducts.length > 0) {
      systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria. ${filteredProducts.length} product(s) were found matching their query. When responding, mention the filtered products and use the PRODUCT_RECOMMENDATION format for each matching product.`
    } else if (isSearchQuery && filteredProducts.length === 0) {
      systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria, but no products were found matching their exact query. Politely inform them that no products match their criteria, but suggest similar products or ask if they'd like to adjust their search.`
    }

    // Build conversation history
    const history = conversationHistory || []
    const messages = [
      {
        role: "user",
        parts: [{ text: systemPrompt + contextMessage }],
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

    // Parse product recommendations from the LLM response
    // If we already have filtered recommendations, merge them; otherwise use LLM recommendations
    const productRegex = /PRODUCT_RECOMMENDATION:\s*({[^}]+})/g
    let match
    let cleanedText = text
    const llmRecommendations: any[] = []

    while ((match = productRegex.exec(text)) !== null) {
      try {
        const productData = JSON.parse(match[1])
        // Verify the product exists in our catalog
        if (allProducts?.some((p: any) => p.id === productData.id)) {
          llmRecommendations.push(productData)
        }
        // Remove the recommendation marker from the text
        cleanedText = cleanedText.replace(match[0], "")
      } catch (e) {
        console.error("Failed to parse product recommendation:", e)
      }
    }

    // If we have filtered products from search query, prioritize them
    // Otherwise use LLM recommendations
    const finalRecommendations =
      isSearchQuery && recommendations.length > 0
        ? recommendations // Use programmatically filtered products
        : llmRecommendations // Use LLM recommendations

    return NextResponse.json({
      message: cleanedText.trim(),
      recommendations: finalRecommendations,
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
