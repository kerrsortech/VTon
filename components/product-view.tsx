"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CloselookWidget } from "@/components/closelook-widget"
import { GlobalChatbot } from "@/components/global-chatbot"
import { TryOnActions } from "@/components/try-on-actions"
import { useCloselook } from "@/components/closelook-provider"
import type { Product, TryOnResult } from "@/lib/closelook-types"
import { ChevronLeft, Heart, ShoppingBag, User } from "lucide-react"

interface ProductViewProps {
  product: Product
}

export function ProductView({ product }: ProductViewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"model" | "user">("model")
  const { addTryOnResult, getTryOnResult } = useCloselook()
  const tryOnResult = getTryOnResult(product.id)

  const handleTryOnComplete = (result: TryOnResult) => {
    addTryOnResult(product.id, result)
    setViewMode("user")
    setSelectedImageIndex(0)
  }

  const displayImages = viewMode === "user" && tryOnResult ? [tryOnResult.imageUrl] : product.images

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-neutral-200">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-sm hover:text-neutral-600">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <Heart className="h-6 w-6" />
              </button>
              <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <ShoppingBag className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* View Mode Toggle */}
            {tryOnResult && (
              <div className="bg-neutral-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="view-mode" className="text-sm font-medium cursor-pointer">
                      {viewMode === "model" ? "Model View" : "Your Try-On"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600">Model</span>
                    <Switch
                      id="view-mode"
                      checked={viewMode === "user"}
                      onCheckedChange={(checked) => {
                        setViewMode(checked ? "user" : "model")
                        setSelectedImageIndex(0)
                      }}
                    />
                    <span className="text-xs text-neutral-600">You</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Image */}
            <div className="bg-neutral-100 aspect-square relative overflow-hidden">
              <img
                src={displayImages[selectedImageIndex] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {viewMode === "user" && tryOnResult && (
                <Badge className="absolute top-4 left-4 bg-black text-white">
                  <User className="h-3 w-3 mr-1" />
                  Your Try-On
                </Badge>
              )}
            </div>

            {/* Try-On Actions */}
            {tryOnResult && viewMode === "user" && (
              <TryOnActions imageUrl={tryOnResult.imageUrl} productName={product.name} />
            )}

            {/* Thumbnail Gallery */}
            {displayImages.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-neutral-100 overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index ? "border-black" : "border-transparent"
                    }`}
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
              <p className="text-base text-neutral-600 mb-4">{product.category}</p>
              <p className="text-xl font-medium">MRP : ${product.price}</p>
              <p className="text-sm text-neutral-600 mt-1">incl. of taxes</p>
              <p className="text-sm text-neutral-600">(Also includes all applicable duties)</p>
            </div>

            {/* Color Badge */}
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {product.color}
              </Badge>
            </div>

            {/* Try-On Status */}
            {tryOnResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-1">✓ Try-On Complete</p>
                <p className="text-xs text-green-700">Toggle to "Your Try-On" view to see how it looks on you</p>
              </div>
            )}

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Select Size</h3>
                <button className="text-sm text-neutral-600 hover:text-black">Size Guide</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["S", "M", "L", "XL", "XXL"].map((size) => (
                  <button
                    key={size}
                    className="border border-neutral-300 hover:border-black py-3 text-center text-sm font-medium transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-black hover:bg-neutral-800 text-white rounded-full py-6 text-base font-medium"
              >
                Add to Bag
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-neutral-300 hover:border-black rounded-full py-6 text-base font-medium bg-transparent"
              >
                Favourite
              </Button>
            </div>

            {/* Product Description */}
            <div className="pt-6 border-t border-neutral-200">
              <p className="text-base leading-relaxed text-neutral-700">{product.description}</p>
            </div>

            {/* Product Details */}
            <div className="pt-6 border-t border-neutral-200">
              <h3 className="font-medium mb-4">Product Details</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>• Premium quality materials</li>
                <li>• Authentic design and fit</li>
                <li>• Available in multiple sizes</li>
                <li>• Official product warranty</li>
              </ul>
            </div>

            {/* Delivery & Returns */}
            <div className="pt-6 border-t border-neutral-200">
              <h3 className="font-medium mb-4">Delivery & Returns</h3>
              <p className="text-sm text-neutral-700 mb-2">Free standard delivery on orders over $100</p>
              <p className="text-sm text-neutral-700">
                Free 30-day returns.{" "}
                <Link href="#" className="underline">
                  Learn more
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <GlobalChatbot />
      <CloselookWidget product={product} onTryOnComplete={handleTryOnComplete} />
    </div>
  )
}
