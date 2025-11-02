"use client"

import dynamic from "next/dynamic"

// Client-side lazy loading for ChatbotWrapper to reduce initial bundle size
const ChatbotWrapper = dynamic(() => import("@/components/chatbot-wrapper"), {
  ssr: false,
  loading: () => null // Don't show loading state
})

export { ChatbotWrapper }

