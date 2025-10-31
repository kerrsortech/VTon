"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, Share2, Check, Copy, Facebook, Twitter, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TryOnActionsProps {
  imageUrl: string
  productName: string
}

export function TryOnActions({ imageUrl, productName }: TryOnActionsProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `closelook-tryon-${productName.toLowerCase().replace(/\s+/g, "-")}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Download Started",
        description: "Your try-on image is being downloaded.",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      })
    }
  }

  const shareToSocial = (platform: "facebook" | "twitter" | "email") => {
    const url = window.location.href
    const text = `Check out how ${productName} looks on me with Closelook virtual try-on!`

    let shareUrl = ""

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(`Check out ${productName}`)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400")
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 bg-transparent">
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>

      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Try-On</DialogTitle>
            <DialogDescription>Share your virtual try-on result with friends and family</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copy Link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Share on social media</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => shareToSocial("facebook")} className="w-full">
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" onClick={() => shareToSocial("twitter")} className="w-full">
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={() => shareToSocial("email")} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex gap-3">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Try-on preview"
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{productName}</p>
                  <p className="text-xs text-muted-foreground">Virtual Try-On Result</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
