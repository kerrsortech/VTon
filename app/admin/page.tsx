"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, ExternalLink, Settings } from "lucide-react"

interface InstallationStatus {
  installed: boolean
  shop?: string
  connectedAt?: string
}

export default function AdminPage() {
  const [status, setStatus] = useState<InstallationStatus>({
    installed: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get shop from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const shop = urlParams.get("shop")

    if (shop) {
      // Check if shop is installed
      checkInstallation(shop)
    } else {
      setLoading(false)
    }
  }, [])

  const checkInstallation = async (shop: string) => {
    try {
      const response = await fetch(`/api/shopify/products?shop=${shop}`)
      if (response.ok) {
        setStatus({
          installed: true,
          shop,
          connectedAt: new Date().toISOString(),
        })
      } else {
        setStatus({ installed: false, shop })
      }
    } catch (error) {
      setStatus({ installed: false, shop })
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const shop = urlParams.get("shop")
    
    if (shop) {
      window.location.href = `/api/shopify/auth/install?shop=${shop}`
    } else {
      // Prompt for shop domain
      const shopDomain = prompt("Enter your Shopify store domain (e.g., store.myshopify.com):")
      if (shopDomain) {
        window.location.href = `/api/shopify/auth/install?shop=${shopDomain}`
      }
    }
  }

  const openThemeEditor = () => {
    const shop = status.shop || new URLSearchParams(window.location.search).get("shop")
    if (shop) {
      window.open(`https://${shop}/admin/themes`, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Closelook Admin</h1>
          <p className="text-gray-600 mt-2">Manage your virtual try-on integration</p>
        </div>

        {/* Installation Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.installed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div>
                <h2 className="font-semibold text-lg">Installation Status</h2>
                <p className="text-sm text-gray-600">
                  {status.installed
                    ? `Connected to ${status.shop}`
                    : "Not installed"}
                </p>
              </div>
            </div>
            {!status.installed && (
              <Button onClick={handleInstall}>Install App</Button>
            )}
          </div>
        </Card>

        {status.installed && (
          <>
            {/* Quick Actions */}
            <Card className="p-6 mb-6">
              <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={openThemeEditor}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Theme Editor
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Widget Settings (Coming Soon)
                </Button>
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Next Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>
                  Open your theme editor to add Closelook widgets to product pages
                </li>
                <li>
                  Look for "Closelook Try-On Widget" and "Closelook Chatbot" in
                  the app blocks section
                </li>
                <li>
                  Drag the blocks onto your product page template where you want
                  them to appear
                </li>
                <li>Save your theme and test on a product page</li>
              </ol>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

