/**
 * Demo Product Adapter
 * Uses static demo data for testing and development
 */

import type { ProductAdapter } from "./base-adapter"
import type { CloselookProduct } from "../types"

const demoProducts: CloselookProduct[] = [
  {
    id: "nike-vomero-plus",
    name: "Nike Vomero Premium",
    category: "Footwear",
    type: "Running Shoes",
    color: "Multi-Color",
    price: 180,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM-ZB4dAUa5vsWVxpkZk7kigzZ381RZyi.avif",
    ],
    description:
      "Experience ultimate comfort with ZoomX foam technology. Lightweight running sneakers designed for long-distance performance.",
  },
  {
    id: "nike-legend-cleats",
    name: "Nike Legend 10 Club FG/MG",
    category: "Footwear",
    type: "Soccer Cleats",
    color: "Black/White",
    price: 65,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LEGEND%2B10%2BCLUB%2BFG_MG-WJ9uOUlBlvDydtr3thUMG00qAPllAO.avif",
    ],
    description:
      "Versatile soccer cleats designed for firm ground and multi-ground surfaces. Enhanced ball control with textured upper.",
  },
  {
    id: "nike-winter-jacket",
    name: "Nike Club Seasonal Winter Jacket",
    category: "Clothing",
    type: "Jacket",
    color: "Black",
    price: 120,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM-Om57ijtIm8l3v5LItMGXeSWgxVB17R.avif",
    ],
    description:
      "Stay warm with this insulated winter jacket. Features water-resistant fabric and adjustable hood for cold weather protection.",
  },
  {
    id: "nike-challenger-shorts",
    name: "Nike Dri-FIT Challenger Shorts",
    category: "Clothing",
    type: "Shorts",
    color: "Black",
    price: 45,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO-1LDQZwOnraiXjxNGfmmkmrjoLqElSH.avif",
    ],
    description:
      "Moisture-wicking running shorts with built-in brief. Lightweight and breathable for optimal performance during workouts.",
  },
  {
    id: "brooklyn-hockey-jersey",
    name: "Brooklyn Collegiate Hockey Jersey",
    category: "Clothing",
    type: "Jersey",
    color: "White/Black",
    price: 85,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/M%2BJ%2BBRK%2BCLGTE%2BHOCKEY%2BJSY-VkWGvUy7vtHhUmMhZs43hYxdTWramI.avif",
    ],
    description:
      "Authentic hockey jersey with Brooklyn Collegiate branding. Durable construction for on-ice performance and fan wear.",
  },
  {
    id: "nike-club-cap",
    name: "Nike Club Cap",
    category: "Accessories",
    type: "Cap",
    color: "Black",
    price: 28,
    images: ["/placeholder.svg?height=600&width=600"],
    description: "Classic baseball cap with the iconic Nike swoosh. Adjustable fit for all-day comfort.",
  },
  {
    id: "nike-tech-woven-pants",
    name: "Nike Tech Woven Pants",
    category: "Clothing",
    type: "Pants",
    color: "Camo Green",
    price: 120,
    images: ["/placeholder.svg?height=600&width=600"],
    description:
      "Loose-fit woven pants with modern camo pattern. Designed for comfort and style with authentic baggy silhouette.",
  },
  {
    id: "nike-beanie",
    name: "Nike Sportswear Beanie",
    category: "Accessories",
    type: "Hat",
    color: "Charcoal",
    price: 25,
    images: ["/placeholder.svg?height=600&width=600"],
    description: "Warm knit beanie with embroidered Nike swoosh. Perfect for cold weather comfort.",
  },
]

export class DemoProductAdapter implements ProductAdapter {
  async getProduct(id: string): Promise<CloselookProduct | null> {
    const product = demoProducts.find((p) => p.id === id)
    return product || null
  }

  async getProducts(ids: string[]): Promise<CloselookProduct[]> {
    return demoProducts.filter((p) => ids.includes(p.id))
  }

  async getProductsByCategory(category: string): Promise<CloselookProduct[]> {
    return demoProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase())
  }

  async searchProducts(query: string): Promise<CloselookProduct[]> {
    const lowerQuery = query.toLowerCase()
    return demoProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery) ||
        p.type.toLowerCase().includes(lowerQuery),
    )
  }

  async getAllProducts(options?: { limit?: number; offset?: number }): Promise<CloselookProduct[]> {
    const { limit = 100, offset = 0 } = options || {}
    return demoProducts.slice(offset, offset + limit)
  }

  async getRecommendedProducts(productId: string, limit = 4): Promise<CloselookProduct[]> {
    const product = await this.getProduct(productId)
    if (!product) return []

    // Simple recommendation: same category, different product
    const recommendations = demoProducts.filter((p) => p.category === product.category && p.id !== productId)

    return recommendations.slice(0, limit)
  }
}
