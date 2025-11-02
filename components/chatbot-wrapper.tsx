"use client"

import React, { useMemo } from "react"
import { usePathname } from "next/navigation"
import { GlobalChatbot } from "@/components/global-chatbot"

function ChatbotWrapper() {
  const pathname = usePathname()
  
  // Extract product ID from pathname if we're on a product page
  const currentProduct = useMemo(() => {
    const productId = pathname.startsWith("/product/") ? pathname.split("/product/")[1] : null
    return productId ? { id: productId } as any : undefined
  }, [pathname])
  
  // GlobalChatbot will handle product fetching internally
  // No need to fetch products here to avoid duplicate API calls
  return <GlobalChatbot currentProduct={currentProduct} />
}

// Export with React.memo to prevent unnecessary re-renders
export default React.memo(ChatbotWrapper)
export { ChatbotWrapper }
