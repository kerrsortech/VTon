"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product, TryOnResult } from "@/lib/closelook-types"

interface CloselookWidgetProps {
  product: Product
  onTryOnComplete?: (result: TryOnResult) => void
  className?: string
}

export function CloselookWidget({ product, onTryOnComplete, className }: CloselookWidgetProps) {
  const [userPhoto, setUserPhoto] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    setUserPhoto(file)
    setError(null)

    await handleTryOn(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleTryOn = async (file: File) => {
    setIsGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("userPhoto", file)

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

      const response = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 429 || errorData.errorType === "QUOTA_EXCEEDED") {
          throw new Error(
            errorData.details || "API quota exceeded. Please check your Google Gemini API plan and billing details.",
          )
        }

        throw new Error(errorData.details || errorData.error || "Failed to generate try-on image")
      }

      const result: TryOnResult = await response.json()
      onTryOnComplete?.(result)
      setUserPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate try-on")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClick = () => {
    if (!isGenerating) {
      fileInputRef.current?.click()
    }
  }

  return (
    <>
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <button
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={isGenerating}
          className={cn(
            "group relative h-16 w-16 rounded-2xl transition-all duration-500 ease-out",
            "backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/70 to-white/50",
            "border border-white/20 shadow-2xl",
            "hover:scale-110 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isDragging && "scale-110 ring-4 ring-blue-500/50 border-blue-500/50",
            isGenerating && "animate-pulse",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            )}
          />

          <div
            className={cn(
              "absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
              "opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-500",
            )}
          />

          <div className="relative flex h-full w-full items-center justify-center">
            {isGenerating ? (
              <Loader2 className="h-7 w-7 animate-spin text-gray-700" />
            ) : isDragging ? (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-6 w-6 text-blue-600 animate-bounce" />
                <span className="text-[8px] font-semibold text-gray-700 whitespace-nowrap">Drop here</span>
              </div>
            ) : (
              <div
                className={cn(
                  "flex flex-col items-center gap-1 transition-transform duration-300",
                  isHovering && "scale-110",
                )}
              >
                <Upload className="h-7 w-7 text-gray-700 transition-colors group-hover:text-blue-600" />
              </div>
            )}
          </div>

          <div
            className={cn(
              "absolute inset-0 rounded-2xl bg-white/50",
              "opacity-0 group-active:opacity-100 group-active:animate-ping",
            )}
          />
        </button>

        {error && (
          <div className="absolute bottom-20 right-0 w-64 p-3 rounded-xl backdrop-blur-xl bg-red-500/90 text-white text-xs shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
            <p className="font-semibold mb-1">Error</p>
            <p className="opacity-90">{error}</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute bottom-20 right-0 w-64 p-3 rounded-xl backdrop-blur-xl bg-blue-500/90 text-white text-xs shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
            <p className="font-semibold mb-1">Creating your try-on...</p>
            <p className="opacity-90">This may take a few moments</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
    </>
  )
}
