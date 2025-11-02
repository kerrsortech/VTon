/**
 * Neon Postgres Database Client
 * Production-grade connection handling for Neon serverless Postgres
 */

import { neon, neonConfig } from "@neondatabase/serverless"
import { Pool } from "pg"
import { logger } from "@/lib/server-logger"

// Configure Neon for optimal performance
neonConfig.fetchConnectionCache = true

let neonClient: ReturnType<typeof neon> | null = null
let pgPool: Pool | null = null

/**
 * Get Neon database client (serverless)
 * Best for serverless/edge environments
 */
export function getNeonClient() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is required. Please set it to your Neon Postgres connection string.",
    )
  }

  if (!neonClient) {
    try {
      neonClient = neon(databaseUrl)
      logger.info("Neon client initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize Neon client", { error })
      throw new Error(`Failed to initialize Neon client: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return neonClient
}

/**
 * Get Postgres Pool connection (for Node.js environments)
 * Best for traditional server environments with connection pooling
 */
export function getPgPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is required. Please set it to your Neon Postgres connection string.",
    )
  }

  if (!pgPool) {
    try {
      pgPool = new Pool({
        connectionString: databaseUrl,
        // Production-grade connection pool settings
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
        // SSL required for Neon
        ssl: databaseUrl.includes("neon.tech") || databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
      })

      // Handle pool errors
      pgPool.on("error", (err) => {
        logger.error("Postgres pool error", { error: err.message })
      })

      logger.info("Postgres pool initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize Postgres pool", { error })
      throw new Error(`Failed to initialize Postgres pool: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return pgPool
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Try serverless client first (faster for most use cases)
    if (process.env.USE_SERVERLESS !== "false") {
      const client = getNeonClient()
      const result = await client`SELECT 1 as test`
      if (result && result[0]?.test === 1) {
        logger.info("Database connection test successful (Neon serverless)")
        return true
      }
    }

    // Fallback to pool
    const pool = getPgPool()
    const result = await pool.query("SELECT 1 as test")
    if (result.rows && result.rows[0]?.test === 1) {
      logger.info("Database connection test successful (Postgres pool)")
      return true
    }

    return false
  } catch (error) {
    logger.error("Database connection test failed", { error })
    return false
  }
}

/**
 * Close database connections (cleanup)
 */
export async function closeConnections(): Promise<void> {
  if (pgPool) {
    await pgPool.end()
    pgPool = null
    logger.info("Postgres pool closed")
  }
}

