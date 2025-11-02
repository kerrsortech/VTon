// COMMENTED OUT: Demo product page - hidden from production
// This demo product page is only for development/testing purposes

import { notFound } from "next/navigation"

export default async function ProductPage() {
  // Return a simple message instead of the demo product page
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
COMMENTED OUT: Demo product page code - hidden from production
This was the demo product page used for testing

import { notFound } from "next/navigation"
import { getCloselookPlugin } from "@/lib/closelook-plugin"
import { ProductView } from "@/components/product-view"
import type { Product } from "@/lib/closelook-types"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"

[rest of demo code...]
*/
