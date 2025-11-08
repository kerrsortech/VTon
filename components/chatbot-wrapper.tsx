"use client"

import React, { useMemo, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { GlobalChatbot } from "@/components/global-chatbot"

function ChatbotWrapper() {
  const pathname = usePathname()
  const [currentUrl, setCurrentUrl] = useState<string>("")
  
  // Track URL changes for better product detection
  useEffect(() => {
    if (typeof window === "undefined") return
    
    setCurrentUrl(window.location.href)
    
    // Listen for URL changes (handles SPA navigation, back/forward, etc.)
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href)
    }
    
    // Listen to popstate (back/forward)
    window.addEventListener('popstate', handleUrlChange)
    
    // Listen to pushState/replaceState (SPA navigation)
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      setTimeout(handleUrlChange, 100)
    }
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      setTimeout(handleUrlChange, 100)
    }
    
    // Poll for URL changes (fallback for all navigation types)
    let lastUrl = window.location.href
    const urlCheckInterval = setInterval(() => {
      const currentUrlNow = window.location.href
      if (currentUrlNow !== lastUrl) {
        lastUrl = currentUrlNow
        handleUrlChange()
      }
    }, 500)
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      clearInterval(urlCheckInterval)
    }
  }, [])
  
  // Extract product ID from pathname if we're on a product page
  // Support both /product/ (Next.js app) and /products/ (Shopify) paths
  const currentProduct = useMemo(() => {
    // Check for Next.js app product path: /product/[id]
    if (pathname.startsWith("/product/")) {
      const productId = pathname.split("/product/")[1]?.split("?")[0]
      if (productId) {
        return { id: productId, url: currentUrl || undefined } as any
      }
    }
    
    // Check for Shopify product path: /products/[handle]
    if (pathname.includes("/products/")) {
      const match = pathname.match(/\/products\/([^\/\?]+)/)
      if (match && match[1]) {
        // Try to get product ID from Shopify context if available
        let productId: string | undefined = undefined
        if (typeof window !== "undefined") {
          // Method 1: ShopifyAnalytics (Most Reliable)
          if ((window as any).ShopifyAnalytics?.meta?.product) {
            const product = (window as any).ShopifyAnalytics.meta.product
            productId = product.id?.toString() || product.gid
          }
          
          // Method 2: Meta tags
          if (!productId) {
            const metaProductId = document.querySelector('meta[property="product:id"]')?.getAttribute("content") ||
                                 document.querySelector('meta[name="product:id"]')?.getAttribute("content")
            if (metaProductId) {
              productId = metaProductId
            }
          }
        }
        
        // Use handle as fallback if ID not found
        return { 
          id: productId || match[1], 
          handle: match[1],
          url: currentUrl || undefined 
        } as any
      }
    }
    
    return undefined
  }, [pathname, currentUrl])
  
  // GlobalChatbot will handle product fetching internally
  // No need to fetch products here to avoid duplicate API calls
  return <GlobalChatbot currentProduct={currentProduct} />
}

// Export with React.memo to prevent unnecessary re-renders
export default React.memo(ChatbotWrapper)
export { ChatbotWrapper }
