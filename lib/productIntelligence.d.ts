/**
 * Type declarations for productIntelligence.js
 */

export interface Product {
  id: string;
  title?: string;
  name?: string;
  productType?: string;
  type?: string;
  tags?: string[];
  vendor?: string;
  price?: {
    min: number;
    max?: number;
    currency?: string;
  } | number;
  available?: boolean;
  variants?: Array<{
    id?: string;
    title?: string;
    price?: number;
    available?: boolean;
  }>;
  description?: string;
}

export interface UserIntent {
  type: 'general' | 'product_question' | 'price_filter' | 'ticket_creation';
  subtype: 'complementary' | null;
  filters: {
    maxPrice?: number;
    category?: string;
    color?: string;
  };
  wantsRecommendations: boolean;
  wantsTicket: boolean;
  ticketStage: 'offer' | 'awaiting_confirmation' | 'awaiting_details' | 'create' | null;
  maxRecommendations: number;
}

export interface FilterCriteria {
  maxPrice?: number;
  category?: string;
  color?: string;
}

export function rankProductsByRelevance(
  products: Product[],
  currentProduct: Product | null,
  limit?: number
): Product[];

export function filterProducts(
  products: Product[],
  filters: FilterCriteria
): Product[];

export function analyzeUserIntent(
  message: string,
  currentProduct?: Product | null,
  conversationHistory?: Array<{ role: string; content: string }>
): UserIntent;

// Note: getSmartRecommendations expects Shopify-format products (with title, productType, price.min, etc.)
// Use convertProductsToShopifyFormat before calling this function
export function getSmartRecommendations(
  allProducts: Product[], // Accepts both formats for compatibility
  currentProduct: Product | null,
  intent: UserIntent
): Promise<Product[]>; // Returns Shopify-format products
