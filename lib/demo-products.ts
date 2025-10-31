import type { Product } from "./closelook-types"

export const demoProducts: Product[] = [
  {
    id: "nike-vomero-plus",
    name: "Nike Vomero Premium",
    category: "Footwear",
    type: "Running Shoes",
    color: "Multi-Color",
    price: 180,
    sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM-ZB4dAUa5vsWVxpkZk7kigzZ381RZyi.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM%20%282%29-wGqpO6a7GpkH08l5NKfuIBMC3Ry6zG.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM%20%281%29-DnKUwKB0rDOf3Tonu9tjOu5lsCP6DR.avif",
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
    sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LEGEND%2B10%2BCLUB%2BFG_MG-WJ9uOUlBlvDydtr3thUMG00qAPllAO.avif",
      "/placeholder.svg?height=800&width=800",
      "/placeholder.svg?height=800&width=800",
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
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM-Om57ijtIm8l3v5LItMGXeSWgxVB17R.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM-ZI8CkhJd56G85Ju62GmvUkiln3TV93.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM%20%281%29-vzJLXtOl9juFOE4mZiPp1jjRS6YPku.avif",
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
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO-1LDQZwOnraiXjxNGfmmkmrjoLqElSH.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO%20%281%29-BnzY6kD1eHtykI254qcR36D0EbvyIc.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO-so5IiPV8iC2ZBsBq7JTtARMB9Ld6wt.avif",
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
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/M%2BJ%2BBRK%2BCLGTE%2BHOCKEY%2BJSY-VkWGvUy7vtHhUmMhZs43hYxdTWramI.avif",
      "/placeholder.svg?height=800&width=800",
      "/placeholder.svg?height=800&width=800",
    ],
    description:
      "Authentic hockey jersey with Brooklyn Collegiate branding. Durable construction for on-ice performance and fan wear.",
  },
  {
    id: "michael-kors-handbag",
    name: "Michael Kors Signature Tote",
    category: "Accessories",
    type: "Handbag",
    color: "Brown/Tan",
    price: 298,
    // Handbags typically don't have sizes like clothing/shoes
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_1-4Wn9F6XpKSZk4vJrW9QuHg8AK09TtR.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_4-299m3DijXHdWEqFmuammarK35DUYE3.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_2-rnDiWjrWiyf7TZ9fNMCyR4LpVHRV5w.jpeg",
    ],
    description:
      "Elegant signature tote bag featuring the iconic MK monogram pattern. Crafted with premium leather trim, gold-tone hardware, and a removable tassel charm. Spacious interior with quilted lining perfect for everyday essentials.",
  },
  {
    id: "luxury-chronograph-watch",
    name: "Premium Chronograph Watch",
    category: "Accessories",
    type: "Watch",
    color: "Silver/Gold",
    price: 8500,
    // Watches don't typically have sizes like clothing/shoes (they have strap adjustments)
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-q5XsSMUCa0bEWJrnH4glY4baL0GWjF.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%282%29-rHpxAIVuLW7PUNSQeQ7IIk9fyc3hs8.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%281%29-h1FzrrbNrfhTR26R4EDqboxux52pLZ.avif",
    ],
    description:
      "Sophisticated automatic chronograph watch with precision Swiss movement. Features a stainless steel case, sapphire crystal, and elegant bracelet. Water-resistant design perfect for the modern professional.",
  },
  {
    id: "lv-clash-sunglasses",
    name: "Louis Vuitton LV Clash Square Sunglasses",
    category: "Accessories",
    type: "Sunglasses",
    color: "Black/Gold",
    price: 640,
    // Sunglasses typically don't have sizes like clothing/shoes (one size fits most)
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM2_Front%20view-GutDaKLe7pS5NVHBlhIzP4WeA2D0VU.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM1_Worn%20view-PulpBx5hUV8fLnINukiMg8XxaGKQiN.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM1_Detail%20view-x4g4tvSeidGRY6bss3y3jyF8zvx8QN.avif",
    ],
    description:
      "Bold square sunglasses from the LV Clash collection. Features distinctive gold-tone LV monogram hardware on the temples, gradient lenses with 100% UV protection, and a modern oversized silhouette.",
  },
]

export function getProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  return demoProducts.filter((p) => p.category === category)
}

// Additional functions or updates can be added here if needed
