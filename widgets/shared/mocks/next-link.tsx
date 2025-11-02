/**
 * Mock Next.js Link component for standalone widget environment
 */

import React from "react"

interface LinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Link({ href, children, className, onClick }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (onClick) {
      onClick()
    } else if (typeof window !== "undefined") {
      window.location.href = href
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}

