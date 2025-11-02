/**
 * Analytics Database Functions
 * Handles all analytics-related database operations
 */

import { getNeonClient } from "./neon-client"
import { logger } from "@/lib/server-logger"

export interface Store {
  id: number
  shop_domain: string
  shop_name: string | null
  plan_id: string
  plan_name: string
  plan_limits: {
    try_ons?: number
    orders?: number
  }
  plan_usage: {
    try_ons?: number
    orders?: number
  }
  is_active: boolean
  installed_at: Date
}

export interface TryOnEvent {
  id: number
  store_id: number
  shop_domain: string
  product_id: string | null
  product_name: string | null
  product_url: string | null
  product_image_url: string | null
  customer_id: string | null
  customer_email: string | null
  shopify_customer_id: string | null
  event_type: string
  metadata: Record<string, unknown> | null
  created_at: Date
}

export interface Order {
  id: number
  store_id: number
  shop_domain: string
  shopify_order_id: string
  order_name: string | null
  order_number: string | null
  customer_id: string | null
  customer_email: string | null
  shopify_customer_id: string | null
  total_price: number | null
  currency_code: string | null
  line_items: unknown[]
  order_status: string | null
  created_at: Date
}

export interface ProductAnalytics {
  product_id: string
  product_name: string
  product_image_url: string | null
  product_url: string | null
  try_on_count: number
  order_count: number
  conversion_rate: number
}

/**
 * Get or create store record
 */
export async function getOrCreateStore(
  shopDomain: string,
  shopName?: string,
  accessToken?: string,
): Promise<Store> {
  try {
    const client = getNeonClient()

    // Try to get existing store
    const existing = await client`
      SELECT * FROM stores 
      WHERE shop_domain = ${shopDomain}
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      // Update access token if provided
      if (accessToken) {
        await client`
          UPDATE stores 
          SET access_token = ${accessToken},
              updated_at = NOW()
          WHERE shop_domain = ${shopDomain}
        `
      }

      return existing[0] as Store
    }

    // Create new store
    const newStore = await client`
      INSERT INTO stores (shop_domain, shop_name, access_token)
      VALUES (${shopDomain}, ${shopName || null}, ${accessToken || null})
      RETURNING *
    `

    logger.info("Store created", { shopDomain })
    return newStore[0] as Store
  } catch (error) {
    logger.error("Error getting/creating store", { shopDomain, error })
    throw error
  }
}

/**
 * Track a try-on event
 */
export async function trackTryOnEvent(
  shopDomain: string,
  data: {
    product_id?: string
    product_name?: string
    product_url?: string
    product_image_url?: string
    customer_id?: string
    customer_email?: string
    shopify_customer_id?: string
    metadata?: Record<string, unknown>
  },
): Promise<TryOnEvent> {
  try {
    const client = getNeonClient()

    // Get store
    const store = await getOrCreateStore(shopDomain)

    // Insert try-on event
    const event = await client`
      INSERT INTO try_on_events (
        store_id, shop_domain, product_id, product_name, product_url,
        product_image_url, customer_id, customer_email, shopify_customer_id, metadata
      )
      VALUES (
        ${store.id}, ${shopDomain}, ${data.product_id || null}, 
        ${data.product_name || null}, ${data.product_url || null},
        ${data.product_image_url || null}, ${data.customer_id || null},
        ${data.customer_email || null}, ${data.shopify_customer_id || null},
        ${data.metadata ? JSON.stringify(data.metadata) : null}
      )
      RETURNING *
    `

    // Update usage counter
    const currentUsage = (store.plan_usage as { try_ons?: number; orders?: number }) || { try_ons: 0 }
    const newTryOnCount = (currentUsage.try_ons || 0) + 1
    const updatedUsage = { ...currentUsage, try_ons: newTryOnCount }
    await client`
      UPDATE stores
      SET plan_usage = ${JSON.stringify(updatedUsage)}::jsonb,
          updated_at = NOW()
      WHERE id = ${store.id}
    `

    logger.debug("Try-on event tracked", { shopDomain, productId: data.product_id })
    return event[0] as TryOnEvent
  } catch (error) {
    logger.error("Error tracking try-on event", { shopDomain, error })
    throw error
  }
}

/**
 * Track an order
 */
export async function trackOrder(
  shopDomain: string,
  orderData: {
    shopify_order_id: string
    order_name?: string
    order_number?: string
    customer_id?: string
    customer_email?: string
    shopify_customer_id?: string
    total_price?: number
    currency_code?: string
    line_items?: unknown[]
    order_status?: string
  },
): Promise<Order> {
  try {
    const client = getNeonClient()

    // Get store
    const store = await getOrCreateStore(shopDomain)

    // Insert or update order
    const order = await client`
      INSERT INTO orders (
        store_id, shop_domain, shopify_order_id, order_name, order_number,
        customer_id, customer_email, shopify_customer_id, total_price,
        currency_code, line_items, order_status
      )
      VALUES (
        ${store.id}, ${shopDomain}, ${orderData.shopify_order_id},
        ${orderData.order_name || null}, ${orderData.order_number || null},
        ${orderData.customer_id || null}, ${orderData.customer_email || null},
        ${orderData.shopify_customer_id || null}, ${orderData.total_price || null},
        ${orderData.currency_code || null}, 
        ${orderData.line_items ? JSON.stringify(orderData.line_items) : null},
        ${orderData.order_status || null}
      )
      ON CONFLICT (shop_domain, shopify_order_id) 
      DO UPDATE SET
        order_status = EXCLUDED.order_status,
        total_price = EXCLUDED.total_price,
        updated_at = NOW()
      RETURNING *
    `

    // Try to match with try-on events for conversion tracking
    await matchOrderToTryOns(shopDomain, order[0].id, orderData)

    // Update usage counter
    const currentUsage = (store.plan_usage as { try_ons?: number; orders?: number }) || { orders: 0 }
    const newOrderCount = (currentUsage.orders || 0) + 1
    const updatedUsage = { ...currentUsage, orders: newOrderCount }
    await client`
      UPDATE stores
      SET plan_usage = ${JSON.stringify(updatedUsage)}::jsonb,
          updated_at = NOW()
      WHERE id = ${store.id}
    `

    logger.debug("Order tracked", { shopDomain, orderId: orderData.shopify_order_id })
    return order[0] as Order
  } catch (error) {
    logger.error("Error tracking order", { shopDomain, error })
    throw error
  }
}

/**
 * Match order to previous try-on events (for conversion tracking)
 */
async function matchOrderToTryOns(
  shopDomain: string,
  orderId: number,
  orderData: {
    customer_email?: string
    shopify_customer_id?: string
    line_items?: unknown[]
  },
): Promise<void> {
  try {
    const client = getNeonClient()

    const conversionWindowHours = 30 * 24 // 30 days

    // Find matching try-on events within conversion window
    let matchingTryOns
    if (orderData.customer_email && orderData.shopify_customer_id) {
      matchingTryOns = await client`
        SELECT t.id, t.product_id, t.customer_email, t.shopify_customer_id
        FROM try_on_events t
        WHERE t.shop_domain = ${shopDomain}
          AND t.created_at >= NOW() - INTERVAL '${conversionWindowHours} hours'
          AND (
            t.customer_email = ${orderData.customer_email}
            OR t.shopify_customer_id = ${orderData.shopify_customer_id}
          )
      `
    } else if (orderData.customer_email) {
      matchingTryOns = await client`
        SELECT t.id, t.product_id, t.customer_email, t.shopify_customer_id
        FROM try_on_events t
        WHERE t.shop_domain = ${shopDomain}
          AND t.created_at >= NOW() - INTERVAL '${conversionWindowHours} hours'
          AND t.customer_email = ${orderData.customer_email}
      `
    } else if (orderData.shopify_customer_id) {
      matchingTryOns = await client`
        SELECT t.id, t.product_id, t.customer_email, t.shopify_customer_id
        FROM try_on_events t
        WHERE t.shop_domain = ${shopDomain}
          AND t.created_at >= NOW() - INTERVAL '${conversionWindowHours} hours'
          AND t.shopify_customer_id = ${orderData.shopify_customer_id}
      `
    } else {
      matchingTryOns = []
    }

    // Create conversion records for matching try-ons
    for (const tryOn of matchingTryOns) {
      // Check if product matches any line item (simplified matching)
      const lineItems = orderData.line_items || []
      const productInOrder = lineItems.some((item: any) => {
        // This is a simplified check - in production, you'd match by product ID
        return true // For now, we'll match all try-ons from same customer
      })

      if (productInOrder || matchingTryOns.length === 1) {
        await client`
          INSERT INTO order_conversions (
            store_id, shop_domain, try_on_event_id, order_id, product_id,
            customer_id, customer_email, shopify_customer_id
          )
          SELECT 
            (SELECT id FROM stores WHERE shop_domain = ${shopDomain} LIMIT 1),
            ${shopDomain}, ${tryOn.id}, ${orderId}, ${tryOn.product_id},
            NULL, ${tryOn.customer_email}, ${tryOn.shopify_customer_id}
          WHERE NOT EXISTS (
            SELECT 1 FROM order_conversions 
            WHERE try_on_event_id = ${tryOn.id} AND order_id = ${orderId}
          )
        `
      }
    }
  } catch (error) {
    logger.error("Error matching order to try-ons", { shopDomain, error })
    // Don't throw - this is not critical
  }
}

/**
 * Get dashboard statistics for a store
 */
export async function getDashboardStats(
  shopDomain: string,
  timeRange: "7d" | "30d" | "90d" | "all" = "30d",
): Promise<{
  totalTryOns: number
  totalOrders: number
  totalConversions: number
  conversionRate: number
  tryOnsThisPeriod: number
  ordersThisPeriod: number
  conversionsThisPeriod: number
  conversionRateThisPeriod: number
}> {
  try {
    const client = getNeonClient()

    const store = await getOrCreateStore(shopDomain)
    if (!store) {
      throw new Error("Store not found")
    }

    // Get try-ons (all time)
    const tryOnsResult = await client`
      SELECT COUNT(*) as count FROM try_on_events 
      WHERE shop_domain = ${shopDomain}
    `
    const totalTryOns = Number(tryOnsResult[0]?.count || 0)

    // Get try-ons (period)
    let tryOnsPeriodResult
    if (timeRange === "7d") {
      tryOnsPeriodResult = await client`
        SELECT COUNT(*) as count FROM try_on_events 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '7 days'
      `
    } else if (timeRange === "30d") {
      tryOnsPeriodResult = await client`
        SELECT COUNT(*) as count FROM try_on_events 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '30 days'
      `
    } else if (timeRange === "90d") {
      tryOnsPeriodResult = await client`
        SELECT COUNT(*) as count FROM try_on_events 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '90 days'
      `
    } else {
      tryOnsPeriodResult = tryOnsResult
    }
    const tryOnsThisPeriod = Number(tryOnsPeriodResult[0]?.count || 0)

    // Get orders (all time)
    const ordersResult = await client`
      SELECT COUNT(*) as count FROM orders 
      WHERE shop_domain = ${shopDomain}
    `
    const totalOrders = Number(ordersResult[0]?.count || 0)

    // Get orders (period)
    let ordersPeriodResult
    if (timeRange === "7d") {
      ordersPeriodResult = await client`
        SELECT COUNT(*) as count FROM orders 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '7 days'
      `
    } else if (timeRange === "30d") {
      ordersPeriodResult = await client`
        SELECT COUNT(*) as count FROM orders 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '30 days'
      `
    } else if (timeRange === "90d") {
      ordersPeriodResult = await client`
        SELECT COUNT(*) as count FROM orders 
        WHERE shop_domain = ${shopDomain} 
          AND created_at >= NOW() - INTERVAL '90 days'
      `
    } else {
      ordersPeriodResult = ordersResult
    }
    const ordersThisPeriod = Number(ordersPeriodResult[0]?.count || 0)

    // Get conversions (all time)
    const conversionsResult = await client`
      SELECT COUNT(DISTINCT try_on_event_id) as count FROM order_conversions 
      WHERE shop_domain = ${shopDomain}
    `
    const totalConversions = Number(conversionsResult[0]?.count || 0)

    // Get conversions (period)
    let conversionsPeriodResult
    if (timeRange === "7d") {
      conversionsPeriodResult = await client`
        SELECT COUNT(DISTINCT oc.try_on_event_id) as count 
        FROM order_conversions oc
        INNER JOIN try_on_events t ON oc.try_on_event_id = t.id
        WHERE oc.shop_domain = ${shopDomain} 
          AND t.created_at >= NOW() - INTERVAL '7 days'
      `
    } else if (timeRange === "30d") {
      conversionsPeriodResult = await client`
        SELECT COUNT(DISTINCT oc.try_on_event_id) as count 
        FROM order_conversions oc
        INNER JOIN try_on_events t ON oc.try_on_event_id = t.id
        WHERE oc.shop_domain = ${shopDomain} 
          AND t.created_at >= NOW() - INTERVAL '30 days'
      `
    } else if (timeRange === "90d") {
      conversionsPeriodResult = await client`
        SELECT COUNT(DISTINCT oc.try_on_event_id) as count 
        FROM order_conversions oc
        INNER JOIN try_on_events t ON oc.try_on_event_id = t.id
        WHERE oc.shop_domain = ${shopDomain} 
          AND t.created_at >= NOW() - INTERVAL '90 days'
      `
    } else {
      conversionsPeriodResult = conversionsResult
    }
    const conversionsThisPeriod = Number(conversionsPeriodResult[0]?.count || 0)

    const conversionRate = totalTryOns > 0 ? (totalConversions / totalTryOns) * 100 : 0
    const conversionRateThisPeriod =
      tryOnsThisPeriod > 0 ? (conversionsThisPeriod / tryOnsThisPeriod) * 100 : 0

    return {
      totalTryOns,
      totalOrders,
      totalConversions,
      conversionRate,
      tryOnsThisPeriod,
      ordersThisPeriod,
      conversionsThisPeriod,
      conversionRateThisPeriod,
    }
  } catch (error) {
    logger.error("Error getting dashboard stats", { shopDomain, error })
    throw error
  }
}

/**
 * Get top products by try-on count
 */
export async function getTopProducts(
  shopDomain: string,
  limit: number = 10,
  timeRange: "7d" | "30d" | "90d" | "all" = "30d",
): Promise<ProductAnalytics[]> {
  try {
    const client = getNeonClient()

    let products
    if (timeRange === "7d") {
      products = await client`
        SELECT 
          t.product_id,
          t.product_name,
          t.product_image_url,
          t.product_url,
          COUNT(t.id) as try_on_count,
          COUNT(DISTINCT oc.order_id) as order_count
        FROM try_on_events t
        LEFT JOIN order_conversions oc ON t.id = oc.try_on_event_id
        WHERE t.shop_domain = ${shopDomain}
          AND t.product_id IS NOT NULL
          AND t.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY t.product_id, t.product_name, t.product_image_url, t.product_url
        ORDER BY try_on_count DESC
        LIMIT ${limit}
      `
    } else if (timeRange === "30d") {
      products = await client`
        SELECT 
          t.product_id,
          t.product_name,
          t.product_image_url,
          t.product_url,
          COUNT(t.id) as try_on_count,
          COUNT(DISTINCT oc.order_id) as order_count
        FROM try_on_events t
        LEFT JOIN order_conversions oc ON t.id = oc.try_on_event_id
        WHERE t.shop_domain = ${shopDomain}
          AND t.product_id IS NOT NULL
          AND t.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY t.product_id, t.product_name, t.product_image_url, t.product_url
        ORDER BY try_on_count DESC
        LIMIT ${limit}
      `
    } else if (timeRange === "90d") {
      products = await client`
        SELECT 
          t.product_id,
          t.product_name,
          t.product_image_url,
          t.product_url,
          COUNT(t.id) as try_on_count,
          COUNT(DISTINCT oc.order_id) as order_count
        FROM try_on_events t
        LEFT JOIN order_conversions oc ON t.id = oc.try_on_event_id
        WHERE t.shop_domain = ${shopDomain}
          AND t.product_id IS NOT NULL
          AND t.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY t.product_id, t.product_name, t.product_image_url, t.product_url
        ORDER BY try_on_count DESC
        LIMIT ${limit}
      `
    } else {
      products = await client`
        SELECT 
          t.product_id,
          t.product_name,
          t.product_image_url,
          t.product_url,
          COUNT(t.id) as try_on_count,
          COUNT(DISTINCT oc.order_id) as order_count
        FROM try_on_events t
        LEFT JOIN order_conversions oc ON t.id = oc.try_on_event_id
        WHERE t.shop_domain = ${shopDomain}
          AND t.product_id IS NOT NULL
        GROUP BY t.product_id, t.product_name, t.product_image_url, t.product_url
        ORDER BY try_on_count DESC
        LIMIT ${limit}
      `
    }

    return products.map((p: any) => ({
      product_id: p.product_id,
      product_name: p.product_name || "Unknown Product",
      product_image_url: p.product_image_url,
      product_url: p.product_url,
      try_on_count: Number(p.try_on_count || 0),
      order_count: Number(p.order_count || 0),
      conversion_rate:
        Number(p.try_on_count || 0) > 0
          ? (Number(p.order_count || 0) / Number(p.try_on_count || 0)) * 100
          : 0,
    }))
  } catch (error) {
    logger.error("Error getting top products", { shopDomain, error })
    throw error
  }
}

/**
 * Get store plan information
 */
export async function getStorePlan(shopDomain: string): Promise<Store | null> {
  try {
    const client = getNeonClient()
    const store = await client`
      SELECT * FROM stores WHERE shop_domain = ${shopDomain} LIMIT 1
    `
    return (store[0] as Store) || null
  } catch (error) {
    logger.error("Error getting store plan", { shopDomain, error })
    return null
  }
}

/**
 * Update store plan
 */
export async function updateStorePlan(
  shopDomain: string,
  planId: string,
  planName: string,
  planLimits: { try_ons?: number; orders?: number },
): Promise<Store> {
  try {
    const client = getNeonClient()
    const store = await client`
      UPDATE stores
      SET plan_id = ${planId},
          plan_name = ${planName},
          plan_limits = ${JSON.stringify(planLimits)}::jsonb,
          updated_at = NOW()
      WHERE shop_domain = ${shopDomain}
      RETURNING *
    `
    return store[0] as Store
  } catch (error) {
    logger.error("Error updating store plan", { shopDomain, error })
    throw error
  }
}

