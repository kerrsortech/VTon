"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, MessageCircle, Settings, ExternalLink } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function AdminPageContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              App Installed Successfully! 🎉
            </h1>
            <p className="text-xl text-gray-600">
              Your Closelook Virtual Try-On app is now installed on your store
            </p>
            {shop && (
              <p className="text-sm text-gray-500 mt-2">
                Store: <strong>{shop}</strong>
              </p>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Next Steps: Enable Your AI Widgets
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">
                <strong>Quick Setup:</strong> Click the button below to automatically open your theme editor and enable both AI widgets. Or follow the manual steps:
              </p>
              <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-2">
                <li>Click <strong>"Enable AI Widgets"</strong> above</li>
                <li>This opens your theme editor directly to the App Embeds section</li>
                <li>Toggle <strong>"Enable AI Chatbot"</strong> and <strong>"Enable Virtual Try-On"</strong> as needed</li>
                <li>Click <strong>"Save"</strong> and then <strong>"Publish"</strong> to make it live</li>
              </ol>
              <div className="mt-4 p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">
                  <strong>Features:</strong><br />
                  • AI-powered chatbot for product recommendations<br />
                  • Virtual try-on for fashion products<br />
                  • API URL: <code className="text-xs bg-gray-100 px-1 rounded">https://vton-1-hqmc.onrender.com</code>
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <MessageCircle className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Chatbot Features</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• AI-powered product recommendations</li>
                    <li>• Answer customer questions</li>
                    <li>• Help with sizing and fit</li>
                    <li>• Order status inquiries</li>
                    <li>• Style advice and suggestions</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Settings className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Theme Settings</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Appears on all product pages</li>
                    <li>• Floating widget in bottom-right</li>
                    <li>• Easy to enable/disable anytime</li>
                    <li>• No coding required</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  if (shop) {
                    // Deep link to widgets embed activation
                    const deepLinkUrl = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=95615e8665f0cb731eab0dbd66b69ebd/closelook-widgets`
                    window.open(deepLinkUrl, '_blank')
                  } else {
                    window.open('https://admin.shopify.com/store', '_blank')
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enable AI Widgets
              </Button>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  if (shop) {
                    window.open(`https://${shop}/admin/themes`, '_blank')
                  } else {
                    window.open('https://admin.shopify.com/store', '_blank')
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manual Theme Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (shop) {
                    window.open(`https://${shop}/admin/apps`, '_blank')
                  } else {
                    window.location.href = '/install'
                  }
                }}
              >
                View Installed Apps
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Need help? Check your browser console for any errors, or verify that the widget JavaScript file is accessible at:<br />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                https://vton-1-hqmc.onrender.com/widgets/chatbot-widget.js
              </code>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}
