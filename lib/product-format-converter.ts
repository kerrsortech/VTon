/**
 * Product Format Converter
 * Converts between Product type (from closelook-types) and Shopify format (for productIntelligence.js)
 */

import type { Product } from './closelook-types'

export interface ShopifyFormatProduct {
  id: string
  title: string
  name?: string
  productType?: string
  type?: string
  category?: string
  price: {
    min: number
    max?: number
    currency?: string
  }
  available: boolean
  tags: string[]
  variants: Array<{
    id?: string
    title?: string
    price?: number
    available?: boolean
  }>
  description: string
  vendor?: string
  images?: string[]
}

/**
 * Convert Product to Shopify format for productIntelligence.js
 */
export function convertToShopifyFormat(product: Product): ShopifyFormatProduct {
  // Handle price conversion
  const priceValue = typeof product.price === 'number' ? product.price : product.price
  const priceObj = typeof priceValue === 'object' && priceValue !== null
    ? priceValue
    : { min: typeof priceValue === 'number' ? priceValue : 0, currency: 'USD' }

  // Extract tags from category/type/description
  const tags: string[] = []
  if (product.category) tags.push(product.category.toLowerCase())
  if (product.type) tags.push(product.type.toLowerCase())
  // Extract words from name for additional tags
  if (product.name) {
    const nameWords = product.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    tags.push(...nameWords.slice(0, 3))
  }

  return {
    id: product.id,
    title: product.name,
    name: product.name, // Keep for compatibility
    productType: product.type || product.category || '',
    type: product.type,
    category: product.category,
    price: {
      min: priceObj.min || 0,
      max: priceObj.max || priceObj.min || 0,
      currency: priceObj.currency || 'USD'
    },
    available: true, // Default to true - can be enhanced with inventory data
    tags: [...new Set(tags)], // Remove duplicates
    variants: product.sizes?.map((size, index) => ({
      id: `${product.id}-${index}`,
      title: size,
      price: priceObj.min,
      available: true
    })) || [],
    description: product.description || '',
    vendor: undefined,
    images: product.images || []
  }
}

/**
 * Convert Shopify format back to Product type
 */
export function convertFromShopifyFormat(shopifyProduct: ShopifyFormatProduct): Product {
  return {
    id: shopifyProduct.id,
    name: shopifyProduct.title || shopifyProduct.name || '',
    category: shopifyProduct.category || shopifyProduct.productType || '',
    type: shopifyProduct.type || shopifyProduct.productType || '',
    color: '', // Extract from tags if available
    price: shopifyProduct.price.min,
    images: shopifyProduct.images || [],
    description: shopifyProduct.description,
    sizes: shopifyProduct.variants?.map(v => v.title || '').filter(Boolean) || []
  }
}

/**
 * Convert array of Products to Shopify format
 */
export function convertProductsToShopifyFormat(products: Product[]): ShopifyFormatProduct[] {
  return products.map(convertToShopifyFormat)
}

/**
 * Convert array of Shopify format products back to Product type
 */
export function convertProductsFromShopifyFormat(shopifyProducts: ShopifyFormatProduct[]): Product[] {
  return shopifyProducts.map(convertFromShopifyFormat)
}
