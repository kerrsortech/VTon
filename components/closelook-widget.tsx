"use client"

import React, { useState, useRef, useEffect } from "react"
import { Upload, X, Lock } from "lucide-react"
import { useCloselook } from "@/components/closelook-provider"
import type { Product, TryOnResult } from "@/lib/closelook-types"

interface CloselookWidgetProps {
  product: Product
  onTryOnComplete?: (result: TryOnResult) => void
  className?: string
}

export function CloselookWidget({ product, onTryOnComplete, className }: CloselookWidgetProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [fullBodyFile, setFullBodyFile] = useState<File | null>(null)
  const [halfBodyFile, setHalfBodyFile] = useState<File | null>(null)
  const fullBodyInputRef = useRef<HTMLInputElement>(null)
  const halfBodyInputRef = useRef<HTMLInputElement>(null)
  const { setGeneratingProductId, userImages, setUserImages } = useCloselook()
  const [isLoadingImages, setIsLoadingImages] = useState(false)

  // Check if user has uploaded images
  const hasUploadedImages = userImages.fullBodyUrl || userImages.halfBodyUrl

  // Fetch existing user images on mount
  useEffect(() => {
    const fetchUserImages = async () => {
      // Skip if images are already loaded
      if (hasUploadedImages) {
        return
      }

      setIsLoadingImages(true)
      try {
        // Get Shopify customer ID from window if available (for Shopify stores)
        const shopifyCustomerId = typeof window !== "undefined" 
          ? (window as any).Shopify?.customer?.id 
          : null

        const headers: HeadersInit = {}
        if (shopifyCustomerId) {
          headers["x-shopify-customer-id"] = shopifyCustomerId.toString()
        }

        const response = await fetch("/api/user-images", {
          method: "GET",
          headers,
          credentials: "include", // Include cookies for anonymous user ID
        })

        if (response.ok) {
          const result = await response.json()
          if (result.images && (result.images.fullBodyUrl || result.images.halfBodyUrl)) {
            setUserImages({
              fullBodyUrl: result.images.fullBodyUrl,
              halfBodyUrl: result.images.halfBodyUrl,
            })
          }
        } else if (response.status !== 400) {
          // Log non-client errors (400 means no user ID, which is expected for new users)
          console.warn("Failed to fetch user images:", response.status)
        }
      } catch (error) {
        // Silently fail - user images might not exist yet
        console.debug("Could not fetch user images:", error)
      } finally {
        setIsLoadingImages(false)
      }
    }

    fetchUserImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  /**
   * Get request headers including Shopify customer ID if available
   */
  const getRequestHeaders = (): HeadersInit => {
    const headers: HeadersInit = {}
    
    // Get Shopify customer ID from window if available (for Shopify stores)
    if (typeof window !== "undefined") {
      const shopifyCustomerId = (window as any).Shopify?.customer?.id
      if (shopifyCustomerId) {
        headers["x-shopify-customer-id"] = shopifyCustomerId.toString()
      }
    }
    
    return headers
  }

  const handleFullBodySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setFullBodyFile(file)
      handleUploadImage(file, "fullBody")
    }
  }

  const handleHalfBodySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setHalfBodyFile(file)
      handleUploadImage(file, "halfBody")
    }
  }

  const handleUploadImage = async (file: File, type: "fullBody" | "halfBody") => {
    try {
      const formData = new FormData()
      formData.append(type === "fullBody" ? "fullBodyPhoto" : "halfBodyPhoto", file)

      const response = await fetch("/api/upload-user-images", {
        method: "POST",
        headers: getRequestHeaders(),
        body: formData,
        credentials: "include", // Include cookies for user ID
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to upload ${type} image`)
      }

      const result = await response.json()
      
      // Store the uploaded image URL in context
      setUserImages({
        ...userImages,
        [type === "fullBody" ? "fullBodyUrl" : "halfBodyUrl"]: result.images[0]?.url,
      })

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    }
  }

  const handleTryOn = async () => {
    if (!hasUploadedImages) {
      setError("Please upload at least one photo")
      return
    }

    setIsGenerating(true)
    setGeneratingProductId(product.id)
    setError(null)

    try {
      const formData = new FormData()

      // Send both URLs if available, API will choose the right one
      if (userImages.fullBodyUrl) {
        formData.append("fullBodyUrl", userImages.fullBodyUrl)
      }
      if (userImages.halfBodyUrl) {
        formData.append("halfBodyUrl", userImages.halfBodyUrl)
      }

      const maxProductImages = 3
      const productImagesToSend = product.images.slice(0, maxProductImages)

      for (let i = 0; i < productImagesToSend.length; i++) {
        const productImageResponse = await fetch(productImagesToSend[i])
        const productImageBlob = await productImageResponse.blob()
        const productImageFile = new File([productImageBlob], `product-${i}.jpg`, { type: productImageBlob.type })
        formData.append(`productImage${i}`, productImageFile)
      }

      // Send the count of product images
      formData.append("productImageCount", String(productImagesToSend.length))

      formData.append("productName", product.name)
      formData.append("productCategory", product.category)
      formData.append("productType", product.type)
      formData.append("productColor", product.color)

      // Send product page URL if available (for enhanced product analysis)
      if (product.url || (typeof window !== "undefined" && window.location.href)) {
        const productUrl = product.url || window.location.href
        formData.append("productUrl", productUrl)
      }

      // Include analytics tracking data
      formData.append("productId", product.id)
      
      // Get shop domain from window (for Shopify stores)
      if (typeof window !== "undefined") {
        const shopDomain = (window as any).Shopify?.shop || 
                          (window as any).shopDomain ||
                          (product.metadata?.shopDomain as string) ||
                          null
        if (shopDomain) {
          formData.append("shopDomain", shopDomain)
        }

        // Get customer info for tracking
        const shopifyCustomerId = (window as any).Shopify?.customer?.id
        if (shopifyCustomerId) {
          formData.append("shopifyCustomerId", shopifyCustomerId.toString())
        }

        const customerEmail = (window as any).Shopify?.customer?.email
        if (customerEmail) {
          formData.append("customerEmail", customerEmail)
        }
      }

      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: getRequestHeaders(),
        body: formData,
        credentials: "include", // Include cookies for user ID
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 429 || errorData.errorType === "RATE_LIMIT_EXCEEDED" || errorData.errorType === "QUOTA_EXCEEDED") {
          throw new Error(
            errorData.error || "Service temporarily unavailable. Please try again in a moment.",
          )
        }

        throw new Error(errorData.error || "Failed to generate try-on image")
      }

      const result: TryOnResult = await response.json()
      onTryOnComplete?.(result)
      setGeneratingProductId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate try-on")
      setGeneratingProductId(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCloseDialog = () => {
    setShowUploadDialog(false)
    setFullBodyFile(null)
    setHalfBodyFile(null)
    setError(null)
  }

  return (
    <>
      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold">Let's Find Your Perfect Fit</h2>
              <button
                onClick={handleCloseDialog}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Upload a photo to see products styled on you. We'll show you exactly how each item looks before you buy.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Standing Photo Upload (Left) */}
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-gray-700 text-center block mb-1">Standing Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-blue-500 transition-colors min-h-[180px] flex items-center justify-center">
                  <label className="block cursor-pointer w-full h-full">
                    <input
                      ref={fullBodyInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFullBodySelect}
                      className="hidden"
                    />
                    <div className="text-center">
                      {userImages.fullBodyUrl ? (
                        <div className="space-y-3">
                          <img
                            src={userImages.fullBodyUrl}
                            alt="Standing photo"
                            className="w-full h-40 mx-auto object-cover rounded-lg"
                          />
                          <p className="text-xs font-medium text-green-600">✓ Photo uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="h-10 w-10 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 text-center mt-1.5">
                  Full-length photo for dresses, pants & full outfits. Stand naturally with good lighting.
                </p>
              </div>

              {/* Portrait Photo Upload (Right) */}
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-gray-700 text-center block mb-1">Portrait Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-blue-500 transition-colors min-h-[180px] flex items-center justify-center">
                  <label className="block cursor-pointer w-full h-full">
                    <input
                      ref={halfBodyInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHalfBodySelect}
                      className="hidden"
                    />
                    <div className="text-center">
                      {userImages.halfBodyUrl ? (
                        <div className="space-y-3">
                          <img
                            src={userImages.halfBodyUrl}
                            alt="Portrait photo"
                            className="w-full h-40 mx-auto object-cover rounded-lg"
                          />
                          <p className="text-xs font-medium text-green-600">✓ Photo uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="h-10 w-10 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 text-center mt-1.5">
                  Waist-up photo for tops, accessories & jewelry. Face clearly visible works best.
                </p>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="mb-5 p-3.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your privacy matters. Photos are encrypted, never shared, and only visible to you. We never use your images for AI training or any other purpose.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={handleCloseDialog}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCloseDialog()
                  if (hasUploadedImages) {
                    handleTryOn()
                  }
                }}
                disabled={!hasUploadedImages}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
