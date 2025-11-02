/**
 * Mock Next.js navigation hooks for standalone widget environment
 */

// Mock usePathname hook
export function usePathname(): string {
  // Return current window location pathname
  if (typeof window !== "undefined") {
    return window.location.pathname
  }
  return "/"
}

// Mock useRouter hook
export function useRouter() {
  return {
    push: (url: string) => {
      if (typeof window !== "undefined") {
        window.location.href = url
      }
    },
    replace: (url: string) => {
      if (typeof window !== "undefined") {
        window.location.replace(url)
      }
    },
    back: () => {
      if (typeof window !== "undefined") {
        window.history.back()
      }
    },
  }
}

