"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Settings, ExternalLink, BarChart3 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-400 rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-xl text-gray-600">
              Coming soon - Analytics dashboard is under development
            </p>
            {shop && (
              <p className="text-sm text-gray-500 mt-2">
                Store: <strong>{shop}</strong>
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-yellow-800 mb-4">
              <strong>Note:</strong> The analytics dashboard is currently under development and will be available soon.
            </p>
            <p className="text-yellow-700 text-sm">
              For now, you can still use the chatbot widget on your storefront. The chatbot is fully functional and will work on your product pages once enabled in your theme settings.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <MessageCircle className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Enable Chatbot</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The chatbot widget is ready to use! Enable it in your theme settings.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (shop) {
                        window.open(`https://${shop}/admin/themes`, '_blank')
                      } else {
                        window.open('https://admin.shopify.com/store', '_blank')
                      }
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Go to Theme Settings
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Settings className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">App Settings</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View and manage your installed apps.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (shop) {
                        window.open(`https://${shop}/admin/apps`, '_blank')
                      } else {
                        window.location.href = '/install'
                      }
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Apps
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  )
}
