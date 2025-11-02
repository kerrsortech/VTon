/**
 * Semantic Product Search for Scalable Product Recommendations
 * 
 * This module implements intelligent product retrieval that:
 * 1. Extracts query intent using Gemini
 * 2. Filters products programmatically based on intent
 * 3. Ranks products by relevance
 * 4. Returns only top N most relevant products
 * 
 * This ensures the LLM only receives relevant products, not the entire catalog.
 */

import type { Product } from "./closelook-types"
import { smartFilterProducts } from "./product-filter"
import { GoogleGenAI } from "@google/genai"
import { logger } from "./server-logger"

export interface QueryIntent {
  intent: "search" | "recommendation" | "question" | "comparison"
  category?: string
  type?: string
  priceRange?: { min?: number; max?: number }
  colors?: string[]
  keywords?: string[]
  scenario?: string // e.g., "formal event", "casual wear", "winter wedding"
  isPriceQuery: boolean
  isCategoryQuery: boolean
  isSizeQuery: boolean
}

/**
 * Extracts query intent using Gemini for better understanding
 * This is called once per query to understand what the user wants
 */
export async function extractQueryIntent(
  userQuery: string,
  apiKey: string,
): Promise<QueryIntent> {
  try {
    const ai = new GoogleGenAI({ apiKey })
    
    const intentPrompt = `Analyze this user query and extract intent and relevant product attributes for product recommendation.

USER QUERY: "${userQuery}"

Return ONLY a JSON object with these keys:
{
  "intent": "search" | "recommendation" | "question" | "comparison",
  "category": "category name or null",
  "type": "product type or null",
  "priceRange": {"min": number or null, "max": number or null} or null,
  "colors": ["color1", "color2"] or null,
  "keywords": ["keyword1", "keyword2"] or null,
  "scenario": "scenario description or null",
  "isPriceQuery": true/false,
  "isCategoryQuery": true/false,
  "isSizeQuery": true/false
}

Rules:
- intent: "search" if asking to find/show products, "recommendation" if asking for suggestions, "question" if asking about product info, "comparison" if comparing products
- Extract any mentioned categories (Clothing, Footwear, Accessories, etc.)
- Extract any mentioned product types (T-Shirt, Sneakers, Sunglasses, etc.)
- Extract price range if mentioned (e.g., "under $50", "between $20 and $100")
- Extract colors if mentioned
- Extract keywords from the query (meaningful words, not stop words)
- Extract scenario if mentioned (e.g., "winter wedding", "job interview", "casual weekend")
- Set boolean flags based on what the query is asking about

Return ONLY the JSON object, no other text.`

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [{ text: intentPrompt }],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    })

    const text = response.text || ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const intent = JSON.parse(jsonMatch[0]) as QueryIntent
      return intent
    }
  } catch (error) {
    logger.warn("Error extracting intent, using fallback", { error: error instanceof Error ? error.message : String(error) })
  }

  // Fallback to simple parsing
  return parseQueryIntentFallback(userQuery)
}

/**
 * Fallback intent extraction using simple parsing
 */
function parseQueryIntentFallback(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase()
  
  const intent: QueryIntent = {
    intent: lowerQuery.includes("show") || lowerQuery.includes("find") || lowerQuery.includes("search") 
      ? "search" 
      : lowerQuery.includes("recommend") || lowerQuery.includes("suggest")
      ? "recommendation"
      : lowerQuery.includes("compare") || lowerQuery.includes("difference")
      ? "comparison"
      : "question",
    isPriceQuery: /(under|below|less than|over|above|more than|between|price)/i.test(query),
    isCategoryQuery: /(shoes|footwear|clothing|accessories|sunglasses|watch|bag|jacket|shirt)/i.test(query),
    isSizeQuery: /\b(S|M|L|XL|XXL|\d{1,2})\b/i.test(query),
  }

  // Extract basic attributes using regex
  const categoryMatch = lowerQuery.match(/\b(footwear|clothing|accessories|shoes|bags|watches)\b/i)
  if (categoryMatch) {
    intent.category = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1)
  }

  const priceMatch = lowerQuery.match(/(?:under|below|less than|max|up to|<\s*)\s*\$?\s*(\d+)/i)
  if (priceMatch) {
    intent.priceRange = { max: parseInt(priceMatch[1]) }
  }

  const minPriceMatch = lowerQuery.match(/(?:over|above|more than|min|>\s*)\s*\$?\s*(\d+)/i)
  if (minPriceMatch) {
    if (intent.priceRange) {
      intent.priceRange.min = parseInt(minPriceMatch[1])
    } else {
      intent.priceRange = { min: parseInt(minPriceMatch[1]) }
    }
  }

  return intent
}

/**
 * Scores products based on relevance to query intent
 */
function scoreProduct(product: Product, intent: QueryIntent, originalQuery: string): number {
  let score = 0
  const lowerQuery = originalQuery.toLowerCase()
  const productText = `${product.name} ${product.description} ${product.category} ${product.type} ${product.color}`.toLowerCase()

  // Category match
  if (intent.category && product.category.toLowerCase().includes(intent.category.toLowerCase())) {
    score += 10
  }

  // Type match
  if (intent.type && product.type.toLowerCase().includes(intent.type.toLowerCase())) {
    score += 10
  }

  // Color match
  if (intent.colors && intent.colors.length > 0) {
    for (const color of intent.colors) {
      if (product.color.toLowerCase().includes(color.toLowerCase())) {
        score += 5
        break
      }
    }
  }

  // Keyword match (in name, description, category, type)
  if (intent.keywords && intent.keywords.length > 0) {
    for (const keyword of intent.keywords) {
      if (productText.includes(keyword.toLowerCase())) {
        score += 3
      }
    }
  }

  // Price range match
  if (intent.priceRange) {
    if (intent.priceRange.max && product.price <= intent.priceRange.max) {
      score += 5
    }
    if (intent.priceRange.min && product.price >= intent.priceRange.min) {
      score += 5
    }
    // Bonus if price is in the middle of range
    if (intent.priceRange.min && intent.priceRange.max) {
      if (product.price >= intent.priceRange.min && product.price <= intent.priceRange.max) {
        score += 3
      }
    }
  }

  // Scenario-based matching (basic)
  if (intent.scenario) {
    const scenario = intent.scenario.toLowerCase()
    if (scenario.includes("formal") && (product.category.toLowerCase().includes("clothing") || product.type.toLowerCase().includes("suit"))) {
      score += 5
    }
    if (scenario.includes("casual") && (product.category.toLowerCase().includes("clothing") || product.type.toLowerCase().includes("t-shirt"))) {
      score += 5
    }
    if (scenario.includes("winter") && (product.category.toLowerCase().includes("clothing") || product.type.toLowerCase().includes("jacket"))) {
      score += 5
    }
  }

  // Query keyword match in product name (highest priority)
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3 && !['show', 'me', 'find', 'give', 'can', 'you', 'i', 'want', 'need'].includes(w))
  for (const word of queryWords) {
    if (product.name.toLowerCase().includes(word)) {
      score += 8
    }
  }

  return score
}

/**
 * Retrieves top N most relevant products for a user query
 * This is the main function to use for product retrieval
 */
export async function retrieveRelevantProducts(
  products: Product[],
  userQuery: string,
  options: {
    maxProducts?: number
    useGeminiIntent?: boolean
    apiKey?: string
  } = {},
): Promise<Product[]> {
  const maxProducts = options.maxProducts || 20 // Default to top 20
  const useGeminiIntent = options.useGeminiIntent ?? true
  const apiKey = options.apiKey

  // If catalog is small (< 50), no need for filtering
  if (products.length <= 50) {
    return products
  }

  let intent: QueryIntent

  // Extract query intent (using Gemini if available, otherwise fallback)
  if (useGeminiIntent && apiKey) {
    try {
      intent = await extractQueryIntent(userQuery, apiKey)
    } catch (error) {
      logger.warn("Intent extraction failed, using fallback", { error: error instanceof Error ? error.message : String(error) })
      intent = parseQueryIntentFallback(userQuery)
    }
  } else {
    intent = parseQueryIntentFallback(userQuery)
  }

  // First, use smart filter to narrow down products
  let filteredProducts = smartFilterProducts(products, userQuery)

  // If smart filter returns too many, score and rank them
  if (filteredProducts.length > maxProducts) {
    // Score each product
    const scoredProducts = filteredProducts.map(product => ({
      product,
      score: scoreProduct(product, intent, userQuery),
    }))

    // Sort by score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score)

    // Return top N
    return scoredProducts.slice(0, maxProducts).map(sp => sp.product)
  }

  // If filtered results are within limit, return them
  if (filteredProducts.length > 0) {
    return filteredProducts.slice(0, maxProducts)
  }

  // If no filtered results but we have keywords, try keyword matching
  if (intent.keywords && intent.keywords.length > 0) {
    const keywordMatches = products.filter(product => {
      const productText = `${product.name} ${product.description} ${product.category} ${product.type}`.toLowerCase()
      return intent.keywords!.some(keyword => productText.includes(keyword.toLowerCase()))
    })

    if (keywordMatches.length > 0) {
      // Score and rank
      const scored = keywordMatches.map(product => ({
        product,
        score: scoreProduct(product, intent, userQuery),
      }))

      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, maxProducts).map(sp => sp.product)
    }
  }

  // Fallback: return top N by popularity/price (or just first N)
  // In a real system, you might have popularity scores or sales data
  return products.slice(0, maxProducts)
}

/**
 * Determines how many products to send to LLM based on query type
 */
export function getProductLimitForQuery(intent: QueryIntent, catalogSize: number): number {
  // For search queries, return fewer products (user wants specific results)
  if (intent.intent === "search") {
    return 10
  }

  // For recommendations, return more products (user wants variety)
  if (intent.intent === "recommendation") {
    return 20
  }

  // For questions, return fewer products (user wants information)
  if (intent.intent === "question") {
    return 5
  }

  // For comparisons, return 2-4 products
  if (intent.intent === "comparison") {
    return 4
  }

  // Default
  return 15
}

