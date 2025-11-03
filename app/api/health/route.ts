import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { logger } from "@/lib/server-logger"
import { addCorsHeaders } from "@/lib/cors-headers"

/**
 * Health Check Endpoint
 * 
 * Allows widgets to verify backend connectivity and service health
 * Returns status of critical services: database, APIs, etc.
 * 
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      database: "unknown",
      gemini: "unknown",
      replicate: "unknown",
    },
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  }

  // Check database connection
  try {
    const sql = neon(process.env.DATABASE_URL || "")
    const result = await sql`SELECT 1 as test`
    
    if (result && result[0]?.test === 1) {
      health.services.database = "healthy"
    } else {
      health.services.database = "unhealthy"
      health.status = "degraded"
    }
  } catch (error) {
    logger.error("Health check: Database connection failed", { 
      error: error instanceof Error ? error.message : String(error) 
    })
    health.services.database = "unhealthy"
    health.status = "degraded"
  }

  // Check Gemini API key
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    health.services.gemini = "configured"
  } else {
    health.services.gemini = "not_configured"
    health.status = "degraded"
  }

  // Check Replicate API key
  if (process.env.REPLICATE_API_TOKEN) {
    health.services.replicate = "configured"
  } else {
    health.services.replicate = "not_configured"
  }

  const responseTime = Date.now() - startTime
  
  const response = NextResponse.json({
    ...health,
    responseTime: `${responseTime}ms`,
  }, { 
    status: health.status === "healthy" ? 200 : 503 
  })
  
  return addCorsHeaders(response, request)
}

export const config = {
  maxDuration: 10,
}

