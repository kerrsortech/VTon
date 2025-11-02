"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  TrendingUp,
  ShoppingBag,
  Target,
  Package,
  Filter,
  RefreshCw,
  Zap,
  CheckCircle2,
} from "lucide-react"

interface DashboardStats {
  totalTryOns: number
  totalOrders: number
  totalConversions: number
  conversionRate: number
  tryOnsThisPeriod: number
  ordersThisPeriod: number
  conversionsThisPeriod: number
  conversionRateThisPeriod: number
}

interface ProductAnalytics {
  product_id: string
  product_name: string
  product_image_url: string | null
  product_url: string | null
  try_on_count: number
  order_count: number
  conversion_rate: number
}

interface Plan {
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
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topProducts, setTopProducts] = useState<ProductAnalytics[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
  const [shop, setShop] = useState<string | null>(null)

  useEffect(() => {
    // Get shop from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get("shop")
    if (shopParam) {
      setShop(shopParam)
      fetchDashboardData(shopParam, timeRange)
    } else {
      setLoading(false)
    }
  }, [timeRange])

  const fetchDashboardData = async (shopDomain: string, range: string) => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/analytics/dashboard?shop=${shopDomain}&timeRange=${range}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setTopProducts(data.topProducts || [])
        setPlan(data.plan)
      } else {
        console.error("Failed to fetch dashboard data")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshData = () => {
    if (shop) {
      fetchDashboardData(shop, timeRange)
    }
  }

  if (loading && !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Please provide a shop parameter in the URL</p>
          <p className="text-sm text-gray-500">Example: /admin?shop=your-store.myshopify.com</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">{shop}</p>
            </div>
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Range Filter */}
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex gap-2">
            {[
              { label: "7 Days", value: "7d" },
              { label: "30 Days", value: "30d" },
              { label: "90 Days", value: "90d" },
              { label: "All Time", value: "all" },
            ].map((option) => (
              <Button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                variant={timeRange === option.value ? "default" : "outline"}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Plan Usage Card */}
        {plan && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Current Plan</h2>
                <p className="text-2xl font-bold text-gray-900">{plan.plan_name}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">Usage Status</div>
                <div className="space-y-2">
                  {plan.plan_limits.try_ons !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Try-Ons</span>
                        <span className="font-medium">
                          {plan.plan_usage.try_ons || 0} / {plan.plan_limits.try_ons === -1 ? "∞" : plan.plan_limits.try_ons}
                        </span>
                      </div>
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${plan.plan_limits.try_ons === -1 ? 0 : Math.min(((plan.plan_usage.try_ons || 0) / plan.plan_limits.try_ons) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {plan.plan_limits.orders !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Orders</span>
                        <span className="font-medium">
                          {plan.plan_usage.orders || 0} / {plan.plan_limits.orders === -1 ? "∞" : plan.plan_limits.orders}
                        </span>
                      </div>
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${plan.plan_limits.orders === -1 ? 0 : Math.min(((plan.plan_usage.orders || 0) / plan.plan_limits.orders) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Try-Ons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTryOns.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.tryOnsThisPeriod.toLocaleString()} this period
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.ordersThisPeriod.toLocaleString()} this period
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Conversions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversions.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.conversionsThisPeriod.toLocaleString()} this period
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.conversionRateThisPeriod.toFixed(1)}% this period
              </p>
            </Card>
          </div>
        )}

        {/* Top Products Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Try-On Products</h2>
            <Package className="h-5 w-5 text-gray-400" />
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No try-on data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Try-Ons</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Orders</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {product.product_image_url ? (
                            <img
                              src={product.product_image_url}
                              alt={product.product_name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.product_name}</p>
                            {product.product_url && (
                              <a
                                href={product.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View Product →
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-medium text-gray-900">{product.try_on_count}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-medium text-gray-900">{product.order_count}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium text-gray-900">
                            {product.conversion_rate.toFixed(1)}%
                          </span>
                          {product.conversion_rate > 10 && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
