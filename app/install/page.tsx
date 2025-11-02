"use client"

import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Sparkles, ShoppingBag, Zap } from "lucide-react"
import { useSearchParams } from "next/navigation"

function InstallPageContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    if (!shop) {
      // If no shop param, show error or ask for shop
      alert("Please provide a shop parameter. Example: /install?shop=your-store.myshopify.com")
      return
    }

    setInstalling(true)
    // Redirect to OAuth install endpoint
    window.location.href = `/api/shopify/auth/install?shop=${shop}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Closelook Virtual Try-On
          </h1>
          <p className="text-xl text-gray-600">
            Transform your Shopify store with AI-powered virtual try-on technology
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Features</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Virtual Try-On</h3>
                <p className="text-gray-600">
                  Customers can see how products look on them before purchasing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">AI Shopping Assistant</h3>
                <p className="text-gray-600">
                  Intelligent chatbot helps customers find the perfect products
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Analytics Dashboard</h3>
                <p className="text-gray-600">
                  Track try-ons, conversions, and customer engagement metrics
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Easy Integration</h3>
                <p className="text-gray-600">
                  Simple theme blocks - no coding required
                </p>
              </div>
            </div>
          </div>
        </div>

        {shop ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Store:</strong> {shop}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Add your shop domain to the URL:
              <br />
              <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">
                /install?shop=your-store.myshopify.com
              </code>
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            onClick={handleInstall}
            disabled={installing || !shop}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            size="lg"
          >
            {installing ? (
              <>
                <Zap className="h-5 w-5 mr-2 animate-pulse" />
                Installing...
              </>
            ) : (
              <>
                <ShoppingBag className="h-5 w-5 mr-2" />
                Install App
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            By installing, you agree to grant the necessary permissions for the app to function.
            <br />
            <a href="/admin" className="text-blue-600 hover:underline">
              Already installed? Go to dashboard →
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default function InstallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <InstallPageContent />
    </Suspense>
  )
}

