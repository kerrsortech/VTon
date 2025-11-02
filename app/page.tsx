// COMMENTED OUT: Demo website - hidden from production
// This demo site is only for development/testing purposes

export default async function HomePage() {
  // Return a simple message instead of the demo site
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Closelook Shopify App</h1>
        <p className="text-gray-600">This is the backend API server for the Closelook Shopify app.</p>
        <p className="text-gray-600 mt-2">Install the app in your Shopify store to use the chatbot features.</p>
      </div>
    </div>
  )
}

/*
COMMENTED OUT: Demo site code - hidden from production
This was the demo e-commerce website used for testing

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCloselookPlugin } from "@/lib/closelook-plugin"
import { Search, Heart, ShoppingBag, User } from "lucide-react"

export default async function HomePage() {
  const plugin = getCloselookPlugin()
  const adapter = plugin.getAdapter()
  const products = await adapter.getAllProducts()

  return (
    <div className="min-h-screen bg-white">
      // ... rest of demo site code ...
    </div>
  )
}
*/
