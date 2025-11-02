"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { GlobalChatbot } from "@/components/global-chatbot"
import type { Product } from "@/lib/closelook-types"

export function ChatbotWrapper() {
  const pathname = usePathname()
  const [products, setProducts] = useState<Product[]>([])

  // Fetch products using the plugin adapter via API
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products")
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error("Failed to fetch products:", error)
      }
    }
    fetchProducts()
  }, [])

  const productId = pathname.startsWith("/product/") ? pathname.split("/product/")[1] : null
  const currentProduct = productId ? products.find((p) => p.id === productId) : undefined

  return <GlobalChatbot currentProduct={currentProduct} />
}
