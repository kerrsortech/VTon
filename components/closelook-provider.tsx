"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { TryOnResult, CloselookConfig } from "@/lib/closelook-types"

interface UserImages {
  fullBodyUrl?: string
  halfBodyUrl?: string
}

interface CloselookContextValue {
  tryOnResults: Map<string, TryOnResult>
  addTryOnResult: (productId: string, result: TryOnResult) => void
  getTryOnResult: (productId: string) => TryOnResult | undefined
  clearTryOnResult: (productId: string) => void
  clearAllResults: () => void
  userImages: UserImages
  setUserImages: (images: UserImages) => void
  config: CloselookConfig
  isEnabled: boolean
  setIsEnabled: (enabled: boolean) => void
  generatingProductId: string | null
  setGeneratingProductId: (productId: string | null) => void
}

const CloselookContext = createContext<CloselookContextValue | undefined>(undefined)

interface CloselookProviderProps {
  children: ReactNode
  config?: CloselookConfig
}

export function CloselookProvider({ children, config = {} }: CloselookProviderProps) {
  const [tryOnResults, setTryOnResults] = useState<Map<string, TryOnResult>>(new Map())
  const [userImages, setUserImages] = useState<UserImages>({})
  const [isEnabled, setIsEnabled] = useState(true)
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null)

  const addTryOnResult = (productId: string, result: TryOnResult) => {
    setTryOnResults((prev) => new Map(prev).set(productId, result))
  }

  const getTryOnResult = (productId: string) => {
    return tryOnResults.get(productId)
  }

  const clearTryOnResult = (productId: string) => {
    setTryOnResults((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }

  const clearAllResults = () => {
    setTryOnResults(new Map())
  }

  return (
    <CloselookContext.Provider
      value={{
        tryOnResults,
        addTryOnResult,
        getTryOnResult,
        clearTryOnResult,
        clearAllResults,
        userImages,
        setUserImages,
        config,
        isEnabled,
        setIsEnabled,
        generatingProductId,
        setGeneratingProductId,
      }}
    >
      {children}
    </CloselookContext.Provider>
  )
}

export function useCloselook() {
  const context = useContext(CloselookContext)
  if (!context) {
    throw new Error("useCloselook must be used within CloselookProvider")
  }
  return context
}
