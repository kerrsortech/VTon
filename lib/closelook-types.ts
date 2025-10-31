export interface Product {
  id: string
  name: string
  category: string
  type: string
  color: string
  price: number
  images: string[]
  description: string
  url?: string // Optional product page URL for enhanced analysis
  sizes?: string[] // Available sizes (e.g., ["S", "M", "L", "XL"] for clothing, ["7", "8", "9", "10", "11"] for shoes)
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

export interface CloselookConfig {
  merchantId?: string
  apiKey?: string
  enableAnalytics?: boolean
  maxImageSize?: number
  allowedFormats?: string[]
}
