"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Loader2, Upload, UploadCloud, Image as ImageIcon, Download, Lock, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product, TryOnResult } from "@/lib/closelook-types"
import { Link } from "next/link"
import { useCloselook } from "@/components/closelook-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Client-side logger (simple console logger for browser)
const logger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
  debug: (...args: any[]) => console.log("[DEBUG]", ...args),
}

interface Message {
  role: "user" | "assistant"
  content: string
  recommendations?: ProductRecommendation[]
  imageUrl?: string
  imageType?: "try-on" | "product" | "other"
}

interface ProductRecommendation {
  id: string
  name: string
  price: number
  reason: string
}

interface GlobalChatbotProps {
  currentProduct?: Product
  className?: string
}

export function GlobalChatbot({ currentProduct, className }: GlobalChatbotProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [hasClickedOnce, setHasClickedOnce] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Upload widget state (moved from CloselookWidget)
  const [userPhoto, setUserPhoto] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isHoveringUpload, setIsHoveringUpload] = useState(false)
  
  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [fullBodyPhoto, setFullBodyPhoto] = useState<File | null>(null)
  const [halfBodyPhoto, setHalfBodyPhoto] = useState<File | null>(null)
  const [fullBodyPreview, setFullBodyPreview] = useState<string | null>(null)
  const [halfBodyPreview, setHalfBodyPreview] = useState<string | null>(null)
  const fullBodyInputRef = useRef<HTMLInputElement>(null)
  const halfBodyInputRef = useRef<HTMLInputElement>(null)
  
  // Full-screen image viewer state
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  
  const { setGeneratingProductId, userImages, setUserImages } = useCloselook()

  // Check if user has uploaded images
  const hasUploadedImages = userImages.fullBodyUrl || userImages.halfBodyUrl

  // Fetch existing user images on mount
  useEffect(() => {
    // Skip if images are already loaded
    if (hasUploadedImages) {
      return
    }

    const fetchUserImages = async () => {
      try {
        // Get Shopify customer ID from window if available (for Shopify stores)
        const shopifyCustomerId = typeof window !== "undefined" 
          ? (window as any).Shopify?.customer?.id 
          : null

        const headers: HeadersInit = {}
        if (shopifyCustomerId) {
          headers["x-shopify-customer-id"] = shopifyCustomerId.toString()
        }

        const response = await fetch("/api/user-images", {
          method: "GET",
          headers,
          credentials: "include", // Include cookies for anonymous user ID
        })

        if (response.ok) {
          const result = await response.json()
          if (result.images && (result.images.fullBodyUrl || result.images.halfBodyUrl)) {
            setUserImages({
              fullBodyUrl: result.images.fullBodyUrl,
              halfBodyUrl: result.images.halfBodyUrl,
            })
            logger.info("User images loaded from server", {
              hasFullBody: !!result.images.fullBodyUrl,
              hasHalfBody: !!result.images.halfBodyUrl,
            })
          }
        } else if (response.status !== 400) {
          // Log non-client errors (400 means no user ID, which is expected for new users)
          logger.warn("Failed to fetch user images:", response.status)
        }
      } catch (error) {
        // Silently fail - user images might not exist yet
        logger.debug("Could not fetch user images:", error)
      }
    }

    fetchUserImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Fetch products only when chatbot is opened for the first time
  useEffect(() => {
    if (!hasClickedOnce) return // Only fetch when user interacts
    
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
  }, [hasClickedOnce])

  useEffect(() => {
    // Initialize with greeting message
    setMessages([{ role: "assistant", content: "How may I help you?" }])
  }, [])

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)

    return () => clearTimeout(scrollTimeout)
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])


  const promptTemplates =
    pathname === "/"
      ? [
          "Show me trending products",
          "Help me find something",
          "What are your best-selling items?",
        ]
      : currentProduct
        ? [
            "Tell me more about this product",
            "Recommend matching items",
          ]
        : ["Help me find products", "What's new?"]

  // Sound feedback function (for messages)
  const playSoundFeedback = useCallback(() => {
    // Sound feedback - using Web Audio API for a modern click sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a soft "tick" sound
      oscillator.frequency.value = 800 // Soft, pleasant tone
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime) // Very quiet
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05) // Fade out quickly
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.05) // Very short duration
    } catch (error) {
      // Silently fail if audio context not available
    }
  }, [])

  // Haptic and sound feedback handler (for button clicks)
  const playClickFeedback = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Very subtle 10ms vibration
    }
    
    // Play sound
    playSoundFeedback()
  }

  // Track previous message count to detect new assistant messages
  const prevMessagesCountRef = useRef(0)
  const prevAssistantMessagesRef = useRef<Message[]>([])
  const isInitialMountRef = useRef(true)

  // Play sound when new assistant messages arrive
  useEffect(() => {
    // Skip on initial mount (initial greeting message)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      // Initialize refs with current messages to prevent false triggers
      const currentAssistantMessages = messages.filter(m => m.role === "assistant")
      prevAssistantMessagesRef.current = currentAssistantMessages
      prevMessagesCountRef.current = messages.length
      return
    }
    
    // Get current assistant messages
    const currentAssistantMessages = messages.filter(m => m.role === "assistant")
    
    // Check if we have a new assistant message (text or image)
    if (currentAssistantMessages.length > prevAssistantMessagesRef.current.length) {
      // Find the new message(s)
      const newMessages = currentAssistantMessages.slice(prevAssistantMessagesRef.current.length)
      
      // Play sound for each new assistant message (text or image)
      newMessages.forEach(() => {
        playSoundFeedback()
      })
    }
    
    // Update refs
    prevAssistantMessagesRef.current = currentAssistantMessages
    prevMessagesCountRef.current = messages.length
  }, [messages, playSoundFeedback])

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
    handleSend(prompt)
  }

  const handleSend = async (messageOverride?: string) => {
    const userMessage = messageOverride || input.trim()
    if (!userMessage || isLoading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const pageContext = pathname === "/" ? "home" : currentProduct ? "product" : "other"

      // Try to get shop domain and customer name from Shopify storefront context
      let shopDomain: string | undefined = undefined
      let customerName: string | undefined = undefined
      let customerInternal: { id?: string; email?: string; accessToken?: string } | undefined = undefined

      // Extract shop domain and customer from Shopify storefront context
      // NOTE: Works on any domain (custom domain or myshopify.com)
      // The shop domain comes from Shopify context, not the browser URL
      if (typeof window !== "undefined") {
        // Try to get shop domain from Shopify context (works on any domain)
        try {
          // Method 1: window.Shopify.shop (available in Shopify themes)
          const shopify = (window as any).Shopify
          if (shopify?.shop) {
            shopDomain = shopify.shop
          }
          
          // Method 2: Meta tag (if theme provides it)
          if (!shopDomain) {
            const shopMeta = document.querySelector('meta[name="shopify-shop"]')?.getAttribute("content")
            if (shopMeta) {
              shopDomain = shopMeta
            }
          }
          
          // Method 3: Try to extract from hostname as fallback (only if myshopify.com)
          if (!shopDomain) {
            const hostname = window.location.hostname
            const shopMatch = hostname.match(/([^.]+)\.myshopify\.com/)
            if (shopMatch) {
              shopDomain = `${shopMatch[1]}.myshopify.com`
            }
          }
        } catch (e) {
          // Shopify context not available - this is fine, shopDomain will be undefined
          // Backend will handle session lookup if needed
        }

        // Detect customer from Shopify storefront context (only name for personalization)
        try {
          const customerDetector = await import("@/lib/shopify/customer-detector")
          const detected = customerDetector.detectShopifyCustomer()
          if (detected.isLoggedIn) {
            customerName = detected.name
            // Store internal fields for backend use (not sent to chat API)
            customerInternal = detected._internal
          }
        } catch (e) {
          // Customer detection not available or error
          // This is fine - customer may not be logged in
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          pageContext,
          shop: shopDomain, // Shopify shop domain
          customerName: customerName, // Customer name for personalization only
          customerInternal: customerInternal, // Internal customer info for API calls (not used by chatbot)
          currentProduct: currentProduct
            ? {
                id: currentProduct.id,
                name: currentProduct.name,
                category: currentProduct.category,
                type: currentProduct.type,
                color: currentProduct.color,
                price: currentProduct.price,
                description: currentProduct.description,
                sizes: currentProduct.sizes,
              }
            : undefined,
          allProducts: products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            type: p.type,
            color: p.color,
            price: p.price,
            sizes: p.sizes,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || `Server error (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Validate response data
      if (!data || typeof data.message !== "string") {
        throw new Error("Invalid response format from server")
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "I'm here to help! How can I assist you today?",
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        },
      ])

      // Show ticket creation success message if applicable
      if (data.ticketCreated) {
        // Message already includes ticket confirmation, no need to show again
        logger.info("Ticket created successfully via chatbot")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      
      logger.error("Chat API error in frontend", { error: errorMessage })
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage.includes("timeout") || errorMessage.includes("network")
            ? "I'm having trouble connecting right now. Please check your internet connection and try again."
            : "Sorry, I encountered an error. Please try again, or feel free to ask me about products, orders, or store policies.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Upload widget handlers (moved from CloselookWidget)
  const handleTryOnWithUrls = async (images: { fullBodyUrl?: string; halfBodyUrl?: string }) => {
    if (!currentProduct) return

    setIsGenerating(true)
    setGeneratingProductId(currentProduct.id)
    setUploadError(null)

    try {
      const formData = new FormData()
      
      // Send URLs instead of files
      if (images.fullBodyUrl) {
        formData.append("fullBodyUrl", images.fullBodyUrl)
      }
      if (images.halfBodyUrl) {
        formData.append("halfBodyUrl", images.halfBodyUrl)
      }

      const maxProductImages = 3
      const productImagesToSend = currentProduct.images.slice(0, maxProductImages)

      for (let i = 0; i < productImagesToSend.length; i++) {
        const productImageResponse = await fetch(productImagesToSend[i])
        const productImageBlob = await productImageResponse.blob()
        const productImageFile = new File([productImageBlob], `product-${i}.jpg`, { type: productImageBlob.type })
        formData.append(`productImage${i}`, productImageFile)
      }

      formData.append("productImageCount", String(productImagesToSend.length))
      formData.append("productName", currentProduct.name)
      formData.append("productCategory", currentProduct.category)
      formData.append("productType", currentProduct.type)
      formData.append("productColor", currentProduct.color)

      // Send product page URL if available (for enhanced product analysis)
      if (currentProduct.url || (typeof window !== "undefined" && window.location.href)) {
        const productUrl = currentProduct.url || window.location.href
        formData.append("productUrl", productUrl)
      }

      // Include analytics tracking data
      formData.append("productId", currentProduct.id)
      
      // Get shop domain from window (for Shopify stores)
      const headers: HeadersInit = {}
      if (typeof window !== "undefined") {
        const shopDomain = (window as any).Shopify?.shop || 
                          (window as any).shopDomain ||
                          null
        if (shopDomain) {
          formData.append("shopDomain", shopDomain)
        }

        // Get customer info for tracking
        const shopifyCustomerId = (window as any).Shopify?.customer?.id
        if (shopifyCustomerId) {
          formData.append("shopifyCustomerId", shopifyCustomerId.toString())
          headers["x-shopify-customer-id"] = shopifyCustomerId.toString()
        }

        const customerEmail = (window as any).Shopify?.customer?.email
        if (customerEmail) {
          formData.append("customerEmail", customerEmail)
        }
      }

      logger.info("Sending try-on request", {
        productId: currentProduct.id,
        productName: currentProduct.name,
        hasFullBody: !!images.fullBodyUrl,
        hasHalfBody: !!images.halfBodyUrl,
      })

      const response = await fetch("/api/try-on", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include", // Include cookies for user ID
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 429 || errorData.errorType === "RATE_LIMIT_EXCEEDED" || errorData.errorType === "QUOTA_EXCEEDED") {
          throw new Error(
            errorData.error || "Service temporarily unavailable. Please try again in a moment.",
          )
        }

        throw new Error(errorData.error || "Failed to generate try-on image")
      }

      const result: TryOnResult = await response.json()
      setGeneratingProductId(null)
      
      logger.info("Try-on generation successful", {
        productId: currentProduct.id,
        imageUrl: result.imageUrl,
      })
      
      // Show success message with image in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Great! I've generated your virtual try-on for ${currentProduct.name}. Here's how it looks on you!`,
          imageUrl: result.imageUrl,
          imageType: "try-on",
        },
      ])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate try-on"
      logger.error("Try-on generation failed", {
        productId: currentProduct.id,
        error: errorMessage,
      })
      
      setUploadError(errorMessage)
      setGeneratingProductId(null)
      
      // Show error message in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error while generating your try-on: ${errorMessage}. Please try again.`,
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  // Keep old handleTryOn for backward compatibility
  const handleTryOn = async (file: File) => {
    if (!currentProduct) return
    // Upload file first, then use URLs
    const formData = new FormData()
    formData.append("halfBodyPhoto", file)
    
    const uploadResponse = await fetch("/api/upload-user-images", {
      method: "POST",
      body: formData,
    })
    
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image")
    }
    
    const uploadResult = await uploadResponse.json()
    const images: any = {}
    if (uploadResult.images) {
      uploadResult.images.forEach((img: any) => {
        if (img.type === "halfBody") {
          images.halfBodyUrl = img.url
        }
      })
    }
    
    await handleTryOnWithUrls(images)
  }

  const handleUploadClick = () => {
    if (!isGenerating) {
      setIsUploadDialogOpen(true)
    }
  }

  const handleTryOnClick = async () => {
    if (!currentProduct || isGenerating) return

    // Check if user images are already saved in context
    const hasSavedImages = userImages.fullBodyUrl || userImages.halfBodyUrl

    if (hasSavedImages) {
      logger.info("Try-on clicked with existing images", {
        hasFullBody: !!userImages.fullBodyUrl,
        hasHalfBody: !!userImages.halfBodyUrl,
      })
      // Use saved images directly for try-on generation
      // handleTryOnWithUrls already handles isGenerating state
      await handleTryOnWithUrls(userImages)
    } else {
      logger.info("Try-on clicked without images, opening upload dialog")
      // No images saved yet, open upload dialog
      setIsUploadDialogOpen(true)
    }
  }

  const handleImageSelect = (file: File, type: "fullBody" | "halfBody") => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const preview = reader.result as string
      if (type === "fullBody") {
        setFullBodyPhoto(file)
        setFullBodyPreview(preview)
      } else {
        setHalfBodyPhoto(file)
        setHalfBodyPreview(preview)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveUpload = async () => {
    // Use full body photo if available, otherwise use half body
    const photoToUse = fullBodyPhoto || halfBodyPhoto
    if (!photoToUse) {
      setUploadError("Please upload at least one photo")
      return
    }

    setUploadError(null)

    try {
      // Upload user images to secure storage
      const uploadFormData = new FormData()
      if (fullBodyPhoto) {
        uploadFormData.append("fullBodyPhoto", fullBodyPhoto)
      }
      if (halfBodyPhoto) {
        uploadFormData.append("halfBodyPhoto", halfBodyPhoto)
      }

      // Get request headers including Shopify customer ID if available
      const uploadHeaders: HeadersInit = {}
      if (typeof window !== "undefined") {
        const shopifyCustomerId = (window as any).Shopify?.customer?.id
        if (shopifyCustomerId) {
          uploadHeaders["x-shopify-customer-id"] = shopifyCustomerId.toString()
        }
      }

      logger.info("Uploading user images to secure storage")
      const uploadResponse = await fetch("/api/upload-user-images", {
        method: "POST",
        headers: uploadHeaders,
        body: uploadFormData,
        credentials: "include", // Include cookies for user ID
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save your images")
      }

      const uploadResult = await uploadResponse.json()
      logger.info("User images uploaded successfully", { userId: uploadResult.userId })

      // Store uploaded image URLs in context for future use
      const newUserImages: { fullBodyUrl?: string; halfBodyUrl?: string } = {}
      if (uploadResult.images) {
        uploadResult.images.forEach((img: any) => {
          if (img.type === "fullBody") {
            newUserImages.fullBodyUrl = img.url
          } else if (img.type === "halfBody") {
            newUserImages.halfBodyUrl = img.url
          }
        })
      }
      
      // Update context state with new images
      setUserImages({
        fullBodyUrl: newUserImages.fullBodyUrl || userImages.fullBodyUrl,
        halfBodyUrl: newUserImages.halfBodyUrl || userImages.halfBodyUrl,
      })
      
      logger.info("User images saved to context", {
        hasFullBody: !!newUserImages.fullBodyUrl,
        hasHalfBody: !!newUserImages.halfBodyUrl,
      })

      // Close upload dialog
      setIsUploadDialogOpen(false)
      
      // Reset upload dialog state
      setFullBodyPhoto(null)
      setHalfBodyPhoto(null)
      setFullBodyPreview(null)
      setHalfBodyPreview(null)

      // Show success message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Great! Your photos have been saved. You can now try on any product by clicking 'Try on this product' on any product page.",
        },
      ])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to save images")
    }
  }

  const handleCloseDialog = () => {
    setIsUploadDialogOpen(false)
    setUploadError(null)
  }

  const handleRemoveImage = (type: "fullBody" | "halfBody") => {
    if (type === "fullBody") {
      setFullBodyPhoto(null)
      setFullBodyPreview(null)
    } else {
      setHalfBodyPhoto(null)
      setHalfBodyPreview(null)
    }
  }

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `try-on-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download image:", error)
    }
  }

  const showTemplates = messages.length === 1 && !input

  return (
    <>
      {/* Chat Button - Glassmorphic Design */}
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        {!hasClickedOnce && !isOpen ? (
          <div className="relative w-14 h-14">
            {/* Animated gradient border wrapper */}
            <div className="absolute inset-0 rounded-full chatbot-shine" />
            <button
              onClick={() => {
                playClickFeedback()
                setIsOpen(true)
                setHasClickedOnce(true)
              }}
              className={cn(
                "w-full h-full rounded-full absolute inset-0",
                "backdrop-blur-xl bg-white/80 dark:bg-black/80",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-300 ease-out",
                "flex items-center justify-center",
                "hover:scale-105 active:scale-95",
                "text-gray-700 dark:text-gray-200"
              )}
              aria-label="Open chat"
            >
              <MessageCircle className="h-5 w-5 transition-transform duration-300 ease-out" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              playClickFeedback()
              setIsOpen(!isOpen)
            }}
            className={cn(
              "h-14 w-14 rounded-full",
              "backdrop-blur-xl bg-white/80 dark:bg-black/80",
              "border border-white/20 dark:border-white/10",
              "shadow-lg hover:shadow-xl",
              "transition-all duration-300 ease-out",
              "flex items-center justify-center",
              "hover:scale-110 active:scale-95",
              "text-gray-700 dark:text-gray-200",
              isOpen && "bg-white/90 dark:bg-black/90"
            )}
            aria-label={isOpen ? "Close chat" : "Open chat"}
          >
            {isOpen ? (
              <X className="h-5 w-5 transition-transform duration-300 ease-out" />
            ) : (
              <MessageCircle className="h-5 w-5 transition-transform duration-300 ease-out" />
            )}
          </button>
        )}
      </div>

      {/* Chat Window - Standard Size & White Design */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-40",
          "w-[90vw] max-w-[380px]",
          "max-h-[600px] h-[600px]",
          "bg-white dark:bg-gray-900",
          "border border-gray-200 dark:border-gray-800",
          "rounded-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-275 ease-[cubic-bezier(0.4,0.0,0.2,1)]",
          isOpen && "animate-material-bounce",
          isOpen 
            ? "opacity-100 translate-x-0" 
            : "opacity-0 translate-x-full pointer-events-none"
        )}
        style={{
          boxShadow: "0 2px 8px 0 rgba(0, 0, 0, 0.08)",
        }}
      >
          {/* Header - Simple White Design */}
          <div className="relative flex items-center p-3 pb-5 flex-shrink-0">
            {/* Animated gradient blob circle - Left side */}
            <div className="mr-3 flex-shrink-0">
              <div 
                className="w-10 h-10 rounded-full animate-spin-slow"
                style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 25%, #f093fb 50%, #667eea 75%, #764ba2 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-spin 8s ease infinite, blob-pulse 3s ease-in-out infinite',
                  boxShadow: '0 0 20px rgba(79, 172, 254, 0.4), 0 0 40px rgba(0, 242, 254, 0.2)',
                }}
              ></div>
            </div>
            
            {/* Content - Middle */}
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Hi, I'm your shopping assistant
              </h3>
              {currentProduct && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Currently viewing <span className="font-medium">{currentProduct.name}</span>
                </p>
              )}
            </div>
            
            {/* Close button - Right top */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 ml-2"
              aria-label="Close chat"
            >
              <X className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Actions Section - Try Virtual Try On + Icons */}
          <div className="flex items-center gap-2 px-3 pb-3 flex-shrink-0">
            {/* Try Virtual Try On Button */}
            <button
              onClick={handleTryOnClick}
              disabled={!currentProduct}
              className={cn(
                "flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2",
                !currentProduct && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Try on this product"
            >
              <Sparkles className="h-4 w-4" />
              Try on this product
            </button>

            {/* Upload Widget Button */}
            <div className="flex-shrink-0">
              <button
                onClick={handleUploadClick}
                onMouseEnter={() => setIsHoveringUpload(true)}
                onMouseLeave={() => setIsHoveringUpload(false)}
                disabled={isGenerating}
                className={cn(
                  "group relative h-10 w-10 rounded-xl transition-all duration-300 ease-out",
                  "bg-white border border-gray-300",
                  "hover:bg-gray-50",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isGenerating && "animate-pulse",
                )}
                aria-label="Upload photo for virtual try-on"
              >
                <div className="flex h-full w-full items-center justify-center">
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
                  ) : (
                    <Upload className="h-5 w-5 text-gray-700 transition-colors group-hover:text-blue-600" />
                  )}
                </div>
              </button>

              {/* Error Message */}
              {uploadError && (
                <div className="absolute bottom-12 right-0 w-56 p-2 rounded-lg bg-red-500 text-white text-xs animate-in slide-in-from-bottom-5 fade-in duration-300 z-20">
                  <p className="font-semibold mb-0.5">Error</p>
                  <p className="opacity-90">{uploadError}</p>
                </div>
              )}

            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 space-y-3" ref={scrollRef}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 break-words",
                        message.role === "user"
                          ? "bg-gray-700 dark:bg-gray-700 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      {/* Image Display */}
                      {message.imageUrl && (
                        <div className="mt-3">
                          <div 
                            onClick={() => setFullScreenImage(message.imageUrl!)}
                            className="cursor-pointer group"
                          >
                            <img
                              src={message.imageUrl}
                              alt={message.imageType === "try-on" ? "Virtual try-on result" : "Image"}
                              className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="flex items-center mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadImage(message.imageUrl!)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download image
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Product Recommendations */}
                      {message.recommendations && message.recommendations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.recommendations.map((rec, recIndex) => {
                            const product = products.find((p) => p.id === rec.id)
                            if (!product) return null

                            return (
                              <Link
                                key={recIndex}
                                href={`/product/${product.id}`}
                                className="block"
                              >
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer">
                                  <div className="flex gap-3">
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border border-white/40">
                                      <img
                                        src={product.images[0] || "/placeholder.svg"}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-xs truncate text-gray-900 dark:text-gray-100">
                                        {product.name}
                                      </p>
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                                        ${product.price}
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                        {rec.reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 border border-gray-200 dark:border-gray-700">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Templates */}
          {showTemplates && (
            <div className="px-4 pb-2 flex-shrink-0 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {promptTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(template)}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {template}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm",
                  "bg-gray-100 dark:bg-gray-800",
                  "border border-gray-200 dark:border-gray-700",
                  "text-gray-800 dark:text-gray-200",
                  "placeholder:text-gray-500 dark:placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                  "transition-all"
                )}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-xl",
                  "bg-gray-700 dark:bg-gray-700",
                  "text-white",
                  "hover:bg-gray-600 dark:hover:bg-gray-600 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center"
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Let's Find Your Perfect Fit
              </DialogTitle>
            </DialogHeader>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload a photo to see products styled on you. We'll show you exactly how each item looks before you buy.
            </p>
            
            <div className="space-y-4 py-2">
              {/* Upload sections arranged horizontally */}
              <div className="grid grid-cols-2 gap-4">
                {/* Standing Photo Upload */}
                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center block mb-1">
                    Standing Photo
                  </label>
                  <div
                    className={cn(
                      "relative w-full aspect-square rounded-xl border transition-all cursor-pointer overflow-hidden group",
                      "bg-gray-50 dark:bg-gray-800",
                      fullBodyPhoto 
                        ? "border-blue-500 bg-blue-50/50" 
                        : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                    onClick={() => fullBodyInputRef.current?.click()}
                  >
                    {fullBodyPreview ? (
                      <div className="relative h-full w-full">
                        <img 
                          src={fullBodyPreview} 
                          alt="Standing photo preview" 
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <UploadCloud className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage("fullBody")
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors shadow-md"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <ImageIcon className="h-10 w-10 mb-2" />
                        <p className="text-xs font-medium">Click to upload</p>
                        <p className="text-[10px]">or drag and drop</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1.5">
                    Full-length photo for dresses, pants & full outfits. Stand naturally with good lighting.
                  </p>
                  <input
                    ref={fullBodyInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file, "fullBody")
                    }}
                    className="hidden"
                  />
                </div>

                {/* Portrait Photo Upload */}
                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center block mb-1">
                    Portrait Photo
                  </label>
                  <div
                    className={cn(
                      "relative w-full aspect-square rounded-xl border transition-all cursor-pointer overflow-hidden group",
                      "bg-gray-50 dark:bg-gray-800",
                      halfBodyPhoto 
                        ? "border-blue-500 bg-blue-50/50" 
                        : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                    onClick={() => halfBodyInputRef.current?.click()}
                  >
                    {halfBodyPreview ? (
                      <div className="relative h-full w-full">
                        <img 
                          src={halfBodyPreview} 
                          alt="Portrait photo preview" 
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <UploadCloud className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage("halfBody")
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors shadow-md"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <ImageIcon className="h-10 w-10 mb-2" />
                        <p className="text-xs font-medium">Click to upload</p>
                        <p className="text-[10px]">or drag and drop</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1.5">
                    Waist-up photo for tops, accessories & jewelry. Face clearly visible works best.
                  </p>
                  <input
                    ref={halfBodyInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file, "halfBody")
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mb-5 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your privacy matters. Photos are encrypted, never shared, and only visible to you. We never use your images for AI training or any other purpose.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUpload}
                disabled={!fullBodyPhoto && !halfBodyPhoto}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-white font-medium transition-colors",
                  fullBodyPhoto || halfBodyPhoto
                    ? "bg-gray-800 hover:bg-gray-700"
                    : "bg-gray-400 cursor-not-allowed"
                )}
              >
                Save
              </button>
            </div>
          </DialogContent>
        </Dialog>

      {/* Full-Screen Image Viewer */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setFullScreenImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              aria-label="Close full screen"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <img
              src={fullScreenImage}
              alt="Full screen view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
