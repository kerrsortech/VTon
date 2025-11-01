import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"
import { smartFilterProducts } from "@/lib/product-filter"
import type { Product } from "@/lib/closelook-types"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"
import {
  retrieveRelevantProducts,
  extractQueryIntent,
  getProductLimitForQuery,
  type QueryIntent,
} from "@/lib/semantic-product-search"
import { extractProductsFromResponse } from "@/lib/product-extractor"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

const SYSTEM_PROMPT = `You are a friendly and knowledgeable sales assistant for Closelook, a premium virtual try-on platform for fashion and sportswear products. Your role is to help customers make informed purchasing decisions by:

1. **Product Expertise**: Provide detailed information about products including fit, materials, sizing, styling tips, and care instructions.

2. **Personalized Recommendations**: Suggest complementary products that match well with what the customer is viewing or asking about. 

CRITICAL: When recommending ANY product (whether in the response text or as a separate recommendation), you MUST format it using the PRODUCT_RECOMMENDATION format. DO NOT mention products in plain text format (like "Jacket ($120)") without also including the PRODUCT_RECOMMENDATION format.

Required format for ALL product recommendations:
PRODUCT_RECOMMENDATION: {"id": "product-id", "name": "Product Name", "price": 99, "reason": "Why this matches"}

IMPORTANT:
- Every product you recommend MUST use the PRODUCT_RECOMMENDATION format
- You can mention the product in your text response, but ALSO include the PRODUCT_RECOMMENDATION format
- If you mention multiple products, include a PRODUCT_RECOMMENDATION for each one
- The product ID must match exactly with the product IDs in the AVAILABLE PRODUCTS list

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

    // SCALABILITY: Use semantic search to retrieve only relevant products
    // This prevents sending entire catalog (e.g., 1000 products) to LLM
    let relevantProducts: Product[] = []
    let queryIntent: QueryIntent | null = null
    let recommendations: any[] = []

    const catalogSize = allProducts?.length || 0
    const isLargeCatalog = catalogSize > 50

    // For large catalogs, use intelligent product retrieval
    if (isLargeCatalog && allProducts && allProducts.length > 0) {
      try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY || ""
        
        // Extract query intent first (helps determine how many products to retrieve)
        if (apiKey) {
          queryIntent = await extractQueryIntent(message, apiKey).catch((error) => {
            console.warn("[Chat] Intent extraction failed, using fallback:", error)
            return null
          })
        }

        // Retrieve only relevant products (top N based on query intent)
        const productLimit = queryIntent
          ? getProductLimitForQuery(queryIntent, catalogSize)
          : 20 // Default limit

        relevantProducts = await retrieveRelevantProducts(allProducts as Product[], message, {
          maxProducts: productLimit,
          useGeminiIntent: !!apiKey,
          apiKey: apiKey,
        })

        console.log(
          `[Chat] Retrieved ${relevantProducts.length} relevant products from catalog of ${catalogSize} products`,
        )

        // Convert to recommendations format
        if (relevantProducts.length > 0) {
          recommendations = relevantProducts.slice(0, 10).map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            reason: `Matches your query criteria`,
          }))
        }
      } catch (error) {
        console.error("[Chat] Error in semantic search, falling back to simple filter:", error)
        // Fallback to simple filter
        relevantProducts = smartFilterProducts(allProducts as Product[], message).slice(0, 20)
      }
    } else if (allProducts && allProducts.length > 0) {
      // For small catalogs, use simple filtering
      const isSearchQuery = isProductSearchQuery(message)
      if (isSearchQuery) {
        relevantProducts = smartFilterProducts(allProducts as Product[], message)
        if (relevantProducts.length > 0) {
          recommendations = relevantProducts.slice(0, 10).map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            reason: `Matches your search criteria`,
          }))
        }
      } else {
        // For small catalogs and non-search queries, use all products
        relevantProducts = allProducts as Product[]
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

    // SCALABILITY: Only send relevant products to LLM, not entire catalog
    // For large catalogs, we've already filtered to top N relevant products
    const productsToShow = relevantProducts.length > 0 ? relevantProducts : (allProducts || [])
    
    // Limit products sent to LLM to prevent token overflow
    const maxProductsForPrompt = isLargeCatalog ? 20 : productsToShow.length
    const productsForPrompt = productsToShow.slice(0, maxProductsForPrompt)
    
    if (productsForPrompt.length > 0) {
      contextMessage += `\n\nAVAILABLE PRODUCTS FOR RECOMMENDATIONS (${productsForPrompt.length} of ${catalogSize} total products):\n${productsForPrompt
        .map((p: any) => {
          const sizeInfo = p.sizes && p.sizes.length > 0 ? `, Available Sizes: ${p.sizes.join(", ")}` : ""
          return `- ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Type: ${p.type}, Color: ${p.color}, Price: $${p.price}${sizeInfo}`
        })
        .join("\n")}\n`
      
      // Inform LLM about catalog size (for context, not for processing)
      if (isLargeCatalog && catalogSize > productsForPrompt.length) {
        contextMessage += `\n\nNOTE: The full catalog contains ${catalogSize} products, but only the most relevant ${productsForPrompt.length} products matching the customer's query are shown above. When recommending products, use only the products listed above.`
      }
    }

    // Update system prompt based on query intent and results
    let systemPrompt = SYSTEM_PROMPT
    if (queryIntent) {
      if (queryIntent.intent === "search" && relevantProducts.length > 0) {
        systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria. ${relevantProducts.length} relevant product(s) were found matching their query. When responding, mention these products and use the PRODUCT_RECOMMENDATION format for each matching product.`
      } else if (queryIntent.intent === "search" && relevantProducts.length === 0) {
        systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria, but no products were found matching their exact query. Politely inform them that no products match their criteria, but suggest similar products or ask if they'd like to adjust their search.`
      } else if (queryIntent.intent === "recommendation") {
        systemPrompt += `\n\nIMPORTANT: The customer is asking for product recommendations. Use the AVAILABLE PRODUCTS listed above to suggest relevant products that match their needs. Use the PRODUCT_RECOMMENDATION format for each recommendation.`
      }
    } else if (relevantProducts.length > 0) {
      systemPrompt += `\n\nIMPORTANT: ${relevantProducts.length} relevant product(s) matching the customer's query are available. When recommending products, use the PRODUCT_RECOMMENDATION format for each suggestion.`
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

    // Extract product recommendations from LLM response
    // This handles both PRODUCT_RECOMMENDATION JSON format and plain text mentions
    const { cleanedText, extractedProducts: llmRecommendations } = extractProductsFromResponse(
      text,
      allProducts || [],
    )

    // Prioritize semantically retrieved products if available
    // Otherwise use LLM-extracted recommendations
    // If both exist, merge them (prefer semantic for duplicates)
    const finalRecommendations: any[] = []

    if (relevantProducts.length > 0 && recommendations.length > 0) {
      // Add semantic recommendations first
      finalRecommendations.push(...recommendations)
      
      // Add LLM recommendations that aren't already included
      for (const llmRec of llmRecommendations) {
        if (!finalRecommendations.some((r) => r.id === llmRec.id)) {
          finalRecommendations.push(llmRec)
        }
      }
    } else {
      // Use LLM recommendations if no semantic recommendations
      finalRecommendations.push(...llmRecommendations)
    }

    return NextResponse.json({
      message: cleanedText.trim(),
      recommendations: finalRecommendations,
    })
  } catch (error: any) {
    logger.error("Chat API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    
    // Determine appropriate status code based on error type
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
