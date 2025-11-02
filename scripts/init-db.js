#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the Neon Postgres database by:
 * 1. Testing the connection
 * 2. Creating the user_images table
 * 3. Creating indexes and triggers
 * 
 * Usage:
 *   node scripts/init-db.js
 * 
 * Environment Variables:
 *   DATABASE_URL - Neon Postgres connection string (required)
 */

const fs = require("fs")
const path = require("path")

// Load environment variables from .env.local
try {
  require("dotenv").config({ path: path.join(__dirname, "../.env.local") })
} catch (error) {
  // dotenv not available or .env.local not found, continue without it
}

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL or POSTGRES_URL environment variable is required")
    console.error("\nPlease set your Neon Postgres connection string:")
    console.error("  export DATABASE_URL='postgresql://user:password@host/database'")
    console.error("\nOr create a .env.local file with:")
    console.error("  DATABASE_URL=postgresql://user:password@host/database")
    process.exit(1)
  }

  console.log("🚀 Initializing Neon Postgres database...")
  console.log("📡 Connection string:", databaseUrl.replace(/:[^:@]+@/, ":****@")) // Hide password

  try {
    // Try to use Neon serverless client first
    let db
    try {
      const { neon } = await import("@neondatabase/serverless")
      const sql = neon(databaseUrl)
      db = { type: "neon", sql }
      console.log("✅ Using Neon serverless client")
    } catch (error) {
      // Fallback to pg pool
      const { Pool } = await import("pg")
      const pool = new Pool({ connectionString: databaseUrl })
      db = { type: "pg", pool }
      console.log("✅ Using Postgres pool client")
    }

    // Test connection
    console.log("\n🔍 Testing database connection...")
    if (db.type === "neon") {
      const result = await db.sql`SELECT 1 as test`
      if (result && result[0]?.test === 1) {
        console.log("✅ Database connection successful")
      }
    } else {
      const result = await db.pool.query("SELECT 1 as test")
      if (result.rows && result.rows[0]?.test === 1) {
        console.log("✅ Database connection successful")
      }
    }

    // Read migration file
    const migrationPath = path.join(__dirname, "../lib/db/migrations/001_create_user_images.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log("\n📊 Creating database tables...")
    
    // Execute migration
    if (db.type === "neon") {
      // Neon uses tagged template literals, so we need to execute raw SQL differently
      // For migrations, we'll use the pool client
      const { Pool } = await import("pg")
      const pool = new Pool({ connectionString: databaseUrl })
      await pool.query(migrationSQL)
      await pool.end()
    } else {
      await db.pool.query(migrationSQL)
    }

    console.log("✅ Database tables created successfully")
    console.log("\n✅ Database initialization complete!")
    console.log("\n📋 Next steps:")
    console.log("  1. Your database is ready to use")
    console.log("  2. User images will be automatically saved on upload")
    console.log("  3. Existing user images will be retrieved automatically")
    console.log("\n🎉 Setup complete!")

    // Close connections
    if (db.type === "pg") {
      await db.pool.end()
    }
  } catch (error) {
    console.error("\n❌ Database initialization failed:")
    console.error(error.message)
    
    if (error.message.includes("relation") && error.message.includes("already exists")) {
      console.log("\nℹ️  Note: Tables already exist. This is OK if you're re-running the script.")
    } else {
      console.error("\n💡 Troubleshooting:")
      console.error("  - Check your DATABASE_URL is correct")
      console.error("  - Ensure your Neon database is active")
      console.error("  - Verify network connectivity")
      process.exit(1)
    }
  }
}

// Run initialization
initDatabase().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

