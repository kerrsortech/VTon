/**
 * Product Page Analyzer
 * Analyzes product page URLs to extract enhanced product information
 * for better image generation quality
 */

import { GoogleGenAI } from "@google/genai"
import { logger } from "./server-logger"

// Note: GoogleGenAI is the same as GoogleGenerativeAI from @google/generative-ai
// Using the same import pattern as analyze-product route

export interface ProductPageAnalysis {
  enhancedDescription: string
  productDetails: string
  designElements: string
  materials: string
  keyFeatures: string[]
  summary: string
}

/**
 * Fetches HTML content from a URL
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    logger.debug("Fetching page content", { url })
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CloselookBot/1.0; +https://closelook.com/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      logger.warn("Failed to fetch page", { status: response.status, statusText: response.statusText })
      return null
    }

    const html = await response.text()
    logger.debug("Page content fetched", { length: html.length })
    return html
  } catch (error) {
    logger.error("Error fetching page", { error })
    return null
  }
}

/**
 * Extracts product-relevant content from HTML
 * Removes scripts, styles, and unnecessary content
 */
function extractProductContent(html: string): string {
  try {
    // Remove script and style tags
    let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")

    // Extract text content from common product page elements
    const productSelectors = [
      /<h1[^>]*>([\s\S]*?)<\/h1>/gi, // Product title
      /<h2[^>]*>([\s\S]*?)<\/h2>/gi, // Section headings
      /<p[^>]*class=["'](product-description|description|product-detail)[^>]*>([\s\S]*?)<\/p>/gi, // Description paragraphs
      /<div[^>]*class=["'](product-description|description|product-detail)[^>]*>([\s\S]*?)<\/div>/gi, // Description divs
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/gi, // Meta description
    ]

    let extractedText = ""

    // Extract product title
    const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (titleMatch) {
      extractedText += `Product Title: ${titleMatch[1]}\n\n`
    }

    // Extract meta description
    const metaMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (metaMatch) {
      extractedText += `Description: ${metaMatch[1]}\n\n`
    }

    // Extract text from body (simple extraction)
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) {
      const bodyText = bodyMatch[1]
        .replace(/<[^>]+>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()

      // Limit to first 5000 characters (to avoid token limits)
      extractedText += bodyText.substring(0, 5000)
    }

    return extractedText.trim()
  } catch (error) {
    logger.error("Error extracting content", { error })
    return html.substring(0, 5000) // Fallback to raw HTML (limited)
  }
}

/**
 * Analyzes product page using Gemini
 */
export async function analyzeProductPage(
  productUrl: string,
  apiKey: string,
): Promise<ProductPageAnalysis | null> {
  try {
    logger.debug("Starting product page analysis", { productUrl })

    // Fetch page content
    const html = await fetchPageContent(productUrl)
    if (!html) {
      logger.warn("Could not fetch page content")
      return null
    }

    // Extract product-relevant content
    const pageContent = extractProductContent(html)
    logger.debug("Extracted content", { length: pageContent.length })

    // Use Gemini to analyze the page content
    const ai = new GoogleGenAI({ apiKey })

    const analysisPrompt = `You are analyzing a product page to extract detailed product information for virtual try-on image generation.

PRODUCT PAGE CONTENT:
${pageContent.substring(0, 8000)}  <!-- Limited to avoid token limits -->

Analyze this product page and extract the following information in JSON format:

{
  "enhancedDescription": "Comprehensive product description (3-5 sentences) covering design, style, materials, and key visual features",
  "productDetails": "Detailed product information including materials, construction, sizing, fit, and design details",
  "designElements": "Specific design elements, patterns, colors, logos, and visual characteristics mentioned on the page",
  "materials": "Materials, fabric types, hardware details, and construction methods mentioned",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "summary": "Concise summary (2-3 sentences) of the most important product characteristics for image generation"
}

CRITICAL REQUIREMENTS:
- Focus on VISUAL characteristics: colors, materials, textures, design elements, logos, hardware
- Extract information that helps generate accurate try-on images
- Include specific details about fit, style, and appearance
- Note any special design elements, patterns, or distinguishing features
- Keep descriptions concise but informative (for prompt integration)

Return ONLY valid JSON, no additional text.`

    logger.debug("Sending page analysis to AI")

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [{ text: analysisPrompt }],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    })

    const analysisText = response.text || ""
    logger.debug("AI response received", { length: analysisText.length })

    // Parse JSON response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn("Failed to parse JSON from response")
      return null
    }

    const analysis = JSON.parse(jsonMatch[0]) as ProductPageAnalysis
    logger.debug("Product page analysis successful")

    return analysis
  } catch (error) {
    logger.error("Error analyzing product page", { error })
    return null
  }
}

/**
 * Builds enhanced product description from page analysis
 */
export function buildEnhancedProductDescription(
  baseDescription: string,
  pageAnalysis: ProductPageAnalysis | null,
): string {
  if (!pageAnalysis) {
    return baseDescription
  }

  let enhanced = baseDescription

  // Add enhanced description if available
  if (pageAnalysis.enhancedDescription) {
    enhanced += `\n\nPRODUCT PAGE ANALYSIS:\n${pageAnalysis.enhancedDescription}`
  }

  // Add product details
  if (pageAnalysis.productDetails) {
    enhanced += `\n\nPRODUCT DETAILS:\n${pageAnalysis.productDetails}`
  }

  // Add design elements
  if (pageAnalysis.designElements) {
    enhanced += `\n\nDESIGN ELEMENTS:\n${pageAnalysis.designElements}`
  }

  // Add materials
  if (pageAnalysis.materials) {
    enhanced += `\n\nMATERIALS & CONSTRUCTION:\n${pageAnalysis.materials}`
  }

  // Add key features
  if (pageAnalysis.keyFeatures && pageAnalysis.keyFeatures.length > 0) {
    enhanced += `\n\nKEY FEATURES:\n${pageAnalysis.keyFeatures.join(", ")}`
  }

  // Add summary
  if (pageAnalysis.summary) {
    enhanced += `\n\nSUMMARY: ${pageAnalysis.summary}`
  }

  return enhanced
}

/**
 * Enhances image generation prompt with product page insights
 */
export function enhancePromptWithPageAnalysis(
  basePrompt: string,
  pageAnalysis: ProductPageAnalysis | null,
): string {
  if (!pageAnalysis || !pageAnalysis.summary) {
    return basePrompt
  }

  // Add page analysis insights to the prompt
  const pageInsights = `\n\nPRODUCT PAGE INSIGHTS:
${pageAnalysis.summary}

${pageAnalysis.designElements ? `Design Elements: ${pageAnalysis.designElements}` : ""}
${pageAnalysis.materials ? `Materials: ${pageAnalysis.materials}` : ""}

Use these insights to ensure the generated image accurately reflects the product's design, materials, and key features as described on the product page.`

  return basePrompt + pageInsights
}

