import type { Product } from "./closelook-types"

export interface FilterCriteria {
  category?: string
  type?: string
  minPrice?: number
  maxPrice?: number
  color?: string
  size?: string // Single size to filter by
  sizes?: string[] // Multiple sizes to filter by (OR logic)
  keywords?: string[]
}

/**
 * Filters products based on given criteria
 */
export function filterProducts(products: Product[], criteria: FilterCriteria): Product[] {
  let filtered = [...products]

  // Filter by category
  if (criteria.category) {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase().includes(criteria.category!.toLowerCase()),
    )
  }

  // Filter by type (use includes for partial matching)
  if (criteria.type) {
    filtered = filtered.filter(
      (p) => p.type.toLowerCase().includes(criteria.type!.toLowerCase()),
    )
  }

  // Filter by price range
  if (criteria.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= criteria.minPrice!)
  }

  if (criteria.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= criteria.maxPrice!)
  }

  // Filter by color (improved to handle compound colors like "Black/White" or "Multi-Color")
  if (criteria.color) {
    filtered = filtered.filter((p) => {
      const productColors = p.color.toLowerCase().split(/[\/\s,]+/)
      const searchColor = criteria.color!.toLowerCase()
      // Check if any part of the product color matches the search color
      return (
        productColors.some((c) => c.includes(searchColor)) ||
        p.color.toLowerCase().includes(searchColor)
      )
    })
  }

  // Filter by size
  if (criteria.size || (criteria.sizes && criteria.sizes.length > 0)) {
    const sizesToMatch = criteria.size ? [criteria.size] : criteria.sizes || []
    filtered = filtered.filter((p) => {
      // If product has no sizes, it doesn't match size filter
      if (!p.sizes || p.sizes.length === 0) {
        return false
      }
      // Check if any of the requested sizes match any available sizes (case-insensitive)
      return sizesToMatch.some((searchSize) =>
        p.sizes!.some((productSize) => productSize.toLowerCase() === searchSize.toLowerCase()),
      )
    })
  }

  // Filter by keywords (searches in name, description, category, type)
  if (criteria.keywords && criteria.keywords.length > 0) {
    filtered = filtered.filter((p) => {
      const searchText = `${p.name} ${p.description} ${p.category} ${p.type} ${p.color}`.toLowerCase()
      return criteria.keywords!.some((keyword) => searchText.includes(keyword.toLowerCase()))
    })
  }

  return filtered
}

/**
 * Extracts filter criteria from natural language query
 * This is a simple parser - can be enhanced with LLM if needed
 */
export function parseFilterQuery(query: string): FilterCriteria {
  const criteria: FilterCriteria = {}
  const lowerQuery = query.toLowerCase()

  // Extract price filters
  const priceMatch = lowerQuery.match(/(?:less than|under|below|maximum|max|up to|<\s*)\s*\$?\s*(\d+)/i)
  if (priceMatch) {
    criteria.maxPrice = parseInt(priceMatch[1])
  }

  const minPriceMatch = lowerQuery.match(/(?:more than|over|above|minimum|min|>\s*)\s*\$?\s*(\d+)/i)
  if (minPriceMatch) {
    criteria.minPrice = parseInt(minPriceMatch[1])
  }

  const betweenPriceMatch = lowerQuery.match(/(?:between|from)\s*\$?\s*(\d+)\s*(?:and|to|-)\s*\$?\s*(\d+)/i)
  if (betweenPriceMatch) {
    criteria.minPrice = parseInt(betweenPriceMatch[1])
    criteria.maxPrice = parseInt(betweenPriceMatch[2])
  }

  // Extract category keywords
  const categories = [
    "accessories",
    "clothing",
    "footwear",
    "sunglasses",
    "watch",
    "handbag",
    "shoes",
    "jacket",
    "shorts",
    "jersey",
  ]
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      if (cat === "accessories") {
        criteria.category = "Accessories"
      } else if (cat === "clothing") {
        criteria.category = "Clothing"
      } else if (cat === "footwear" || cat === "shoes") {
        criteria.category = "Footwear"
      } else {
        // It might be a type instead
        if (["sunglasses", "watch", "handbag"].includes(cat)) {
          criteria.type = cat.charAt(0).toUpperCase() + cat.slice(1)
        }
      }
    }
  }

  // Extract type keywords
  const typeMappings: Record<string, string[]> = {
    sunglasses: ["sunglasses"],
    watch: ["watch"],
    handbag: ["handbag", "bag", "tote"],
    shoes: ["shoes", "sneakers", "cleats", "boots", "footwear"],
    jacket: ["jacket", "coat"],
    shorts: ["shorts"],
    jersey: ["jersey"],
  }

  for (const [key, variations] of Object.entries(typeMappings)) {
    if (variations.some((v) => lowerQuery.includes(v)) && !criteria.type) {
      // For shoes, we want to match any footwear, so use a general term
      if (key === "shoes") {
        // Don't set a specific type - let the keyword search handle it
        // Or we could set category to Footwear
        criteria.category = "Footwear"
      } else {
        // For other types, set the specific type
        criteria.type = key.charAt(0).toUpperCase() + key.slice(1)
        if (key === "sunglasses") criteria.type = "Sunglasses"
      }
      break
    }
  }

  // Extract color (improved to handle compound colors)
  const colors = [
    "black",
    "white",
    "brown",
    "tan",
    "silver",
    "gold",
    "red",
    "blue",
    "green",
    "gray",
    "grey",
    "navy",
    "beige",
    "orange",
    "yellow",
    "pink",
    "purple",
  ]
  for (const color of colors) {
    if (lowerQuery.includes(color)) {
      criteria.color = color.charAt(0).toUpperCase() + color.slice(1)
      break
    }
  }

  // Extract size (clothing sizes: S, M, L, XL, XXL and shoe sizes: numbers)
  // Match clothing sizes
  const clothingSizeMatch = lowerQuery.match(
    /\b(size|sizes|in size|available in)\s*(?::)?\s*(S|M|L|XL|XXL|XXXL)\b/i,
  )
  if (clothingSizeMatch) {
    criteria.size = clothingSizeMatch[2].toUpperCase()
  } else {
    // Try direct size mentions
    const directSizeMatch = lowerQuery.match(/\b(S|M|L|XL|XXL|XXXL|XS|SM|MD|LG)\b/i)
    if (directSizeMatch) {
      criteria.size = directSizeMatch[1].toUpperCase()
    }
  }

  // Match shoe sizes (US sizes typically 4-15)
  if (!criteria.size) {
    const shoeSizeMatch = lowerQuery.match(/\b(size|sizes|in size|available in)\s*(?::)?\s*(\d{1,2})\b/i)
    if (shoeSizeMatch) {
      const sizeNum = parseInt(shoeSizeMatch[2])
      if (sizeNum >= 4 && sizeNum <= 15) {
        // Likely a shoe size
        criteria.size = sizeNum.toString()
      }
    } else {
      // Try direct number mentions that could be shoe sizes
      const directShoeSizeMatch = lowerQuery.match(/\b([4-9]|1[0-5])\b/)
      if (directShoeSizeMatch && !priceMatch && !minPriceMatch) {
        // Additional check: if query mentions footwear/shoes, likely a size
        if (
          lowerQuery.includes("shoe") ||
          lowerQuery.includes("sneaker") ||
          lowerQuery.includes("cleat") ||
          lowerQuery.includes("footwear") ||
          lowerQuery.includes("boot")
        ) {
          const potentialSize = parseInt(directShoeSizeMatch[1])
          criteria.size = potentialSize.toString()
        }
      }
    }
  }

  return criteria
}

/**
 * Smart filter that uses both parsing and keyword extraction
 */
export function smartFilterProducts(products: Product[], query: string): Product[] {
  const criteria = parseFilterQuery(query)

  // If we didn't extract much, try keyword-based search
  if (!criteria.category && !criteria.type && !criteria.maxPrice && !criteria.minPrice) {
    // Extract potential keywords from query
    const stopWords = new Set([
      "show",
      "me",
      "give",
      "can",
      "you",
      "i",
      "want",
      "need",
      "find",
      "looking",
      "for",
      "which",
      "what",
      "are",
      "is",
      "the",
      "a",
      "an",
      "less",
      "than",
      "under",
      "below",
      "over",
      "above",
      "between",
      "and",
      "or",
      "with",
      "in",
    ])
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .filter((w) => !/^\$?\d+$/.test(w)) // Remove numbers/price strings

    if (words.length > 0) {
      criteria.keywords = words
    }
  }

  return filterProducts(products, criteria)
}

