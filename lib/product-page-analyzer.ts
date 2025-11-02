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

    const analysisPrompt = `Extract product info for virtual try-on. Keep it SHORT.

PRODUCT PAGE:
${pageContent.substring(0, 6000)}

Return ONLY this JSON (no extra text):
{
  "enhancedDescription": "ONE sentence: what it looks like visually",
  "productDetails": "ONE sentence: key visual details",
  "designElements": "ONE sentence: colors/patterns/logos",
  "materials": "ONE sentence: main materials",
  "keyFeatures": ["feature1", "feature2"],
  "summary": "ONE sentence: key visual characteristics"
}

Focus: visual appearance ONLY. Keep each field to ONE sentence maximum.`

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
        temperature: 0.2,
        maxOutputTokens: 400,
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

  // Use only the most concise summary from page analysis
  let enhanced = baseDescription

  if (pageAnalysis.summary) {
    enhanced += ` ${pageAnalysis.summary}`
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

  // Add concise page analysis
  return basePrompt + ` ${pageAnalysis.summary}`
}

