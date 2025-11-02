/**
 * GET /api/analytics/dashboard
 * Get dashboard statistics for a store
 * Query params: shop, timeRange (7d|30d|90d|all)
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getDashboardStats,
  getTopProducts,
  getStorePlan,
} from "@/lib/db/analytics"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")
    const timeRange = (searchParams.get("timeRange") as "7d" | "30d" | "90d" | "all") || "30d"

    if (!shop) {
      return NextResponse.json(
        { error: "shop parameter is required" },
        { status: 400 }
      )
    }

    // Get dashboard stats
    const stats = await getDashboardStats(shop, timeRange)

    // Get top products
    const topProducts = await getTopProducts(shop, 50, timeRange)

    // Get plan information
    const plan = await getStorePlan(shop)

    return NextResponse.json({
      stats,
      topProducts,
      plan: plan
        ? {
            plan_id: plan.plan_id,
            plan_name: plan.plan_name,
            plan_limits: plan.plan_limits,
            plan_usage: plan.plan_usage,
          }
        : null,
    })
  } catch (error) {
    logger.error("Error fetching dashboard data", { error })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

