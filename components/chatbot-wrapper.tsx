"use client"

import { usePathname } from "next/navigation"
import { GlobalChatbot } from "@/components/global-chatbot"
import { demoProducts } from "@/lib/demo-products"

export function ChatbotWrapper() {
  const pathname = usePathname()

  const productId = pathname.startsWith("/product/") ? pathname.split("/product/")[1] : null
  const currentProduct = productId ? demoProducts.find((p) => p.id === productId) : undefined

  return <GlobalChatbot currentProduct={currentProduct} />
}
