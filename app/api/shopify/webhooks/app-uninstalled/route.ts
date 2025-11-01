import { NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/shopify/session-storage"
import { logger } from "@/lib/server-logger"

/**
 * Handle app uninstall webhook
 * POST /api/shopify/webhooks/app-uninstalled
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook HMAC (in production, use Shopify SDK)
    const hmac = request.headers.get("X-Shopify-Hmac-Sha256")
    if (!hmac) {
      logger.warn("App uninstall webhook missing HMAC")
      // In production, reject without HMAC
      // return NextResponse.json({ error: "Missing HMAC" }, { status: 401 })
    }

    const body = await request.json()
    const shop = body.shop_domain || body.domain || body.shop

    if (!shop) {
      logger.warn("App uninstall webhook missing shop domain")
      return NextResponse.json(
        { error: "Missing shop domain" },
        { status: 400 }
      )
    }

    logger.info("App uninstall webhook received", { shop })

    // Delete session
    await deleteSession(shop)

    // TODO: Clean up any merchant data (usage stats, settings, etc.)
    // This is important for GDPR compliance

    logger.info("App uninstall cleanup completed", { shop })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("App uninstall webhook error", { error })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

