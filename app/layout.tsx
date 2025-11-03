import type React from "react"
import type { Metadata } from "next"
// import { Inter } from "next/font/google"  // Commented for build - will work on production
// import { Analytics } from "@vercel/analytics/next"  // Disabled - not available on Render.com
import { CloselookProvider } from "@/components/closelook-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { Suspense } from "react"
import { ChatbotWrapper } from "@/components/chatbot-loader"

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
//   display: "swap",
//   preload: true,
//   adjustFontFallback: true,
// })

export const metadata: Metadata = {
  title: "Closelook Demo Store - Virtual Try-On",
  description: "Experience revolutionary virtual try-on technology powered by AI",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="">
      <body className="font-sans antialiased">
        <Suspense fallback={<div>Loading...</div>}>
          <CloselookProvider>
            {children}
            <Toaster />
            <ChatbotWrapper />
          </CloselookProvider>
        </Suspense>
        {/* <Analytics /> - Disabled for Render.com deployment */}
      </body>
    </html>
  )
}
