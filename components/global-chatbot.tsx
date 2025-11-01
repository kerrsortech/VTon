"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/closelook-types"
import Link from "next/link"
import { demoProducts } from "@/lib/demo-products"

interface Message {
  role: "user" | "assistant"
  content: string
  recommendations?: ProductRecommendation[]
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let greeting = ""
    if (pathname === "/") {
      greeting =
        "Hi! I'm your Closelook shopping assistant. I can help you find the perfect products, answer questions about our catalog, and provide personalized recommendations. What are you looking for today?"
    } else if (currentProduct) {
      greeting = `Hi! I'm your Closelook sales assistant. I can see you're looking at the ${currentProduct.name}. How can I help you today?`
    } else {
      greeting =
        "Hi! I'm your Closelook assistant. I'm here to help you with product recommendations, styling advice, and any questions you have. How can I assist you?"
    }

    setMessages([{ role: "assistant", content: greeting }])
  }, [pathname, currentProduct])

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const scrollTimeout = setTimeout(() => {
      // Try to scroll the inner scroll container (ScrollArea component)
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
      // Fallback to direct scroll
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
          "Show me trending products for this season",
          "I need outfit recommendations for a formal event",
          "What are your best-selling items?",
        ]
      : currentProduct
        ? [
            "Recommend me matching products I need to buy with this outfit",
            "Is this a good outfit for a night date in a cold month?",
          ]
        : ["Help me find products in my budget", "What's new in your collection?"]

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
          allProducts: demoProducts.map((p) => ({
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
        throw new Error(errorData.details || "Failed to get response")
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          recommendations: data.recommendations,
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again or check your API configuration.",
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

  const showTemplates = messages.length === 1 && !input

  return (
    <>
      {/* Chat Button - positioned above the upload widget */}
      <div className={cn("fixed bottom-28 right-6 z-50", className)}>
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary"
        >
          {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-44 right-6 z-50 w-[90vw] max-w-md max-h-[600px] h-[calc(100vh-12rem)] shadow-2xl flex flex-col overflow-hidden p-0">
          {/* Header */}
          <div className="border-b border-border bg-primary text-primary-foreground rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-2 p-4">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Closelook Assistant</h3>
                <p className="text-xs opacity-90">
                  {currentProduct ? "Ask me about this product" : "Ask me anything about our products"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 space-y-4" ref={scrollRef}>
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-2 break-words",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                      {/* Product Recommendations */}
                      {message.recommendations && message.recommendations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.recommendations.map((rec, recIndex) => {
                            const product = demoProducts.find((p) => p.id === rec.id)
                            if (!product) return null

                            return (
                              <Link key={recIndex} href={`/product/${product.id}`}>
                                <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                                  <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                      <img
                                        src={product.images[0] || "/placeholder.svg"}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{product.name}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">${product.price}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.reason}</p>
                                    </div>
                                  </div>
                                </Card>
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
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Templates */}
          {showTemplates && (
            <div className="px-4 pb-3 flex-shrink-0 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {promptTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(template)}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg bg-muted hover:bg-accent transition-colors border border-border"
                >
                  {template}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about products, styling, or recommendations..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
