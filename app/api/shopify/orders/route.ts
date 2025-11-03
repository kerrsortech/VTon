import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/shopify/session-storage"
import {
  fetchCustomerOrders,
  fetchOrderByName,
  fetchCustomerByEmail,
} from "@/lib/shopify/api-client"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

/**
 * GET /api/shopify/orders
 * Fetch orders by customer email or order number
 * Query params:
 *   - email: Customer email address
 *   - orderName: Order name/number (e.g., "1001" or "#1001")
 *   - shop: Shop domain (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const orderName = searchParams.get("orderName")
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSession(shop)
    if (!session) {
      return NextResponse.json(
        { error: "Shop session not found. Please install the app first." },
        { status: 401 }
      )
    }

    // Fix: The session storage seems to store JWT as accessToken
    // For now, we'll need to extract the actual token
    // This is a temporary workaround - the session storage should be fixed
    // For production, ensure the actual access token is stored correctly
    if (!session.accessToken || session.accessToken === "") {
      return NextResponse.json(
        { error: "Invalid session: access token missing" },
        { status: 401 }
      )
    }

    // If order name is provided, fetch that specific order
    if (orderName) {
      const order = await fetchOrderByName(session, orderName)
      if (!order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ order })
    }

    // If email is provided, fetch customer orders
    if (email) {
      const orders = await fetchCustomerOrders(session, email, 10)
      return NextResponse.json({ orders })
    }

    return NextResponse.json(
      { error: "Either 'email' or 'orderName' parameter is required" },
      { status: 400 }
    )
  } catch (error: any) {
    logger.error("Shopify Orders API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

/**
 * POST /api/shopify/orders
 * Fetch orders with customer info
 * Body: { email?: string, orderName?: string, shop: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, orderName, shop } = body

    if (!shop) {
      return NextResponse.json(
        { error: "Shop is required" },
        { status: 400 }
      )
    }

    const session = await getSession(shop)
    if (!session) {
      return NextResponse.json(
        { error: "Shop session not found. Please install the app first." },
        { status: 401 }
      )
    }

    if (!session.accessToken || session.accessToken === "") {
      return NextResponse.json(
        { error: "Invalid session: access token missing" },
        { status: 401 }
      )
    }

    let result: any = {}

    // Fetch specific order
    if (orderName) {
      const order = await fetchOrderByName(session, orderName)
      if (order) {
        result.order = order
      }
    }

    // Fetch customer info and orders
    if (email) {
      const customer = await fetchCustomerByEmail(session, email)
      if (customer) {
        result.customer = customer
      }

      const orders = await fetchCustomerOrders(session, email, 10)
      result.orders = orders
    }

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error("Shopify Orders API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

export const config = {
  maxDuration: 30,
}

