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
import { validateChatInput } from "@/lib/production-validation"
import { addCorsHeaders, createCorsPreflightResponse, isAllowedOrigin } from "@/lib/cors-headers"
import { ShopifyProductAdapter } from "@/lib/closelook-plugin/adapters/shopify-adapter"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"
import { analyzeProductPage } from "@/lib/product-page-analyzer"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request)
}

// Validate API key on startup
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  logger.warn("GOOGLE_GEMINI_API_KEY is not set. Chat functionality will be limited.")
}

// Build system prompt with customer name if available
function buildSystemPrompt(customerName?: string): string {
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
      return NextResponse.json(
        { error: "Invalid request format", details: "Request body must be valid JSON" },
        { status: 400 }
      )
    }

    // Validate all inputs
    const validation = validateChatInput(requestBody)
    if (!validation.isValid) {
      logger.warn("Input validation failed", { errors: validation.errors })
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: validation.errors.join(", ") 
        },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: "Message is required and cannot be empty" },
        { status: 400 }
      )
    }

    // Detect query type (order, policy, account, etc.)
    // Only fetch data when explicitly asked
    const queryType = detectQueryType(message)
    
    // Smart detection: Only fetch if query is clearly about orders/account
    const shouldFetchOrders = queryType.isOrder || queryType.isAccount
    const shouldFetchPolicies = queryType.isPolicy

    // BACKEND LOGIC: Fetch products and current product from Shopify if shop domain is provided
    // Widget should only send shop domain and product ID, backend handles all fetching and mapping
    let fetchedProducts: Product[] = []
    let fetchedCurrentProduct: Product | undefined = currentProduct
    
    if (shop) {
      try {
        // Get Shopify session to access Storefront API
        const session = await getSession(shop)
        
        // Check if we have storefront token in environment (for widget context)
        // Or use session's storefront token if available
        const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || session?.storefrontToken
        
        if (storefrontToken) {
          const adapter = new ShopifyProductAdapter(shop, storefrontToken)
          
          // Fetch current product details if product ID is provided (widget sends minimal data)
          if (currentProduct && currentProduct.id && !currentProduct.category) {
            try {
              // Widget only sends ID, backend fetches full details
              const closelookProduct = await adapter.getProduct(currentProduct.id)
              if (closelookProduct) {
                fetchedCurrentProduct = {
                  id: closelookProduct.id,
                  name: closelookProduct.name,
                  category: closelookProduct.category,
                  type: closelookProduct.type,
                  color: closelookProduct.color,
                  price: closelookProduct.price,
                  images: closelookProduct.images,
                  description: closelookProduct.description,
                  sizes: closelookProduct.sizes,
                  // Preserve URL from frontend if available (needed for product page analysis)
                  url: currentProduct.url,
                }
                logger.info(`Fetched current product details from Shopify: ${currentProduct.id}`, {
                  hasUrl: !!currentProduct.url
                })
              }
            } catch (productError) {
              logger.warn("Error fetching current product from Shopify", { 
                error: productError instanceof Error ? productError.message : String(productError),
                productId: currentProduct.id 
              })
              // Keep the minimal product data from widget
            }
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
          
          logger.info(`Fetched ${fetchedProducts.length} products from Shopify for shop ${shop}`)
        } else {
          logger.warn(`No storefront token available for shop ${shop}, using products from request if provided`)
        }
      } catch (error) {
        logger.error("Error fetching products from Shopify", { 
          error: error instanceof Error ? error.message : String(error),
          shop 
        })
        // Fallback to products from request if available
      }
    }
    
    // Use fetched current product or fallback to provided one
    currentProduct = fetchedCurrentProduct || currentProduct
    
    // Use fetched products from backend, fallback to products from request (for demo/Next.js app)
    const allProductsToUse = fetchedProducts.length > 0 ? fetchedProducts : (allProducts || [])
    
    // Detect if user is asking about current product
    // CRITICAL: On product pages, ALWAYS assume questions about "this" refer to current product
    const isProductInquiry = pageContext === "product" && !!currentProduct ? 
      (isAskingAboutCurrentProduct(message, true) || message.toLowerCase().includes("this")) : 
      isAskingAboutCurrentProduct(message, !!currentProduct)
    
    let productPageAnalysis = null
    
    // Analyze product page if:
    // 1. User is asking about current product (explicit inquiry), OR
    // 2. User is on product page and message contains "this" (contextual inquiry)
    const shouldAnalyzePage = (isProductInquiry || (pageContext === "product" && message.toLowerCase().includes("this"))) && currentProduct
    
    if (shouldAnalyzePage && currentProduct) {
      try {
        // Construct product URL
        let productUrl: string | undefined = undefined
        
        // Priority 1: Use product.url from request if available (already validated in frontend)
        if (currentProduct.url && typeof currentProduct.url === "string" && currentProduct.url.startsWith("http")) {
          productUrl = currentProduct.url
        } 
        // Priority 2: Construct URL from shop domain if available
        else if (shop && currentProduct.id) {
          // For Shopify stores, construct the product URL
          // Note: This uses product ID, but Shopify URLs typically use handle
          // However, this should still work for page analysis
          const shopDomain = shop.replace(/\.myshopify\.com$/, '')
          productUrl = `https://${shopDomain}.myshopify.com/products/${currentProduct.id}`
        }
        // For demo/Next.js app with relative URLs, skip analysis
        else if (currentProduct.id) {
          // We can't analyze relative URLs, so skip
          logger.debug("Skipping page analysis for relative URL", { productId: currentProduct.id })
        }
        
        // Analyze product page if we have a valid URL
        if (productUrl) {
          logger.info("Analyzing product page for inquiry", { productUrl, productId: currentProduct.id })
          const apiKey = process.env.GOOGLE_GEMINI_API_KEY
          if (apiKey) {
            try {
              productPageAnalysis = await analyzeProductPage(productUrl, apiKey).catch((error) => {
                logger.warn("Product page analysis failed, continuing without it", { 
                  error: error instanceof Error ? error.message : String(error),
                  productUrl 
                })
                return null
              })
              
              if (productPageAnalysis) {
                logger.info("Product page analysis successful", { productId: currentProduct.id })
              }
            } catch (error) {
              logger.warn("Error during product page analysis", { 
                error: error instanceof Error ? error.message : String(error) 
              })
            }
          }
        }
      } catch (error) {
        logger.warn("Error in product page analysis flow", { 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }
    
    // SCALABILITY: Use semantic search to retrieve only relevant products
    // This prevents sending entire catalog (e.g., 1000 products) to LLM
    let relevantProducts: Product[] = []
    let queryIntent: QueryIntent | null = null
    let recommendations: any[] = []

    const catalogSize = allProductsToUse.length
    const isLargeCatalog = catalogSize > 50

    // For large catalogs, use intelligent product retrieval
    if (isLargeCatalog && allProductsToUse.length > 0) {
      try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY || ""
        
        // Extract query intent first (helps determine how many products to retrieve)
        if (apiKey) {
          queryIntent = await extractQueryIntent(message, apiKey).catch((error) => {
            logger.warn("Intent extraction failed, using fallback", { error: error instanceof Error ? error.message : String(error) })
            return null
          })
        }

        // Retrieve only relevant products (top N based on query intent)
        const productLimit = queryIntent
          ? getProductLimitForQuery(queryIntent, catalogSize)
          : 20 // Default limit

        relevantProducts = await retrieveRelevantProducts(allProductsToUse as Product[], message, {
          maxProducts: productLimit,
          useGeminiIntent: !!apiKey,
          apiKey: apiKey,
        })

        logger.debug(`Retrieved ${relevantProducts.length} relevant products from catalog of ${catalogSize} products`)

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
      // For small catalogs, use simple filtering
      const isSearchQuery = isProductSearchQuery(message)
      if (isSearchQuery) {
        relevantProducts = smartFilterProducts(allProductsToUse as Product[], message)
        if (relevantProducts.length > 0) {
          recommendations = relevantProducts.slice(0, 10).map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            reason: `Matches your search criteria`,
            imageUrl: product.images?.[0] || undefined,
            url: shop ? `https://${shop.replace(/\.myshopify\.com$/, '')}.myshopify.com/products/${product.id}` : `/product/${product.id}`,
          }))
        }
      } else {
        // For small catalogs and non-search queries, use all products
        relevantProducts = allProductsToUse as Product[]
      }
    }

    // Fetch order and policy data if needed (only when explicitly asked)
    let orderData: any = null
    let policies: any = null

    // Fetch orders only if query is about orders/account and we have customer info or order number
    // NOTE: shop domain should come from Shopify context (window.Shopify.shop) which is always myshopify.com
    // Even when customer is browsing on custom domain, Shopify context provides the myshopify.com domain
    if (shop && shouldFetchOrders) {
      try {
        // Get Shopify session for Admin API
        // Session key is myshopify.com domain (from OAuth)
        const session = await getSession(shop)
        
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
    if (shop && shouldFetchPolicies) {
      try {
        const session = await getSession(shop)
        
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

    let contextMessage = ""

    if (pageContext === "home") {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the home page/catalog.\n`
    } else if (pageContext === "product") {
      // CRITICAL: Always provide product context when on product page, even if product data is minimal
      if (currentProduct) {
        contextMessage = `\n\nPAGE CONTEXT: The customer is viewing a specific product page.\n\nCRITICAL CONTEXT RULE: When the customer is on a product page, ANY mention of "this", "this product", "this item", "it", or questions about usage, features, durability, suitability, everyday use, daily use, etc., ALWAYS refers to the CURRENT PRODUCT shown on this page. NEVER ask which product they're referring to - always assume they mean the current product.\n\nCURRENT PRODUCT:\nName: ${currentProduct.name || "Product"}\n${currentProduct.category ? `Category: ${currentProduct.category}\n` : ""}${currentProduct.type ? `Type: ${currentProduct.type}\n` : ""}${currentProduct.color ? `Color: ${currentProduct.color}\n` : ""}${currentProduct.price ? `Price: $${currentProduct.price}\n` : ""}${currentProduct.description ? `Description: ${currentProduct.description}\n` : ""}`
      } else {
        // Even without product data, clarify context
        contextMessage = `\n\nPAGE CONTEXT: The customer is viewing a specific product page.\n\nCRITICAL CONTEXT RULE: When the customer is on a product page, ANY mention of "this", "this product", "this item", "it", or questions about usage, features, durability, suitability, everyday use, daily use, etc., ALWAYS refers to the CURRENT PRODUCT shown on this page. NEVER ask which product they're referring to - always assume they mean the current product.\n`
      }
      
      // Add detailed product page analysis if available (for any product inquiry)
      if (productPageAnalysis && shouldAnalyzePage) {
        contextMessage += `\n\nDETAILED PRODUCT ANALYSIS (from product page):\n`
        if (productPageAnalysis.summary) {
          contextMessage += `Summary: ${productPageAnalysis.summary}\n`
        }
        if (productPageAnalysis.enhancedDescription) {
          contextMessage += `Enhanced Description: ${productPageAnalysis.enhancedDescription}\n`
        }
        if (productPageAnalysis.productDetails) {
          contextMessage += `Product Details: ${productPageAnalysis.productDetails}\n`
        }
        if (productPageAnalysis.designElements) {
          contextMessage += `Design Elements: ${productPageAnalysis.designElements}\n`
        }
        if (productPageAnalysis.materials) {
          contextMessage += `Materials: ${productPageAnalysis.materials}\n`
        }
        if (productPageAnalysis.keyFeatures && productPageAnalysis.keyFeatures.length > 0) {
          contextMessage += `Key Features: ${productPageAnalysis.keyFeatures.join(", ")}\n`
        }
        
        contextMessage += `\nIMPORTANT: The customer is asking about this product. Use the detailed product analysis above to provide comprehensive information about the product. Be thorough, informative, and highlight key features, materials, design elements, and other relevant details from the product page analysis.`
      }
    } else {
      contextMessage = `\n\nPAGE CONTEXT: The customer is browsing the Closelook store.\n`
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
      return NextResponse.json({
        message: text,
        recommendations: [],
        ticketCreated: false,
      })
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
    
    if (shouldCheckForTicket && shop) {
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
