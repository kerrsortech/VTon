/**
 * Base Product Adapter Interface
 * All platform-specific adapters must implement this interface
 */

import type { CloselookProduct } from "../types"

export interface ProductAdapter {
  /**
   * Get a single product by ID
   */
  getProduct(id: string): Promise<CloselookProduct | null>

  /**
   * Get multiple products by IDs
   */
  getProducts(ids: string[]): Promise<CloselookProduct[]>

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): Promise<CloselookProduct[]>

  /**
   * Search products
   */
  searchProducts(query: string): Promise<CloselookProduct[]>

  /**
   * Get all products (with optional pagination)
   */
  getAllProducts(options?: { limit?: number; offset?: number }): Promise<CloselookProduct[]>

  /**
   * Get recommended products based on a product
   */
  getRecommendedProducts(productId: string, limit?: number): Promise<CloselookProduct[]>
}
