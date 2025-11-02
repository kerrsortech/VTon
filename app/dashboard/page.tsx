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
  BarChart3,
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topProducts, setTopProducts] = useState<ProductAnalytics[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
  const [shop, setShop] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    // Auto-refresh data every 30 seconds when shop is set
    if (shop) {
      const interval = setInterval(() => {
        fetchDashboardData(shop, timeRange)
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [shop, timeRange])

  const fetchDashboardData = async (shopDomain: string, range: string) => {
    try {
      setRefreshing(true)
      setError(null)
      // Use API on the same port as the dashboard (standalone mode)
      // The API routes are part of the same Next.js app, so they're available on any port
      const apiUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"
      const response = await fetch(`${apiUrl}/api/analytics/dashboard?shop=${shopDomain}&timeRange=${range}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch dashboard data: ${response.status}`)
      }
      
      const data = await response.json()
      setStats(data.stats)
      setTopProducts(data.topProducts || [])
      setPlan(data.plan)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data")
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
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Please add ?shop=your-store.myshopify.com to the URL</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-sm">
          <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Closelook Analytics Dashboard</h1>
          <p className="text-gray-600 mb-4">Please provide a shop parameter in the URL</p>
          <p className="text-sm text-gray-500 mb-6">Example: <code className="bg-gray-100 px-2 py-1 rounded">?shop=your-store.myshopify.com</code></p>
          <Button
            onClick={() => {
              const shopInput = prompt("Enter your Shopify store domain (e.g., your-store.myshopify.com):")
              if (shopInput) {
                window.location.href = `?shop=${shopInput}`
              }
            }}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Enter Shop Domain
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1 text-sm">{shop}</p>
              </div>
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
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Time Range Filter */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
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
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Current Plan</h2>
                <p className="text-2xl font-bold text-gray-900">{plan.plan_name}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">Usage Status</div>
                <div className="space-y-3">
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
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 hover:shadow-md transition-shadow">
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

            <Card className="p-6 hover:shadow-md transition-shadow">
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

            <Card className="p-6 hover:shadow-md transition-shadow">
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

            <Card className="p-6 hover:shadow-md transition-shadow">
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
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Top Products Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Try-On Products</h2>
            <Package className="h-5 w-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-md"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No try-on data available yet</p>
              <p className="text-sm text-gray-400 mt-2">Try-on events will appear here once users start using the feature</p>
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
                    <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {product.product_image_url ? (
                            <img
                              src={product.product_image_url}
                              alt={product.product_name}
                              className="w-12 h-12 object-cover rounded-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
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
