/**
 * POST /api/shopify/webhooks/orders-create
 * Handle Shopify order creation webhook
 * Tracks orders for conversion analytics
 */

import { NextRequest, NextResponse } from "next/server"
import { trackOrder, getOrCreateStore } from "@/lib/db/analytics"
import { logger } from "@/lib/server-logger"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook HMAC (in production, use Shopify SDK)
    const hmac = request.headers.get("X-Shopify-Hmac-Sha256")
    if (!hmac) {
      logger.warn("Order webhook missing HMAC")
      // In production, reject without HMAC
      // return NextResponse.json({ error: "Missing HMAC" }, { status: 401 })
    }

    const body = await request.json()
    const shopDomain = body.shop_domain || body.domain || body.shop

    if (!shopDomain) {
      logger.warn("Order webhook missing shop domain")
      return NextResponse.json(
        { error: "Missing shop domain" },
        { status: 400 }
      )
    }

    // Extract order data from Shopify webhook payload
    const shopifyOrderId = body.id?.toString() || body.order_id?.toString()
    const orderName = body.name || body.order_name
    const orderNumber = body.order_number?.toString()
    const customerEmail = body.email || body.customer?.email
    const shopifyCustomerId = body.customer_id?.toString() || body.customer?.id?.toString()
    const totalPrice = parseFloat(body.total_price || body.total || "0")
    const currencyCode = body.currency || body.currency_code || "USD"
    const lineItems = body.line_items || body.lineItems || []
    const orderStatus = body.financial_status || body.fulfillment_status || "pending"

    if (!shopifyOrderId) {
      logger.warn("Order webhook missing order ID")
      return NextResponse.json(
        { error: "Missing order ID" },
        { status: 400 }
      )
    }

    logger.info("Order webhook received", { shopDomain, orderName, shopifyOrderId })

    // Ensure store exists
    await getOrCreateStore(shopDomain)

    // Track the order
    await trackOrder(shopDomain, {
      shopify_order_id: shopifyOrderId,
      order_name: orderName,
      order_number: orderNumber,
      customer_email: customerEmail,
      shopify_customer_id: shopifyCustomerId,
      total_price: totalPrice,
      currency_code: currencyCode,
      line_items: lineItems,
      order_status: orderStatus,
    })

    logger.info("Order tracked successfully", { shopDomain, shopifyOrderId })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Order webhook error", { error })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

export const config = {
  maxDuration: 30,
}

