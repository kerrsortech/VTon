/**
 * POST /api/analytics/orders
 * Track an order from Shopify webhook or manual entry
 */

import { NextRequest, NextResponse } from "next/server"
import { trackOrder, getOrCreateStore } from "@/lib/db/analytics"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shop_domain,
      shopify_order_id,
      order_name,
      order_number,
      customer_id,
      customer_email,
      shopify_customer_id,
      total_price,
      currency_code,
      line_items,
      order_status,
    } = body

    if (!shop_domain || !shopify_order_id) {
      return NextResponse.json(
        { error: "shop_domain and shopify_order_id are required" },
        { status: 400 }
      )
    }

    // Ensure store exists
    await getOrCreateStore(shop_domain)

    const order = await trackOrder(shop_domain, {
      shopify_order_id,
      order_name,
      order_number,
      customer_id,
      customer_email,
      shopify_customer_id,
      total_price,
      currency_code,
      line_items,
      order_status,
    })

    logger.info("Order tracked", { shop_domain, shopify_order_id })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    logger.error("Error tracking order", { error })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

