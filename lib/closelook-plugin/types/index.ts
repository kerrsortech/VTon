/**
 * Core types for Closelook Plugin
 * Platform-agnostic interfaces that work across all e-commerce platforms
 */

export interface CloselookProduct {
  id: string
  name: string
  handle?: string // Product handle/slug (for Shopify URLs)
  category: string
  type: string
  color: string
  price: number
  images: string[]
  description: string
  sizes?: string[] // Available sizes (optional, for compatibility with Product type)
  // Platform-specific metadata can be stored here
  metadata?: Record<string, unknown>
}

export interface CloselookConfig {
  // API Configuration
  geminiApiKey?: string
  apiEndpoint?: string

  // Merchant Configuration
  merchantId?: string
  storeName?: string

  // Feature Flags
  enableAnalytics?: boolean
  enableChatbot?: boolean
  enableTryOn?: boolean

  // Image Processing
  maxImageSize?: number
  allowedFormats?: string[]
  imageQuality?: number

  // Platform-specific settings
  platform?: "shopify" | "woocommerce" | "custom" | "demo"
  platformConfig?: Record<string, unknown>
}

export interface TryOnRequest {
  userPhoto: File
  productImage: File
  productName: string
  productCategory: string
  productType: string
  productColor: string
}

export interface TryOnResult {
  imageUrl: string
  productName: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: {
    model: string
    timestamp: string
  }
}

export interface ProductAnalysis {
  productCategory: string
  shortDescription: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  productRecommendations?: ProductRecommendation[]
}

export interface ProductRecommendation {
  id: string
  name: string
  price: number
  image: string
  reason?: string
}
