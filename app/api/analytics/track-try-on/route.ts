/**
 * POST /api/analytics/track-try-on
 * Track a try-on event for analytics
 */

import { NextRequest, NextResponse } from "next/server"
import { trackTryOnEvent } from "@/lib/db/analytics"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shop_domain,
      product_id,
      product_name,
      product_url,
      product_image_url,
      customer_id,
      customer_email,
      shopify_customer_id,
      metadata,
    } = body

    if (!shop_domain) {
      return NextResponse.json(
        { error: "shop_domain is required" },
        { status: 400 }
      )
    }

    const event = await trackTryOnEvent(shop_domain, {
      product_id,
      product_name,
      product_url,
      product_image_url,
      customer_id,
      customer_email,
      shopify_customer_id,
      metadata,
    })

    logger.info("Try-on event tracked", { shop_domain, product_id })

    return NextResponse.json({ success: true, event })
  } catch (error) {
    logger.error("Error tracking try-on event", { error })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

