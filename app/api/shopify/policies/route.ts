import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/shopify/session-storage"
import { fetchStorePolicies } from "@/lib/shopify/api-client"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

/**
 * GET /api/shopify/policies
 * Fetch store policies (shipping, refund, privacy, terms)
 * Query params:
 *   - shop: Shop domain (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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

    if (!session.accessToken || session.accessToken === "") {
      return NextResponse.json(
        { error: "Invalid session: access token missing" },
        { status: 401 }
      )
    }

    const policies = await fetchStorePolicies(session)
    return NextResponse.json({ policies })
  } catch (error: any) {
    logger.error("Shopify Policies API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

/**
 * POST /api/shopify/policies
 * Fetch store policies
 * Body: { shop: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop } = body

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

    const policies = await fetchStorePolicies(session)
    return NextResponse.json({ policies })
  } catch (error: any) {
    logger.error("Shopify Policies API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

