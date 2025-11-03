/**
 * Link wrapper component that works in both Next.js and widget contexts
 * Webpack will alias next/link to mock in widget context
 */

import React from "react"

// Use require pattern so webpack can alias next/link to mock
// Webpack resolves 'next/link' to the mock file in widget context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NextLinkModule = require("next/link")

// Extract Link component from module (handles both named and default exports)
// In Next.js context: NextLinkModule.Link is the real Next.js Link
// In widget context: NextLinkModule.Link is the mock Link from webpack alias
const LinkComponent: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }> = 
  NextLinkModule.Link || NextLinkModule.default || NextLinkModule

export const Link = LinkComponent
