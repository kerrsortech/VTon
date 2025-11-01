/**
 * Product Extractor
 * Extracts product recommendations from LLM text responses
 * Handles both formatted PRODUCT_RECOMMENDATION JSON and plain text mentions
 */

import type { Product } from "./closelook-types"

export interface ExtractedProduct {
  id: string
  name: string
  price: number
  reason: string
}

/**
 * Extracts products from LLM response text
 * Handles both PRODUCT_RECOMMENDATION JSON format and plain text mentions
 */
export function extractProductsFromResponse(
  text: string,
  allProducts: Product[],
): {
  cleanedText: string
  extractedProducts: ExtractedProduct[]
} {
  const extractedProducts: ExtractedProduct[] = []
  let cleanedText = text

  // First, extract PRODUCT_RECOMMENDATION formatted products
  const productRegex = /PRODUCT_RECOMMENDATION:\s*({[^}]+})/g
  let match

  while ((match = productRegex.exec(text)) !== null) {
    try {
      const productData = JSON.parse(match[1])
      // Verify the product exists in our catalog
      if (allProducts?.some((p: any) => p.id === productData.id)) {
        extractedProducts.push({
          id: productData.id,
          name: productData.name,
          price: productData.price || 0,
          reason: productData.reason || "Recommended for you",
        })
      }
      // Remove the recommendation marker from the text
      cleanedText = cleanedText.replace(match[0], "")
    } catch (e) {
      console.error("[ProductExtractor] Failed to parse PRODUCT_RECOMMENDATION:", e)
    }
  }

  // Second, try to extract products mentioned in plain text (e.g., "Jacket ($120)", "Nike Dri-FIT Shorts ($45)")
  // Look for patterns like: "Product Name ($price)" or "Product Name: $price"
  const pricePattern = /\$(\d+)/g
  const priceMatches = Array.from(text.matchAll(pricePattern))

  // Try to match product names with prices
  for (const priceMatch of priceMatches) {
    const price = parseInt(priceMatch[1])
    const priceIndex = priceMatch.index || 0

    // Look for product name before the price (within 100 characters)
    const textBeforePrice = text.substring(Math.max(0, priceIndex - 100), priceIndex)
    
    // Extract potential product names (look for capitalized words, brand names, etc.)
    // Common patterns: "Product Name ($price)", "Product Name: $price", "**Product Name** ($price)"
    const namePatterns = [
      /\*\*([^*]+)\*\*\s*\(\$/i, // **Product Name** ($
      /([A-Z][A-Za-z\s]+?)\s*\(?\$/i, // Product Name ($
      /:\s*([A-Z][A-Za-z\s]+?)\s*\(\$/i, // : Product Name ($
      /([A-Z][A-Za-z\s]+?)\s*:\s*\$/i, // Product Name: $
    ]

    for (const namePattern of namePatterns) {
      const nameMatch = textBeforePrice.match(namePattern)
      if (nameMatch) {
        const potentialName = nameMatch[1].trim()

        // Try to find matching product in catalog by name and price
        const matchingProduct = allProducts.find((p: any) => {
          const nameMatch = p.name.toLowerCase().includes(potentialName.toLowerCase()) ||
                           potentialName.toLowerCase().includes(p.name.toLowerCase())
          const priceMatch = p.price === price
          return nameMatch && priceMatch
        })

        if (matchingProduct && !extractedProducts.some((ep) => ep.id === matchingProduct.id)) {
          // Extract reason from surrounding text
          const reasonMatch = text.substring(priceIndex, priceIndex + 200).match(/[-–]\s*([^.\n]+)/)
          const reason = reasonMatch
            ? reasonMatch[1].trim()
            : `Matches your criteria ($${price})`

          extractedProducts.push({
            id: matchingProduct.id,
            name: matchingProduct.name,
            price: matchingProduct.price,
            reason: reason,
          })
          break
        }
      }
    }
  }

  // Third, try to extract products mentioned by name only (without price pattern)
  // Look for product names that appear in the catalog
  for (const product of allProducts) {
    // Skip if already extracted
    if (extractedProducts.some((ep) => ep.id === product.id)) continue

    // Check if product name appears in text (case-insensitive)
    const nameWords = product.name.toLowerCase().split(/\s+/)
    const namePattern = new RegExp(nameWords.map((w) => `(?=.*${w})`).join(""), "i")

    if (namePattern.test(cleanedText.toLowerCase())) {
      // Check if product is mentioned in a recommendation context
      // Look for patterns like "Product Name", "**Product Name**", "Product Name:"
      const mentionPatterns = [
        new RegExp(`\\*\\*${product.name}\\*\\*`, "i"),
        new RegExp(`${product.name}:`, "i"),
        new RegExp(`\\b${product.name}\\b`, "i"),
      ]

      const isMentioned = mentionPatterns.some((pattern) => pattern.test(cleanedText))

      if (isMentioned && !extractedProducts.some((ep) => ep.id === product.id)) {
        // Extract context/reason from surrounding text
        const productIndex = cleanedText.toLowerCase().indexOf(product.name.toLowerCase())
        if (productIndex !== -1) {
          const contextText = cleanedText.substring(
            Math.max(0, productIndex - 50),
            Math.min(cleanedText.length, productIndex + product.name.length + 100),
          )
          const reasonMatch = contextText.match(/[-–]\s*([^.\n]+)/)
          const reason = reasonMatch
            ? reasonMatch[1].trim()
            : `Mentioned: ${product.name}`

          extractedProducts.push({
            id: product.id,
            name: product.name,
            price: product.price,
            reason: reason,
          })
        }
      }
    }
  }

  return {
    cleanedText,
    extractedProducts,
  }
}

