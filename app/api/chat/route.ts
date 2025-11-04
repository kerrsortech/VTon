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
import { detectQueryType } from "@/lib/chat-query-detector"
import { getSession } from "@/lib/shopify/session-storage"
import {
  fetchCustomerOrders,
  fetchOrderByName,
  fetchStorePolicies,
} from "@/lib/shopify/api-client"
import { createCustomerNote } from "@/lib/shopify/ticket-system"
import { extractTicketRequest } from "@/lib/ticket-extractor"
// New enhanced modules
import { 
  analyzeUserIntent, 
  getSmartRecommendations,
  filterProducts as filterProductsIntelligence,
  rankProductsByRelevance
} from "@/lib/productIntelligence"
import {
  extractTicketData,
  createSupportTicket,
  formatTicketResponse
} from "@/lib/ticketSystem"
import {
  getSystemPrompt,
  buildContextPrompt,
  buildFullPrompt
} from "@/lib/prompts"
import {
  convertToShopifyFormat,
  convertFromShopifyFormat,
  convertProductsToShopifyFormat,
  convertProductsFromShopifyFormat
} from "@/lib/product-format-converter"
import { validateChatInput } from "@/lib/production-validation"
import { addCorsHeaders, createCorsPreflightResponse, isAllowedOrigin } from "@/lib/cors-headers"
import { ShopifyProductAdapter } from "@/lib/closelook-plugin/adapters/shopify-adapter"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"
import { analyzeProductPage } from "@/lib/product-page-analyzer"
import { ensureStorefrontToken } from "@/lib/shopify/storefront-token"
import { setContext, getContext, setConversationHistory, getConversationHistory } from "@/lib/redis"
import { buildContextString } from "@/lib/context"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request)
}

// Validate API key on startup
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  logger.warn("GOOGLE_GEMINI_API_KEY is not set. Chat functionality will be limited.")
}

// Build system prompt with customer name if available (enhanced version with new prompt system)
function buildSystemPrompt(customerName?: string): string {
  // Use the new enhanced system prompt from prompts.js
  const basePrompt = getSystemPrompt()
  
  // Add personalized greeting if customer name is available
  if (customerName) {
    return `Hello ${customerName}! I'm your personal shopping assistant.\n\n${basePrompt}`
  }
  
  return basePrompt
}

// Legacy system prompt (kept for reference but not used)
function buildSystemPromptLegacy(customerName?: string): string {
  const greeting = customerName 
    ? `Hello ${customerName}! I'm your personal shopping assistant.`
    : "Hello! I'm your personal shopping assistant."

  return `You are a friendly and knowledgeable sales assistant for Closelook, a premium virtual try-on platform for fashion and sportswear products. Your role is to help customers make informed purchasing decisions and answer any questions they have about:

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

3. **Order Information**: Help customers with order status, delivery dates, tracking information, and order history. Use the ORDER_DATA provided in the context to answer specific questions about their orders.

4. **Store Policies**: Answer questions about shipping, returns, refunds, privacy, and terms of service using the STORE_POLICIES information provided in the context.

5. **Account & Order History**: Help customers understand their purchase history, previous orders, and sizing preferences based on past orders when available.

6. **Fit & Sizing Guidance**: Help customers determine if a product will fit them based on their questions and past order history if available. Ask clarifying questions about their preferences, body type, or intended use.

7. **Style Advice**: Offer styling suggestions and outfit combinations. Explain how products can be worn for different occasions.

8. **Scenario-Based Recommendations**: When customers describe a scenario (e.g., "I need an outfit for a winter wedding", "What should I wear for a job interview?"), recommend appropriate products from the catalog that fit their needs.

9. **Brand Voice**: Be enthusiastic, helpful, and professional. Use a conversational tone while maintaining expertise. Show genuine interest in helping customers find the perfect products.

10. **Context Awareness**: You have access to the current page context, product catalog, order information, and store policies. Use all available information to provide accurate and helpful responses.

11. **Ticket Escalation**: If after multiple exchanges (3-5 messages), you are unable to resolve the customer's question or concern, and the customer seems frustrated or their issue is complex, you should:
   - Acknowledge that you may need additional assistance
   - Politely offer to escalate their issue to a human representative
   - Ask: "Would you like me to create a support ticket so our team can help you with this? Just say yes and describe what you need help with."
   - If the customer says yes or confirms, use the TICKET_CREATION format to create a ticket
   - Format: TICKET_CREATION: {"issue": "customer's issue description", "customerName": "customer name if available"}
   - Only suggest ticket creation when truly necessary - don't over-escalate

12. **Product Page Analysis**: When DETAILED PRODUCT ANALYSIS is provided in the context, use it comprehensively to answer questions about the product. The analysis contains information extracted directly from the product page, including design elements, materials, key features, and enhanced descriptions. Always prioritize this detailed analysis when answering questions about the current product.

Key Guidelines:
- Keep responses concise but informative (2-4 sentences typically, more if needed for order/policy details)
- When recommending products, always use the PRODUCT_RECOMMENDATION format
- When providing order information, be specific and accurate using the ORDER_DATA provided
- When answering policy questions, reference the specific STORE_POLICIES provided
- Be honest about product limitations or fit concerns
- Encourage customers to use the virtual try-on feature
- Focus on value and quality, not just making a sale
- If you don't know something specific, acknowledge it and offer to help in other ways
- When on the home page, proactively suggest products based on customer queries
- When on a product page, focus on that product but also suggest complementary items
- **CRITICAL CONTEXT RULE**: When the customer is on a product page (PAGE CONTEXT shows "product"), ANY mention of "this", "this product", "this item", "it", or ANY questions about the product (usage, features, durability, suitability, everyday use, daily use, materials, fit, sizing, care, styling, etc.), ALWAYS refers to the CURRENT PRODUCT shown on that page. NEVER ask "which product?" or "which item?" - always answer about the current product. The customer is viewing the product page, so all product-related questions are about that product.
- If customer asks about orders but no order data is available, politely ask for their order number or email to help them

Remember: Your goal is to be a trusted advisor who helps customers feel confident in their purchase decisions and provides comprehensive support for all their questions. Use the customer's name (if provided) to personalize your responses.`
}


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

// Detect if the query is asking for product recommendations
function isProductRecommendationQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const recommendationKeywords = [
    "recommend",
    "recommendation",
    "suggest",
    "suggestion",
    "what should",
    "what would",
    "what do you have",
    "what products",
    "show me something",
    "what can you",
    "help me find",
    "looking for something",
    "what's good",
    "best",
    "top",
    "popular",
    "trending",
    "featured",
    "new products",
    "latest",
    "what's new",
  ]
  
  return recommendationKeywords.some((keyword) => lowerMessage.includes(keyword))
}

// Detect if query needs product filtering/search/recommendations
function shouldFilterProducts(message: string): boolean {
  return isProductSearchQuery(message) || isProductRecommendationQuery(message)
}

// Detect if the user is asking about the current product
function isAskingAboutCurrentProduct(message: string, hasCurrentProduct: boolean): boolean {
  if (!hasCurrentProduct) return false
  
  const lowerMessage = message.toLowerCase().trim()
  
  // Keywords that indicate asking about current product
  const currentProductKeywords = [
    "tell me more about this",
    "tell me about this",
    "tell me more",
    "what is this",
    "what's this",
    "about this product",
    "about this",
    "details about this",
    "more details",
    "describe this",
    "explain this",
    "what can you tell me",
    "what do you know",
    "what are the features",
    "what are the specs",
    "specifications",
    "features",
    "information about",
    "details",
  ]
  
  // Product usage/inquiry patterns - phrases that contain "this" and product-related questions
  const productInquiryPatterns = [
    "can i use this",
    "can you use this",
    "is this good",
    "is this suitable",
    "is this durable",
    "is this safe",
    "is this comfortable",
    "should i use this",
    "can this be used",
    "is this made for",
    "is this designed for",
    "is this recommended",
    "is this appropriate",
    "will this work",
    "does this work",
    "how to use this",
    "how do i use this",
    "when can i use this",
    "where can i use this",
  ]
  
  // Check for explicit product inquiry keywords
  const hasExplicitKeywords = currentProductKeywords.some((keyword) => lowerMessage.includes(keyword))
  
  // Check for product usage/inquiry patterns with "this"
  const hasInquiryPattern = productInquiryPatterns.some((pattern) => lowerMessage.includes(pattern))
  
  // Check if message contains "this" with product-related words (for short messages on product page)
  const hasThisWithProductContext = lowerMessage.includes("this") && (
    lowerMessage.includes("product") ||
    lowerMessage.includes("item") ||
    lowerMessage.includes("use") ||
    lowerMessage.includes("wear") ||
    lowerMessage.includes("good") ||
    lowerMessage.includes("suitable") ||
    lowerMessage.includes("durable") ||
    lowerMessage.includes("everyday") ||
    lowerMessage.includes("daily") ||
    lowerMessage.includes("regular")
  )
  
  return hasExplicitKeywords || hasInquiryPattern || hasThisWithProductContext ||
    // Fallback: short messages with "this" on product page are likely about current product
    (lowerMessage.length < 30 && lowerMessage.includes("this"))
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let requestBody: any
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error("Invalid JSON in request body", { error: parseError })
      const response = NextResponse.json(
        { error: "Invalid request format", details: "Request body must be valid JSON" },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    // Validate all inputs
    const validation = validateChatInput(requestBody)
    if (!validation.isValid) {
      logger.warn("Input validation failed", { errors: validation.errors })
      const response = NextResponse.json(
        { 
          error: "Invalid input", 
          details: validation.errors.join(", ") 
        },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    const { 
      message, 
      conversationHistory, 
      currentProduct, 
      allProducts, 
      pageContext,
      shop,
      customerName,
      customerInternal,
    } = validation.sanitized

    // Ensure message exists after validation
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      const response = NextResponse.json(
        { error: "Message is required and cannot be empty" },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    // ============ CRITICAL FIX: Log full request body for debugging ============
    logger.info('[Chat API] Full request body:', JSON.stringify(requestBody, null, 2))
    
    // Get session ID from request (from new context-aware widget)
    const sessionId = requestBody.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // ============ CRITICAL FIX: Extract currentProduct from request body ============
    // Frontend sends: { currentProduct: { id: "8252597338298", ... } }
    const currentProductFromBody = requestBody.currentProduct || null
    
    logger.info('[Chat API] Extracted currentProduct from body:', JSON.stringify(currentProductFromBody, null, 2))
    
    // Get context from request (new context-aware widget sends this)
    let context = requestBody.context || null
    
    // Store context in Redis if provided
    if (context && sessionId) {
      try {
        await setContext(sessionId, context)
        logger.info('[Chat API] Context stored in Redis', { 
          sessionId, 
          pageType: context.page_type,
          hasProduct: !!context.current_product
        })
      } catch (error) {
        logger.warn('[Chat API] Failed to store context in Redis', { error })
      }
    }
    
    // Also try to get context from Redis if not provided in request
    if (!context && sessionId) {
      try {
        context = await getContext(sessionId)
        if (context) {
          logger.info('[Chat API] Context loaded from Redis', { sessionId })
        }
      } catch (error) {
        logger.warn('[Chat API] Failed to load context from Redis', { error })
      }
    }

    // Detect query type (order, policy, account, etc.)
    // Only fetch data when explicitly asked
    const queryType = detectQueryType(message)
    
    // Smart detection: Only fetch if query is clearly about orders/account
    const shouldFetchOrders = queryType.isOrder || queryType.isAccount
    const shouldFetchPolicies = queryType.isPolicy

    // BACKEND LOGIC: Fetch products and current product from Shopify if shop domain is provided
    // Use context from widget if available, otherwise use validated input
    // Widget should only send shop domain and product ID, backend handles all fetching and mapping
    // Use shop from context if available, otherwise use validated input
    const shopDomain = context?.shop_domain || shop || requestBody.shop_domain
    const pageType = context?.page_type || pageContext || 'other'
    
    // ============ CRITICAL FIX: Extract product ID from multiple sources ============
    // Priority: 1. currentProductFromBody (from frontend payload), 2. context.current_product, 3. currentProduct (from validation)
    let productId = currentProductFromBody?.id || 
                   context?.current_product?.id || 
                   context?.current_product?.gid || 
                   currentProduct?.id
    
    logger.info('[Chat API] Product ID extracted:', { 
      productId,
      fromBody: currentProductFromBody?.id,
      fromContext: context?.current_product?.id || context?.current_product?.gid,
      fromValidated: currentProduct?.id
    })
    
    let fetchedProducts: Product[] = []
    
    // ============ CRITICAL FIX: Use currentProductFromBody as primary source ============
    let productToFetch: { id?: string; handle?: string } | null = null
    
    if (currentProductFromBody && currentProductFromBody.id) {
      productToFetch = {
        id: currentProductFromBody.id,
        handle: currentProductFromBody.url ? 
          currentProductFromBody.url.split('/products/')[1]?.split('?')[0] : 
          currentProductFromBody.handle || null
      }
      logger.info('[Chat API] Product to fetch from body:', productToFetch)
    } else if (context?.current_product && (context.current_product.id || context.current_product.gid || context.current_product.handle)) {
      productToFetch = {
        id: context.current_product.id || context.current_product.gid,
        handle: context.current_product.handle || null
      }
      logger.info('[Chat API] Product to fetch from context:', productToFetch)
    } else if (currentProduct?.id) {
      productToFetch = {
        id: currentProduct.id,
        handle: currentProduct.handle || null
      }
      logger.info('[Chat API] Product to fetch from validated input:', productToFetch)
    }
    
    let fetchedCurrentProduct: Product | undefined = currentProductFromBody ? {
      id: currentProductFromBody.id,
      name: currentProductFromBody.title || currentProductFromBody.name || "Product",
      category: currentProductFromBody.category || currentProductFromBody.type || "",
      type: currentProductFromBody.type || "",
      color: currentProductFromBody.color || "",
      price: currentProductFromBody.price || 0,
      images: currentProductFromBody.images || [],
      description: currentProductFromBody.description || "",
      sizes: currentProductFromBody.sizes || [],
      url: currentProductFromBody.url || undefined,
      handle: currentProductFromBody.handle || undefined
    } : (currentProduct || (context?.current_product ? {
      id: context.current_product.id || context.current_product.gid,
      name: context.current_product.title || context.current_product.name,
      handle: context.current_product.handle
    } : undefined))
    
    if (shopDomain) {
      try {
        // Ensure we have a Storefront Access Token
        // This will check env, session, or create one if needed
        const storefrontToken = await ensureStorefrontToken(shopDomain)
        
        if (storefrontToken) {
          const adapter = new ShopifyProductAdapter(shopDomain, storefrontToken)
          
          // ============ CRITICAL FIX: Fetch product using productToFetch ============
          // Always fetch complete product details from Shopify when product ID is provided
          // This ensures Gemini receives complete, accurate product information
          if (productToFetch && (productToFetch.id || productToFetch.handle)) {
            try {
              logger.info('[Chat API] Fetching product details from Shopify...', productToFetch)
              
              let closelookProduct: CloselookProduct | null = null
              
              // Try fetching by handle first if available, otherwise use ID
              if (productToFetch.handle) {
                try {
                  closelookProduct = await adapter.getProductByHandle(productToFetch.handle)
                  if (closelookProduct) {
                    logger.info('[Chat API] ✅ Product fetched by handle from Shopify', {
                      id: closelookProduct.id,
                      name: closelookProduct.name
                    })
                  }
                } catch (handleError) {
                  logger.warn('[Chat API] Failed to fetch product by handle', { error: handleError })
                }
              }
              
              // If handle fetch failed or we only have ID, try fetching by ID
              if (!closelookProduct && productToFetch.id) {
                let productIdToFetch = productToFetch.id.toString().trim()
                
                // If ID is numeric (not already in GID format), convert to GID
                if (productIdToFetch && !productIdToFetch.startsWith('gid://')) {
                  // Remove any existing gid:// prefix and extract numeric part
                  const numericId = productIdToFetch.replace(/^gid:\/\/shopify\/Product\//, '').replace(/[^0-9]/g, '')
                  if (numericId) {
                    productIdToFetch = `gid://shopify/Product/${numericId}`
                  } else {
                    // If we can't extract numeric ID, try using the ID as-is
                    logger.warn('[Chat API] Could not extract numeric ID, using as-is', { originalId: productIdToFetch })
                  }
                }
                
                logger.info('[Chat API] Fetching complete product details from Shopify by ID', {
                  productId: productIdToFetch,
                  shopDomain,
                  hasStorefrontToken: !!storefrontToken
                })
                
                try {
                  closelookProduct = await adapter.getProduct(productIdToFetch)
                } catch (idError) {
                  logger.warn('[Chat API] Failed to fetch product by ID', { error: idError })
                }
              }
              
              // If we successfully fetched product, update fetchedCurrentProduct
              if (closelookProduct) {
                fetchedCurrentProduct = {
                  id: closelookProduct.id,
                  name: closelookProduct.name || fetchedCurrentProduct?.name || "Product",
                  category: closelookProduct.category || fetchedCurrentProduct?.category || "",
                  type: closelookProduct.type || fetchedCurrentProduct?.type || "",
                  color: closelookProduct.color || fetchedCurrentProduct?.color || "",
                  price: closelookProduct.price || fetchedCurrentProduct?.price || 0,
                  images: closelookProduct.images && closelookProduct.images.length > 0 
                    ? closelookProduct.images 
                    : (fetchedCurrentProduct?.images || []),
                  description: closelookProduct.description || fetchedCurrentProduct?.description || "",
                  sizes: closelookProduct.sizes || fetchedCurrentProduct?.sizes || [],
                  // Preserve URL from frontend if available (needed for fallback URL analysis)
                  url: fetchedCurrentProduct?.url || undefined,
                  handle: closelookProduct.handle || fetchedCurrentProduct?.handle || undefined
                }
                logger.info('[Chat API] ✅ Successfully fetched complete product details from Shopify', {
                  productId: closelookProduct.id,
                  productName: closelookProduct.name,
                  hasDescription: !!closelookProduct.description,
                  descriptionLength: closelookProduct.description?.length || 0,
                  imageCount: closelookProduct.images?.length || 0,
                  hasSizes: !!closelookProduct.sizes && closelookProduct.sizes.length > 0,
                  category: closelookProduct.category,
                  type: closelookProduct.type,
                  price: closelookProduct.price
                })
              } else {
                logger.warn('[Chat API] Product not found in Shopify, using widget data', { 
                  productToFetch,
                  shopDomain,
                  widgetProductName: fetchedCurrentProduct?.name
                })
                // Keep widget data but ensure we have at least a name
                if (fetchedCurrentProduct && !fetchedCurrentProduct.name && fetchedCurrentProduct.id) {
                  fetchedCurrentProduct = {
                    ...fetchedCurrentProduct,
                    name: `Product ${fetchedCurrentProduct.id}`,
                  }
                }
              }
            } catch (productError) {
              logger.error('[Chat API] Error fetching current product from Shopify', { 
                error: productError instanceof Error ? productError.message : String(productError),
                errorStack: productError instanceof Error ? productError.stack : undefined,
                productToFetch,
                shopDomain
              })
              // Keep the minimal product data from widget as fallback
              // Ensure we have at least a name
              if (fetchedCurrentProduct && !fetchedCurrentProduct.name && fetchedCurrentProduct.id) {
                fetchedCurrentProduct = {
                  ...fetchedCurrentProduct,
                  name: `Product ${fetchedCurrentProduct.id}`,
                }
              }
            }
          } else if (fetchedCurrentProduct && !fetchedCurrentProduct.id) {
            logger.warn("Current product exists but has no ID", {
              hasName: !!fetchedCurrentProduct.name,
              hasCategory: !!fetchedCurrentProduct.category,
              shopDomain
            })
          }
          
          // Fetch all products from Shopify Storefront API using adapter
          const closelookProducts: CloselookProduct[] = await adapter.getAllProducts()
          
          // Convert CloselookProduct to Product format
          fetchedProducts = closelookProducts.map((cp: CloselookProduct) => ({
            id: cp.id,
            name: cp.name,
            category: cp.category,
            type: cp.type,
            color: cp.color,
            price: cp.price,
            images: cp.images,
            description: cp.description,
            sizes: cp.sizes,
          }))
          
          logger.info(`Fetched ${fetchedProducts.length} products from Shopify for shop ${shopDomain}`)
        } else {
          logger.warn(`No storefront token available for shop ${shopDomain}, using products from request if provided`)
        }
      } catch (error) {
        logger.error("Error fetching products from Shopify", { 
          error: error instanceof Error ? error.message : String(error),
          shopDomain 
        })
        // Fallback to products from request if available
      }
    }
    
    // Use fetched current product or fallback to provided one
    const finalCurrentProduct = fetchedCurrentProduct || currentProduct
    
    // Update context with enriched product data
    if (context && finalCurrentProduct) {
      context.current_product = {
        ...context.current_product,
        id: finalCurrentProduct.id,
        name: finalCurrentProduct.name,
        title: finalCurrentProduct.name,
        price: finalCurrentProduct.price,
        description: finalCurrentProduct.description,
        category: finalCurrentProduct.category,
        type: finalCurrentProduct.type,
        images: finalCurrentProduct.images,
        sizes: finalCurrentProduct.sizes,
      }
      // Store updated context back to Redis
      if (sessionId) {
        try {
          await setContext(sessionId, context)
        } catch (error) {
          logger.warn('Failed to update context in Redis', { error })
        }
      }
    }
    
    // Log final product state for debugging
    if (pageType === "product") {
      logger.info(`Final product state for context`, {
        hasProduct: !!finalCurrentProduct,
        productId: finalCurrentProduct?.id,
        productName: finalCurrentProduct?.name,
        hasDescription: !!finalCurrentProduct?.description,
        descriptionLength: finalCurrentProduct?.description?.length || 0,
        hasName: !!finalCurrentProduct?.name,
        wasFetched: !!fetchedCurrentProduct,
        shopDomain
      })
    }
    
    // Use fetched products from backend, fallback to products from request (for demo/Next.js app)
    const allProductsToUse = fetchedProducts.length > 0 ? fetchedProducts : (allProducts || [])
    
    // Detect if user is asking about current product
    // CRITICAL: On product pages, ALWAYS assume questions about "this" refer to current product
    const isProductInquiry = pageType === "product" && !!finalCurrentProduct ? 
      (isAskingAboutCurrentProduct(message, true) || message.toLowerCase().includes("this")) : 
      isAskingAboutCurrentProduct(message, !!finalCurrentProduct)
    
    // Get product URL for direct Gemini analysis
    let productUrl: string | undefined = undefined
    if (finalCurrentProduct?.url && typeof finalCurrentProduct.url === "string" && finalCurrentProduct.url.startsWith("http")) {
      productUrl = finalCurrentProduct.url
    } else if (pageType === "product" && finalCurrentProduct?.id && shopDomain) {
      // Fallback: construct URL from shop domain
      const shopName = shopDomain.replace(/\.myshopify\.com$/, '').replace(/^https?:\/\//, '')
      productUrl = `https://${shopName}.myshopify.com/products/${finalCurrentProduct.id}`
    }
    
    let productPageAnalysis = null
        
    // Analyze product page if:
    // 1. User is asking about current product (explicit inquiry), OR
    // 2. User is on product page and message contains "this" (contextual inquiry)
    const shouldAnalyzePage = (isProductInquiry || (pageType === "product" && message.toLowerCase().includes("this"))) && finalCurrentProduct
    
    // For product inquiries, we'll send URL directly to Gemini for analysis
    // This is simpler and more reliable than pre-fetching content
    
    // ============ CRITICAL FIX: Extract filters from message for recommendations ============
    // Detect if user is asking for recommendations with filters (price, color, category)
    const isRecommendationQuery = isProductRecommendationQuery(message)
    
    // Extract filters from message (price, color, category)
    interface Filters {
      maxPrice?: number
      color?: string
      category?: string
    }
    
    function extractFilters(message: string): Filters {
      const filters: Filters = {}
      const messageLower = message.toLowerCase()
      
      // Extract price (e.g., "under $100", "less than $50", "below $75")
      const priceMatch = messageLower.match(/(?:under|less than|below|cheaper than|max|maximum|under|up to)\s*\$?(\d+)/)
      if (priceMatch) {
        filters.maxPrice = parseInt(priceMatch[1])
      }
      
      // Extract colors
      const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple', 'pink', 'orange', 'brown', 'gray', 'grey', 'navy', 'beige', 'tan']
      for (const color of colors) {
        if (messageLower.includes(color)) {
          filters.color = color
          break
        }
      }
      
      // Extract categories (customize for your store)
      const categories = ['snowboard', 'boots', 'bindings', 'jacket', 'pants', 'gloves', 'goggles', 'helmet', 'backpack', 'bag']
      for (const category of categories) {
        if (messageLower.includes(category)) {
          filters.category = category
          break
        }
      }
      
      logger.info('[Chat API] Extracted filters from message:', filters)
      
      return filters
    }
    
    // Get filtered products if filters are detected
    async function getFilteredProducts(shopDomain: string, filters: Filters): Promise<Product[]> {
      if (!shopDomain) return []
      
      try {
        const storefrontToken = await ensureStorefrontToken(shopDomain)
        if (!storefrontToken) {
          logger.warn('[Chat API] No storefront token for filtered products')
          return []
        }
        
        const adapter = new ShopifyProductAdapter(shopDomain, storefrontToken)
        
        // Fetch all products (or use Shopify search query if we have category)
        let allProductsList: CloselookProduct[] = []
        
        if (filters.category) {
          // Use Shopify search query for category
          const searchQuery = `product_type:${filters.category}`
          allProductsList = await adapter.getProductsByQuery(searchQuery, 50)
        } else {
          // Fetch all products
          allProductsList = await adapter.getAllProducts({ limit: 50 })
        }
        
        if (!allProductsList || allProductsList.length === 0) {
          logger.info('[Filter] No products found from Shopify')
          return []
        }
        
        logger.info('[Filter] Filtering', allProductsList.length, 'products with filters:', filters)
        
        let filtered = allProductsList.map((cp: CloselookProduct) => ({
          id: cp.id,
          name: cp.name,
          category: cp.category,
          type: cp.type,
          color: cp.color,
          price: cp.price,
          images: cp.images,
          description: cp.description,
          sizes: cp.sizes || [],
        }))
        
        // Filter by max price
        if (filters.maxPrice) {
          filtered = filtered.filter(p => 
            p.price && p.price <= filters.maxPrice!
          )
          logger.info('[Filter] After price filter (<= $' + filters.maxPrice + '):', filtered.length)
        }
        
        // Filter by category/type
        if (filters.category) {
          const categoryLower = filters.category.toLowerCase()
          filtered = filtered.filter(p => 
            p.category?.toLowerCase().includes(categoryLower) ||
            p.type?.toLowerCase().includes(categoryLower)
          )
          logger.info('[Filter] After category filter (' + filters.category + '):', filtered.length)
        }
        
        // Filter by color
        if (filters.color) {
          const colorLower = filters.color.toLowerCase()
          filtered = filtered.filter(p =>
            p.name?.toLowerCase().includes(colorLower) ||
            p.color?.toLowerCase().includes(colorLower) ||
            p.category?.toLowerCase().includes(colorLower)
          )
          logger.info('[Filter] After color filter (' + filters.color + '):', filtered.length)
        }
        
        return filtered
      } catch (error) {
        logger.error('[Filter] Error fetching filtered products', { error: error instanceof Error ? error.message : String(error) })
        return []
      }
    }

    // SCALABILITY: Use semantic search to retrieve only relevant products
    // This prevents sending entire catalog (e.g., 1000 products) to LLM
    // IMPORTANT: Always filter products when user is asking for recommendations, search, or product suggestions
    // This ensures content-aware responses based on actual Shopify catalog
    let relevantProducts: Product[] = []
    let queryIntent: QueryIntent | null = null
    let recommendations: any[] = []

    const catalogSize = allProductsToUse.length
    const isLargeCatalog = catalogSize > 50
    const needsProductFiltering = shouldFilterProducts(message)
    
    // ============ CRITICAL FIX: Apply filters for recommendations ============
    let filteredProducts: Product[] = []
    
    if (isRecommendationQuery) {
      logger.info('[Chat API] Detected recommendation query')
      
      // Extract filters from message
      const filters = extractFilters(message)
      
      if (Object.keys(filters).length > 0) {
        logger.info('[Chat API] Applying filters:', filters)
        
        // Get filtered products from Shopify
        if (shopDomain) {
          filteredProducts = await getFilteredProducts(shopDomain, filters)
        } else {
          // Fallback: filter from existing products
          filteredProducts = smartFilterProducts(allProductsToUse as Product[], message)
        }
        
        if (filteredProducts.length > 0) {
          logger.info('[Chat API] Found', filteredProducts.length, 'filtered products')
          // Use filtered products as relevant products
          relevantProducts = filteredProducts.slice(0, 10)
        } else {
          logger.info('[Chat API] No products found matching filters')
        }
      }
    }

    // Enhanced intent analysis using new productIntelligence module
    // This provides better intent detection with ticket creation support
    let enhancedIntent = null
    try {
      // Convert current product to Shopify format for intent analysis
      const shopifyCurrentProduct = finalCurrentProduct ? convertToShopifyFormat(finalCurrentProduct) : null
      enhancedIntent = analyzeUserIntent(message, shopifyCurrentProduct, conversationHistory || [])
      logger.info('[Chat API] Enhanced intent detected:', {
        type: enhancedIntent.type,
        wantsRecommendations: enhancedIntent.wantsRecommendations,
        wantsTicket: enhancedIntent.wantsTicket,
        ticketStage: enhancedIntent.ticketStage,
        filters: enhancedIntent.filters
      })
    } catch (error) {
      logger.warn('[Chat API] Enhanced intent analysis failed, using fallback', { error: error instanceof Error ? error.message : String(error) })
    }

    // Always filter products when:
    // 1. User is asking for recommendations/search (needsProductFiltering), OR
    // 2. Catalog is large (isLargeCatalog)
    // This ensures we only send relevant products to Gemini, making responses content-aware
    if (needsProductFiltering || isLargeCatalog || enhancedIntent?.wantsRecommendations) {
      try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY || ""
        
        // Extract query intent first (helps determine how many products to retrieve)
                 // Use enhanced intent if available, otherwise fallback to semantic search
         if (enhancedIntent && enhancedIntent.wantsRecommendations) {
           // Use enhanced intent for recommendations
           // Create a compatible QueryIntent object
           queryIntent = {
             intent: enhancedIntent.type === 'price_filter' ? 'search' : 'recommendation',
             confidence: 0.8,
             isPriceQuery: !!enhancedIntent.filters.maxPrice,
             isCategoryQuery: !!enhancedIntent.filters.category,
             isSizeQuery: false, // Enhanced intent doesn't have size filter yet
             filters: enhancedIntent.filters
           } as unknown as QueryIntent
        } else if (apiKey) {
          queryIntent = await extractQueryIntent(message, apiKey).catch((error) => {
            logger.warn("Intent extraction failed, using fallback", { error: error instanceof Error ? error.message : String(error) })
            return null
          })
        }

        // Retrieve only relevant products (top N based on query intent)
        // For recommendation queries, use higher limit to give Gemini more options
        const productLimit = queryIntent
          ? getProductLimitForQuery(queryIntent, catalogSize)
          : (needsProductFiltering ? 20 : 50) // Default: 20 for filtered queries, 50 for large catalogs

        // Use enhanced smart recommendations if available, otherwise fallback to existing methods
        if (enhancedIntent && enhancedIntent.wantsRecommendations && finalCurrentProduct) {
          try {
                                                   // Convert products to Shopify format for smart recommendations
              const productsArray: Product[] = Array.isArray(allProductsToUse) ? [...allProductsToUse] : []
              const shopifyProducts = convertProductsToShopifyFormat(productsArray)
              const shopifyCurrentProduct = convertToShopifyFormat(finalCurrentProduct)
            
            // Use new smart recommendations with complementary product pairs
            const smartRecs = await getSmartRecommendations(
              shopifyProducts,
              shopifyCurrentProduct,
              enhancedIntent
            )
            
            // Convert back to Product format
            relevantProducts = convertProductsFromShopifyFormat(smartRecs)
            logger.info('[Chat API] Using enhanced smart recommendations:', { count: relevantProducts.length })
          } catch (error) {
            logger.warn('[Chat API] Smart recommendations failed, using fallback', { error: error instanceof Error ? error.message : String(error) })
            // Fallback to filtered products or semantic search
            if (filteredProducts.length > 0) {
              relevantProducts = filteredProducts.slice(0, productLimit)
              logger.info('[Chat API] Using filtered products for recommendations')
            } else {
              relevantProducts = await retrieveRelevantProducts(allProductsToUse as Product[], message, {
                maxProducts: productLimit,
                useGeminiIntent: !!apiKey,
                apiKey: apiKey,
              })
            }
          }
        } else if (filteredProducts.length > 0) {
          relevantProducts = filteredProducts.slice(0, productLimit)
          logger.info('[Chat API] Using filtered products for recommendations')
        } else {
          relevantProducts = await retrieveRelevantProducts(allProductsToUse as Product[], message, {
            maxProducts: productLimit,
            useGeminiIntent: !!apiKey,
            apiKey: apiKey,
          })
        }

        logger.info(`Retrieved ${relevantProducts.length} relevant products from catalog of ${catalogSize} products`, {
          queryIntent: queryIntent?.intent,
          needsFiltering: needsProductFiltering,
          isLargeCatalog,
        })

        // Convert to recommendations format
        if (relevantProducts.length > 0) {
          recommendations = relevantProducts.slice(0, 10).map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            reason: `Matches your query criteria`,
            imageUrl: product.images?.[0] || undefined,
            url: shop ? `https://${shop.replace(/\.myshopify\.com$/, '')}.myshopify.com/products/${product.id}` : `/product/${product.id}`,
          }))
        }
      } catch (error) {
        logger.warn("Error in semantic search, falling back to simple filter", { error: error instanceof Error ? error.message : String(error) })
        // Fallback to simple filter
        relevantProducts = smartFilterProducts(allProductsToUse as Product[], message).slice(0, 20)
      }
    } else if (allProductsToUse.length > 0) {
      // For small catalogs and non-filtering queries (general questions, order queries, etc.),
      // still include products for context but limit to prevent token overflow
      // If catalog is small, sending all products is fine (they'll all be relevant)
      const maxProductsForSmallCatalog = Math.min(allProductsToUse.length, 50)
      relevantProducts = allProductsToUse.slice(0, maxProductsForSmallCatalog)
      logger.debug(`Using all products from small catalog (${allProductsToUse.length} products)`)
    }

    // Fetch order and policy data if needed (only when explicitly asked)
    let orderData: any = null
    let policies: any = null

    // Fetch orders only if query is about orders/account and we have customer info or order number
    // NOTE: shop domain should come from Shopify context (window.Shopify.shop) which is always myshopify.com
    // Even when customer is browsing on custom domain, Shopify context provides the myshopify.com domain
    // Use shopDomain from context if available, otherwise use shop
    const shopForOrders = shopDomain || shop
    if (shopForOrders && shouldFetchOrders) {
      try {
        // Get Shopify session for Admin API
        // Session key is myshopify.com domain (from OAuth)
        // Normalize shop domain to myshopify.com format for session lookup
        const normalizedShop = shopForOrders.includes('.myshopify.com') 
          ? shopForOrders 
          : shopForOrders.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const session = await getSession(normalizedShop)
        
        if (session && session.accessToken) {
            // Option 1: Fetch specific order by order number (from query)
            if (queryType.orderNumber) {
              try {
                const order = await fetchOrderByName(session, queryType.orderNumber)
                if (order) {
                  orderData = { order }
                }
              } catch (orderError) {
                logger.warn("Failed to fetch order by number", { 
                  error: orderError instanceof Error ? orderError.message : String(orderError) 
                })
              }
            }
            // Option 2: Use customer info from storefront context (internal fields only)
            else if (customerInternal) {
              // If we have customer email, use Admin API
              if (customerInternal.email) {
                try {
                  const orders = await fetchCustomerOrders(session, customerInternal.email, 10)
                  if (orders.length > 0) {
                    orderData = { orders }
                  }
                } catch (emailError) {
                  logger.warn("Failed to fetch orders by customer email", { 
                    error: emailError instanceof Error ? emailError.message : String(emailError) 
                  })
                }
              }
              // If we have customer access token, try Storefront API
              else if (customerInternal.accessToken) {
                try {
                  const { fetchCustomerOrdersFromStorefront } = await import("@/lib/shopify/storefront-client")
                  // Get storefront token from env or session
                  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || ""
                  if (storefrontToken && customerInternal.accessToken) {
                    const storefrontOrders = await fetchCustomerOrdersFromStorefront(
                      shop,
                      storefrontToken,
                      customerInternal.accessToken,
                      10
                    )
                    if (storefrontOrders.length > 0) {
                      orderData = { orders: storefrontOrders }
                    }
                  }
                } catch (storefrontError) {
                  logger.warn("Failed to fetch orders from storefront API", { 
                    error: storefrontError instanceof Error ? storefrontError.message : String(storefrontError) 
                  })
                }
              }
            }
            // Option 3: Extract email from query if mentioned
            else if (queryType.email) {
              // Validate email format before API call
              const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              if (emailPattern.test(queryType.email)) {
                try {
                  const orders = await fetchCustomerOrders(session, queryType.email, 10)
                  if (orders.length > 0) {
                    orderData = { orders }
                  }
                } catch (emailError) {
                  logger.warn("Failed to fetch orders by email", { 
                    error: emailError instanceof Error ? emailError.message : String(emailError),
                    email: queryType.email.substring(0, 10) + "..." // Log partial email for debugging
                  })
                }
              }
            }
          } else {
            logger.debug("No session found for shop, skipping order fetch", { 
              shop: shop.substring(0, 30) 
            })
          }
      } catch (error) {
        logger.warn("Failed to fetch order data", { 
          error: error instanceof Error ? error.message : String(error),
          shop: shop?.substring(0, 30) // Log partial shop for debugging
        })
        // Don't fail the entire request, continue without order data
      }
    }

    // Fetch policies only if query is about policies
    // NOTE: shop domain comes from Shopify context (always myshopify.com format)
    if (shopForOrders && shouldFetchPolicies) {
      try {
        const normalizedShop = shopForOrders.includes('.myshopify.com') 
          ? shopForOrders 
          : shopForOrders.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const session = await getSession(normalizedShop)
        
        if (session && session.accessToken) {
          try {
            policies = await fetchStorePolicies(session)
          } catch (policyError) {
            logger.warn("Failed to fetch policies", { 
              error: policyError instanceof Error ? policyError.message : String(policyError),
              shop: shop.substring(0, 30)
            })
            // Continue without policies
          }
        } else {
          logger.debug("No session or access token for policy fetch", { shop: shop.substring(0, 30) })
        }
      } catch (error) {
        logger.warn("Error in policy fetch logic", { 
          error: error instanceof Error ? error.message : String(error) 
        })
        // Don't fail request, continue without policies
      }
    }

    // Build context string using the new context service
    // This uses the context from Redis/widget and enriches it with product data
    let contextMessage = ""
    
    // Build enriched context object
    const enrichedContext = {
      ...context,
      page_type: pageType,
      current_product: finalCurrentProduct ? {
        id: finalCurrentProduct.id,
        name: finalCurrentProduct.name,
        title: finalCurrentProduct.name,
        price: finalCurrentProduct.price,
        description: finalCurrentProduct.description,
        category: finalCurrentProduct.category,
        type: finalCurrentProduct.type,
        images: finalCurrentProduct.images,
        sizes: finalCurrentProduct.sizes,
        vendor: finalCurrentProduct.vendor,
        productType: finalCurrentProduct.type,
        available: true, // Assume available if fetched from Shopify
      } : context?.current_product,
      shop_domain: shopDomain || context?.shop_domain,
      customer: context?.customer || (customerInternal ? {
        id: customerInternal.id,
        logged_in: !!customerInternal.id
      } : null),
      cart: context?.cart || null,
    }
    
    // Use enhanced context building from prompts.js
    // Build context in the format expected by buildContextPrompt
    const promptContext = {
      pageType: pageType,
      currentProduct: finalCurrentProduct ? {
        title: finalCurrentProduct.name,
        name: finalCurrentProduct.name,
        price: typeof finalCurrentProduct.price === 'number' 
          ? { min: finalCurrentProduct.price, currency: 'USD' }
          : finalCurrentProduct.price,
        description: finalCurrentProduct.description,
        productType: finalCurrentProduct.type || finalCurrentProduct.category,
        type: finalCurrentProduct.type,
        category: finalCurrentProduct.category,
        vendor: undefined,
        available: true,
        tags: [],
        variants: finalCurrentProduct.sizes?.map(size => ({
          title: size,
          available: true
        })) || [],
        images: finalCurrentProduct.images || []
      } : undefined,
      recommendedProducts: relevantProducts.slice(0, 10).map(p => ({
        id: p.id,
        title: p.name,
        name: p.name,
        price: typeof p.price === 'number' 
          ? { min: p.price, currency: 'USD' }
          : p.price,
        productType: p.type || p.category,
        type: p.type,
        category: p.category,
        tags: [],
        available: true,
        images: p.images || []
      })),
      customer: customerInternal ? {
        logged_in: !!customerInternal.id,
        id: customerInternal.id
      } : undefined,
      cart: context?.cart || null
    }

    // Try new enhanced context building, fallback to old method
    try {
      contextMessage = buildContextPrompt(promptContext, message)
      logger.info('[Chat API] Using enhanced context prompt')
    } catch (error) {
      logger.warn('[Chat API] Enhanced context building failed, using fallback', { error: error instanceof Error ? error.message : String(error) })
      // Fallback to original buildContextString
      contextMessage = buildContextString(enrichedContext)
    }
    
    // Add additional context for Gemini
    if (pageType === "home") {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the home page/catalog.\n` + contextMessage
    } else if (pageType === "product") {
      // PRIMARY PIPELINE: Send complete product details fetched from Shopify to Gemini
      // This is the main way to provide product information - fetched directly from Shopify API
      if (finalCurrentProduct && (finalCurrentProduct.id || finalCurrentProduct.name)) {
        // Build comprehensive product details message
        // ALWAYS include product context even if some fields are missing
        let productDetails = `\n\n═══════════════════════════════════════════════════════════\n`
        productDetails += `🎯 PRODUCT THE CUSTOMER IS VIEWING (Fetched from Shopify API):\n`
        productDetails += `═══════════════════════════════════════════════════════════\n\n`
        
        productDetails += `PRODUCT ID: ${finalCurrentProduct.id || "N/A"}\n`
        productDetails += `PRODUCT NAME: ${finalCurrentProduct.name || "N/A"}\n\n`
        
        if (finalCurrentProduct.description) {
          productDetails += `DESCRIPTION:\n${finalCurrentProduct.description}\n\n`
        } else {
          productDetails += `DESCRIPTION: Not available (product may be new or details still loading)\n\n`
        }
        
        if (finalCurrentProduct.category) {
          productDetails += `CATEGORY: ${finalCurrentProduct.category}\n`
        }
        if (finalCurrentProduct.type) {
          productDetails += `TYPE: ${finalCurrentProduct.type}\n`
        }
        if (finalCurrentProduct.color) {
          productDetails += `COLOR: ${finalCurrentProduct.color}\n`
        }
        if (finalCurrentProduct.price) {
          productDetails += `PRICE: $${finalCurrentProduct.price}\n`
        }
        if (finalCurrentProduct.sizes && finalCurrentProduct.sizes.length > 0) {
          productDetails += `AVAILABLE SIZES: ${finalCurrentProduct.sizes.join(", ")}\n`
        }
        if (finalCurrentProduct.images && finalCurrentProduct.images.length > 0) {
          productDetails += `IMAGES: ${finalCurrentProduct.images.length} image(s) available\n`
          // Include first image URL for context
          if (finalCurrentProduct.images[0]) {
            productDetails += `PRIMARY IMAGE URL: ${finalCurrentProduct.images[0]}\n`
          }
        }
        
        productDetails += `\n═══════════════════════════════════════════════════════════\n`
        productDetails += `⚠️ CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:\n`
        productDetails += `═══════════════════════════════════════════════════════════\n\n`
        productDetails += `1. The customer is viewing THIS SPECIFIC PRODUCT (${finalCurrentProduct.name || "Product ID: " + finalCurrentProduct.id}) on the product page.\n`
        productDetails += `2. When the customer says "this", "this product", "this item", "it", or asks questions like "Tell me more about this product", they are ALWAYS referring to THE PRODUCT DETAILS SHOWN ABOVE.\n`
        productDetails += `3. You MUST use the product information above to answer their questions. DO NOT ask "which product?" or say you're having trouble accessing product details.\n`
        productDetails += `4. If the description is missing, use the product name, category, type, color, price, and other available details to provide information.\n`
        productDetails += `5. If the customer asks "Tell me more about this product", provide comprehensive information based on what you know:\n`
        productDetails += `   - Product name: ${finalCurrentProduct.name || "N/A"}\n`
        productDetails += `   - Category: ${finalCurrentProduct.category || "N/A"}\n`
        productDetails += `   - Type: ${finalCurrentProduct.type || "N/A"}\n`
        productDetails += `   - Price: $${finalCurrentProduct.price || "N/A"}\n`
        productDetails += `   - Description: ${finalCurrentProduct.description ? "Available above" : "Use category and type to provide general information"}\n`
        productDetails += `6. Be comprehensive and informative - use ALL the product information available above.\n`
        productDetails += `7. DO NOT say you're having trouble accessing product details - you have the product information above.\n\n`
        
        // Combine with context string from buildContextString
        contextMessage = productDetails + '\n\n' + contextMessage
        
        // Log what we're sending to Gemini
        logger.info(`Product context message for Gemini`, {
          hasId: !!finalCurrentProduct.id,
          hasName: !!finalCurrentProduct.name,
          hasDescription: !!finalCurrentProduct.description,
          descriptionLength: finalCurrentProduct.description?.length || 0,
          hasCategory: !!finalCurrentProduct.category,
          hasType: !!finalCurrentProduct.type,
          hasPrice: !!finalCurrentProduct.price,
          hasImages: !!(finalCurrentProduct.images && finalCurrentProduct.images.length > 0),
          imageCount: finalCurrentProduct.images?.length || 0,
          shopDomain
        })
      } else {
        // Even without product data, clarify context
        logger.warn(`No product data available for product page context`, {
          pageType,
          hasCurrentProduct: !!finalCurrentProduct,
          currentProductId: finalCurrentProduct?.id,
          currentProductName: finalCurrentProduct?.name,
          shopDomain
        })
        contextMessage = `\n\nPAGE CONTEXT: The customer is viewing a specific product page.\n\nCRITICAL CONTEXT RULE: When the customer is on a product page, ANY mention of "this", "this product", "this item", "it", or questions about usage, features, durability, suitability, everyday use, daily use, etc., ALWAYS refers to the CURRENT PRODUCT shown on this page. NEVER ask which product they're referring to - always assume they mean the current product.\n` + contextMessage
      }
      
      // FALLBACK PIPELINE: If primary pipeline (Shopify API fetch) didn't work and user is asking about product
      // Try URL-based analysis as fallback
      // This only runs if we don't have complete product data from Shopify
      const hasCompleteProductData = finalCurrentProduct && finalCurrentProduct.name && finalCurrentProduct.description && finalCurrentProduct.images && finalCurrentProduct.images.length > 0
      
      if (isProductInquiry && productUrl && !hasCompleteProductData) {
        logger.info("Primary pipeline incomplete, attempting fallback URL analysis", { 
          hasName: !!finalCurrentProduct?.name,
          hasDescription: !!finalCurrentProduct?.description,
          hasImages: !!(finalCurrentProduct?.images && finalCurrentProduct.images.length > 0),
          productUrl 
        })
        
        // Try to fetch page content as fallback
        try {
          const apiKey = process.env.GOOGLE_GEMINI_API_KEY
          if (apiKey) {
            productPageAnalysis = await analyzeProductPage(productUrl, apiKey).catch((error) => {
              logger.warn("Fallback product page analysis failed", { 
                error: error instanceof Error ? error.message : String(error),
                productUrl 
              })
              return null
            })
          }
        } catch (error) {
          logger.warn("Error in fallback product page analysis", { error })
        }
        
        // Include URL and fetched content in context
        contextMessage += `\n\n═══════════════════════════════════════════════════════════\n`
        contextMessage += `🔄 FALLBACK: PRODUCT PAGE ANALYSIS (URL-based)\n`
        contextMessage += `═══════════════════════════════════════════════════════════\n\n`
        contextMessage += `PRODUCT PAGE URL: ${productUrl}\n\n`
        
        if (productPageAnalysis) {
          contextMessage += `✅ PRODUCT PAGE CONTENT (fetched and analyzed):\n`
        if (productPageAnalysis.summary) {
          contextMessage += `Summary: ${productPageAnalysis.summary}\n`
        }
        if (productPageAnalysis.enhancedDescription) {
            contextMessage += `Description: ${productPageAnalysis.enhancedDescription}\n`
        }
        if (productPageAnalysis.productDetails) {
            contextMessage += `Details: ${productPageAnalysis.productDetails}\n`
        }
        if (productPageAnalysis.designElements) {
            contextMessage += `Design: ${productPageAnalysis.designElements}\n`
        }
        if (productPageAnalysis.materials) {
          contextMessage += `Materials: ${productPageAnalysis.materials}\n`
        }
        if (productPageAnalysis.keyFeatures && productPageAnalysis.keyFeatures.length > 0) {
            contextMessage += `Features: ${productPageAnalysis.keyFeatures.join(", ")}\n`
        }
          contextMessage += `\nUse the information above to provide comprehensive details about "this product".`
        } else {
          // If we couldn't fetch, instruct Gemini to fetch/analyze the URL
          contextMessage += `⚠️ IMPORTANT: Please fetch and analyze the product page at the URL above to answer the customer's question about "this product".\n`
          contextMessage += `Use any available web search or URL fetching capabilities to retrieve the page content and provide accurate information.\n`
        }
      }
    } else {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the store.\n` + contextMessage
    }

    // Add order data to context if available
    if (orderData) {
      if (orderData.order) {
        // Single order from Admin API
        const order = orderData.order
        const fulfillment = order.fulfillments?.[0]
        const deliveryDate = fulfillment?.estimatedDeliveryAt
          ? new Date(fulfillment.estimatedDeliveryAt).toLocaleDateString()
          : null
        const trackingNumber = fulfillment?.trackingInfo?.[0]?.number
        const trackingCompany = fulfillment?.trackingInfo?.[0]?.company
        const trackingUrl = fulfillment?.trackingInfo?.[0]?.url

        contextMessage += `\n\nORDER_DATA:\n`
        contextMessage += `Order Number: ${order.name || order.orderNumber}\n`
        contextMessage += `Status: ${order.displayFulfillmentStatus || order.fulfillmentStatus || order.displayFinancialStatus || order.financialStatus}\n`
        contextMessage += `Created: ${new Date(order.createdAt).toLocaleDateString()}\n`
        
        // Handle both Admin API and Storefront API price formats
        const totalAmount = order.totalPriceSet?.shopMoney?.amount || order.totalPrice?.amount
        const currencyCode = order.totalPriceSet?.shopMoney?.currencyCode || order.totalPrice?.currencyCode
        contextMessage += `Total: ${totalAmount || "N/A"} ${currencyCode || ""}\n`
        
        if (deliveryDate) {
          contextMessage += `Estimated Delivery: ${deliveryDate}\n`
        }
        if (trackingNumber) {
          contextMessage += `Tracking: ${trackingCompany || ""} ${trackingNumber}\n`
          if (trackingUrl) {
            contextMessage += `Tracking URL: ${trackingUrl}\n`
          }
        }
        
        // Handle both Admin API and Storefront API line item formats
        const lineItems = order.lineItems?.edges || order.lineItems || []
        if (lineItems.length > 0) {
          contextMessage += `Items:\n${lineItems.map((item: any) => {
            const node = item.node || item
            const variant = node.variant || {}
            const options = variant.selectedOptions || []
            const optionStr = options.map((opt: any) => `${opt.name}: ${opt.value}`).join(", ")
            return `- ${node.title}${optionStr ? ` (${optionStr})` : ""} x${node.quantity || 1}`
          }).join("\n")}\n`
        }
      } else if (orderData.orders && orderData.orders.length > 0) {
        // Multiple orders (order history)
        contextMessage += `\n\nORDER_HISTORY:\n`
        contextMessage += `The customer has ${orderData.orders.length} recent order(s):\n`
        orderData.orders.slice(0, 5).forEach((order: any) => {
          const deliveryDate = order.fulfillments?.[0]?.estimatedDeliveryAt
            ? new Date(order.fulfillments[0].estimatedDeliveryAt).toLocaleDateString()
            : null
          
          contextMessage += `\nOrder ${order.name || order.orderNumber}:\n`
          contextMessage += `- Status: ${order.displayFulfillmentStatus || order.fulfillmentStatus || order.displayFinancialStatus || order.financialStatus}\n`
          contextMessage += `- Date: ${new Date(order.createdAt).toLocaleDateString()}\n`
          
          // Handle both API formats
          const totalAmount = order.totalPriceSet?.shopMoney?.amount || order.totalPrice?.amount
          const currencyCode = order.totalPriceSet?.shopMoney?.currencyCode || order.totalPrice?.currencyCode
          contextMessage += `- Total: ${totalAmount || "N/A"} ${currencyCode || ""}\n`
          
          if (deliveryDate) {
            contextMessage += `- Estimated Delivery: ${deliveryDate}\n`
          }
          
          // Extract sizing information from past orders
          const lineItems = order.lineItems?.edges || order.lineItems || []
          if (lineItems && Array.isArray(lineItems)) {
            lineItems.forEach((item: any) => {
              const node = item.node || item
              const variant = node.variant || {}
              const options = variant.selectedOptions || []
              const sizeOption = options.find((opt: any) => opt.name.toLowerCase().includes("size"))
              if (sizeOption) {
                contextMessage += `- Previously ordered size: ${sizeOption.value} for ${node.title}\n`
              }
            })
          }
        })
      }
    }

    // Add policies to context if available
    if (policies) {
      contextMessage += `\n\nSTORE_POLICIES:\n`
      if (policies.shippingPolicy) {
        contextMessage += `\nSHIPPING POLICY:\n${policies.shippingPolicy.substring(0, 500)}${policies.shippingPolicy.length > 500 ? "..." : ""}\n`
      }
      if (policies.refundPolicy) {
        contextMessage += `\nREFUND POLICY:\n${policies.refundPolicy.substring(0, 500)}${policies.refundPolicy.length > 500 ? "..." : ""}\n`
      }
      if (policies.privacyPolicy) {
        contextMessage += `\nPRIVACY POLICY:\n${policies.privacyPolicy.substring(0, 500)}${policies.privacyPolicy.length > 500 ? "..." : ""}\n`
      }
      if (policies.termsOfService) {
        contextMessage += `\nTERMS OF SERVICE:\n${policies.termsOfService.substring(0, 500)}${policies.termsOfService.length > 500 ? "..." : ""}\n`
      }
    }

    // Add customer name for personalization if available
    if (customerName) {
      contextMessage += `\n\nCUSTOMER NAME: ${customerName}\nUse the customer's name to personalize your responses when appropriate.`
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

    // Build system prompt with customer name for personalization
    let systemPrompt = buildSystemPrompt(customerName)
    
    // CRITICAL: If we're on a product page and have product data, emphasize it strongly
    if (pageType === "product" && finalCurrentProduct && (finalCurrentProduct.id || finalCurrentProduct.name)) {
      systemPrompt += `\n\n🔴 CRITICAL: THE CUSTOMER IS VIEWING A SPECIFIC PRODUCT PAGE.\n`
      systemPrompt += `🔴 PRODUCT DATA IS PROVIDED IN THE CONTEXT MESSAGE BELOW.\n`
      systemPrompt += `🔴 WHEN THE CUSTOMER ASKS "Tell me more about this product" OR ANY QUESTION ABOUT "this product", "this item", "it", etc.,\n`
      systemPrompt += `🔴 YOU MUST USE THE PRODUCT INFORMATION PROVIDED IN THE CONTEXT MESSAGE TO ANSWER.\n`
      systemPrompt += `🔴 DO NOT say you're having trouble accessing product details - THE PRODUCT DATA IS IN THE CONTEXT MESSAGE.\n`
      systemPrompt += `🔴 DO NOT ask "which product?" - THEY ARE VIEWING THE PRODUCT SHOWN IN THE CONTEXT MESSAGE.\n`
      systemPrompt += `🔴 PROVIDE DETAILED, SPECIFIC INFORMATION ABOUT THE PRODUCT USING THE DATA PROVIDED.\n\n`
    }
    
    // Enhance system prompt based on query intent and available products
    // This ensures Gemini understands what type of response to give
    if (queryIntent) {
      if (queryIntent.intent === "search" && relevantProducts.length > 0) {
        systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria. ${relevantProducts.length} relevant product(s) were found matching their query from the Shopify catalog. When responding, mention these products and use the PRODUCT_RECOMMENDATION format for each matching product. All products shown are real products from the store catalog.`
      } else if (queryIntent.intent === "search" && relevantProducts.length === 0) {
        systemPrompt += `\n\nIMPORTANT: The customer asked for products matching specific criteria, but no products were found matching their exact query in the Shopify catalog. Politely inform them that no products match their criteria, but suggest similar products from the AVAILABLE PRODUCTS list or ask if they'd like to adjust their search.`
      } else if (queryIntent.intent === "recommendation") {
        systemPrompt += `\n\nIMPORTANT: The customer is asking for product recommendations. Use the AVAILABLE PRODUCTS listed above (all from the Shopify catalog) to suggest relevant products that match their needs, preferences, or the scenario they described. Analyze the query intent, category preferences, price range, colors, and any scenario mentioned (e.g., "winter wedding", "casual wear"). Use the PRODUCT_RECOMMENDATION format for each recommendation. All recommended products must be from the AVAILABLE PRODUCTS list above.`
      } else if (queryIntent.intent === "comparison") {
        systemPrompt += `\n\nIMPORTANT: The customer wants to compare products. Use the AVAILABLE PRODUCTS listed above to provide detailed comparisons. Use the PRODUCT_RECOMMENDATION format when mentioning products.`
      } else if (queryIntent.intent === "question" && relevantProducts.length > 0) {
        systemPrompt += `\n\nIMPORTANT: The customer has a question, but ${relevantProducts.length} relevant product(s) are available in case you need to reference or recommend products in your answer. Use the PRODUCT_RECOMMENDATION format if you mention any products.`
      }
    } else if (needsProductFiltering && relevantProducts.length > 0) {
      // User asked for recommendations/search but intent extraction didn't work
      systemPrompt += `\n\nIMPORTANT: The customer is asking for product recommendations or searching for products. ${relevantProducts.length} relevant product(s) matching their query have been filtered from the Shopify catalog. When recommending products, use the PRODUCT_RECOMMENDATION format for each suggestion. All products shown are real products from the store catalog.`
    } else if (relevantProducts.length > 0 && catalogSize > 0) {
      // General case: products are available
      systemPrompt += `\n\nIMPORTANT: ${relevantProducts.length} product(s) from the Shopify catalog are available. When recommending or mentioning products, use the PRODUCT_RECOMMENDATION format for each suggestion. All products shown are real products from the store catalog.`
    } else if (shop && catalogSize === 0) {
      // No products found in Shopify catalog
      systemPrompt += `\n\nNOTE: The Shopify catalog appears to be empty or products could not be fetched. If the customer asks about products, politely let them know that product information is currently unavailable.`
    }

    // Get conversation history from Redis if available, otherwise use provided history
    let history = conversationHistory || []
    if (sessionId) {
      try {
        const storedHistory = await getConversationHistory(sessionId)
        if (storedHistory && storedHistory.length > history.length) {
          history = storedHistory
        }
      } catch (error) {
        logger.warn('Failed to load conversation history from Redis', { error })
      }
    }
    
    // Use the message as-is for primary pipeline (product data is already in context)
    // Only add URL to user message if primary pipeline failed and we're using fallback
    let userMessage = message
    const hasCompleteProductData = finalCurrentProduct && finalCurrentProduct.name && finalCurrentProduct.description && finalCurrentProduct.images && finalCurrentProduct.images.length > 0
    if (isProductInquiry && productUrl && !hasCompleteProductData) {
      // Fallback: add URL to user message only if we don't have complete product data
      userMessage = `${message}\n\n[IMPORTANT: Please fetch and analyze the product page at this URL to answer: ${productUrl}]`
      logger.info("Using fallback: Added product URL to user message", { productUrl, hasCompleteProductData })
    } else if (isProductInquiry && hasCompleteProductData) {
      logger.info("Using primary pipeline: Product data fetched from Shopify API", { 
        productName: finalCurrentProduct.name,
        hasDescription: !!finalCurrentProduct.description,
        imageCount: finalCurrentProduct.images?.length || 0
      })
    }
    
    // CRITICAL: Ensure context message is always included, especially for product pages
    // Log the context message being sent to Gemini for debugging
    if (pageType === "product" && isProductInquiry) {
      logger.info(`Sending product inquiry to Gemini`, {
        contextMessageLength: contextMessage.length,
        hasProductData: !!finalCurrentProduct,
        productName: finalCurrentProduct?.name,
        productId: finalCurrentProduct?.id,
        userMessage: userMessage.substring(0, 100),
        shopDomain
      })
    }
    
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
        parts: [{ text: userMessage }],
      },
    ]

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const chat = model.startChat({
      history: messages.slice(0, -1),
    })

    // Generate response with timeout protection
    let text: string
    try {
      const result = await Promise.race([
        chat.sendMessage(message),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("AI response timeout")), 30000)
        ),
      ]) as any
      
      const response = result.response
      text = response.text()
      
      // Validate response
      if (!text || typeof text !== "string") {
        throw new Error("Invalid AI response format")
      }
    } catch (aiError) {
      logger.error("AI service error", { 
        error: aiError instanceof Error ? aiError.message : String(aiError) 
      })
      
      // Provide fallback response
      text = customerName 
        ? `I apologize ${customerName}, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to ask me about our products, policies, or order information.`
        : "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to ask me about our products, policies, or order information."
      
      // Return early with fallback response
      const fallbackResponse = NextResponse.json({
        message: text,
        recommendations: [],
        ticketCreated: false,
      })
      return addCorsHeaders(fallbackResponse, request)
    }

    // Extract product recommendations from LLM response
    // This handles both PRODUCT_RECOMMENDATION JSON format and plain text mentions
    const { cleanedText, extractedProducts: llmRecommendations } = extractProductsFromResponse(
      text,
      allProductsToUse || [],
    )
    
    // Enrich LLM recommendations with full product details (imageUrl, url) for widget
    const enrichedLlmRecommendations = llmRecommendations.map((rec: any) => {
      const fullProduct = allProductsToUse.find((p: Product) => p.id === rec.id)
      return {
        ...rec,
        imageUrl: fullProduct?.images?.[0] || rec.imageUrl,
        url: shop && fullProduct 
          ? `https://${shop.replace(/\.myshopify\.com$/, '')}.myshopify.com/products/${rec.id}`
          : rec.url || `/product/${rec.id}`,
      }
    })

    // Extract ticket creation request if user confirms ticket creation
    let ticketCreated = false
    let ticketMessage = ""
    
    // Check both chatbot response and user message for ticket creation
    const conversationLength = (conversationHistory || []).length
    const shouldCheckForTicket = conversationLength >= 2 // After a few exchanges
    
    // NEW: Check for ticket creation markers in AI response (from enhanced prompt system)
    if (text) {
      const ticketData = extractTicketData(text)
      if (ticketData) {
        try {
          const ticketId = await createSupportTicket(
            ticketData,
            {
              session_id: sessionId,
              shop_domain: shop || '',
              customer_id: customerInternal?.id || 'guest'
            }
          )
          
          // Format response with ticket ID
          text = formatTicketResponse(text, ticketId)
          ticketCreated = true
          ticketMessage = `✅ Support ticket created! Reference #${ticketId}. Our team will contact you within 24 hours.`
          logger.info('[Chat API] Ticket created via enhanced system:', { ticketId })
        } catch (error) {
          logger.error('[Chat API] Failed to create ticket via enhanced system', { error: error instanceof Error ? error.message : String(error) })
          // Continue with fallback ticket creation
        }
      }
    }
    
    // Enhanced intent can also trigger ticket creation flow
    if (!ticketCreated && enhancedIntent && enhancedIntent.wantsTicket && enhancedIntent.ticketStage === 'create') {
      try {
        const ticketData = {
          issue: message,
          context: finalCurrentProduct ? `Product: ${finalCurrentProduct.name}` : undefined
        }
        const ticketId = await createSupportTicket(
          ticketData,
          {
            session_id: sessionId,
            shop_domain: shop || '',
            customer_id: customerInternal?.id || 'guest'
          }
        )
        ticketCreated = true
        ticketMessage = `✅ Support ticket created! Reference #${ticketId}. Our team will contact you within 24 hours.`
        logger.info('[Chat API] Ticket created via intent analysis:', { ticketId })
      } catch (error) {
        logger.error('[Chat API] Failed to create ticket via intent', { error: error instanceof Error ? error.message : String(error) })
      }
    }
    
    // FALLBACK: Use existing ticket creation system
    if (!ticketCreated && shouldCheckForTicket && shop) {
      // Check user message first (most direct)
      let ticketRequest = extractTicketRequest(message, customerName)
      
      // If not found in user message, check chatbot response
      if (!ticketRequest) {
        ticketRequest = extractTicketRequest(text, customerName)
      }
      
      // If user explicitly confirms ticket creation (yes, create ticket, etc.)
      const userConfirmsTicket = /(?:yes|yeah|sure|okay|ok|create|make|please).*(?:ticket|support|help|issue)/i.test(message)
      
      if (ticketRequest || userConfirmsTicket) {
        // Use issue from ticket request, or extract from user message, or use chatbot response
        const issue = ticketRequest?.issue || 
                     (userConfirmsTicket ? message : text.substring(0, 500))
        
        if (issue && issue.length > 10) { // Ensure meaningful issue description
          // NOTE: shop can be any domain (custom or myshopify.com)
          // Session lookup will handle domain mapping
          try {
            const session = await getSession(shop)
            if (session && session.accessToken) {
              try {
                const result = await Promise.race([
                  createCustomerNote(session, {
                    issue: issue.substring(0, 1000), // Limit issue length
                    customerName: (ticketRequest?.customerName || customerName)?.substring(0, 100),
                    customerEmail: customerInternal?.email?.substring(0, 255),
                    customerId: customerInternal?.id?.substring(0, 200),
                    conversationHistory: (conversationHistory || []).slice(-5), // Last 5 messages only
                  }),
                  new Promise<{ success: boolean; error?: string }>((_, reject) =>
                    setTimeout(() => reject(new Error("Ticket creation timeout")), 10000)
                  ),
                ])
                
                if (result.success) {
                  ticketCreated = true
                  ticketMessage = "✅ I've created a support ticket for you! Our team will review your issue and get back to you soon. Is there anything else I can help you with?"
                  logger.info("Ticket created successfully", { shop: shop.substring(0, 20) })
                } else {
                  logger.warn("Failed to create ticket", { 
                    error: result.error,
                    shop: shop.substring(0, 20)
                  })
                  ticketMessage = "I apologize, but I couldn't create the ticket right now. Please try again later or contact support directly."
                }
              } catch (ticketError) {
                logger.error("Error creating ticket", { 
                  error: ticketError instanceof Error ? ticketError.message : String(ticketError),
                  shop: shop.substring(0, 20)
                })
                ticketMessage = "I apologize, but I encountered an error creating your ticket. Please contact support directly."
              }
            } else {
              logger.warn("No valid session for ticket creation", { shop: shop.substring(0, 20) })
              ticketMessage = "I'm unable to create a ticket right now. Please contact support directly."
            }
          } catch (error) {
            logger.error("Critical error in ticket creation", { 
              error: error instanceof Error ? error.message : String(error) 
            })
            // Don't expose error details to user
          }
        } else {
          logger.debug("Issue description too short for ticket creation", { issueLength: issue?.length || 0 })
        }
      }
    }

    // Prioritize semantically retrieved products if available
    // Otherwise use LLM-extracted recommendations
    // If both exist, merge them (prefer semantic for duplicates)
    const finalRecommendations: any[] = []

    if (relevantProducts.length > 0 && recommendations.length > 0) {
      // Add semantic recommendations first
      finalRecommendations.push(...recommendations)
      
      // Add LLM recommendations that aren't already included
      for (const llmRec of enrichedLlmRecommendations) {
        if (!finalRecommendations.some((r) => r.id === llmRec.id)) {
          finalRecommendations.push(llmRec)
        }
      }
    } else {
      // Use LLM recommendations if no semantic recommendations
      finalRecommendations.push(...enrichedLlmRecommendations)
    }

    // Prepare response message
    let responseMessage = cleanedText.trim()
    
    // If ticket was created, append confirmation message
    if (ticketCreated && ticketMessage) {
      responseMessage = `${responseMessage}\n\n✅ ${ticketMessage}`
    }

    const response = NextResponse.json({
      message: responseMessage,
      recommendations: finalRecommendations,
      ticketCreated,
    })
    
    return addCorsHeaders(response, request)
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
    
    const response = NextResponse.json(sanitizedError, { status: statusCode })
    return addCorsHeaders(response, request)
  }
}

export const config = {
  maxDuration: 60,
}
