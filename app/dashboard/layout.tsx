import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Closelook Analytics Dashboard",
  description: "Analytics dashboard for Closelook virtual try-on plugin",
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

