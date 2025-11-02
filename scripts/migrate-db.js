#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script runs database migrations from the migrations directory.
 * 
 * Usage:
 *   node scripts/migrate-db.js [migration-file]
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

async function runMigration(migrationFile) {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL or POSTGRES_URL environment variable is required")
    process.exit(1)
  }

  const migrationsDir = path.join(__dirname, "../lib/db/migrations")
  
  if (migrationFile) {
    // Run specific migration
    const migrationPath = path.join(migrationsDir, migrationFile)
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }
    await executeMigration(migrationPath, databaseUrl)
  } else {
    // Run all migrations in order
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    console.log(`🚀 Running ${migrationFiles.length} migration(s)...`)

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file)
      console.log(`\n📄 Running migration: ${file}`)
      await executeMigration(migrationPath, databaseUrl)
      console.log(`✅ Migration completed: ${file}`)
    }

    console.log("\n✅ All migrations completed successfully!")
  }
}

async function executeMigration(migrationPath, databaseUrl) {
  try {
    const { Pool } = await import("pg")
    const pool = new Pool({ connectionString: databaseUrl })

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")
    await pool.query(migrationSQL)

    await pool.end()
  } catch (error) {
    if (error.message.includes("relation") && error.message.includes("already exists")) {
      console.log("⚠️  Note: Some tables already exist. Skipping creation.")
    } else {
      throw error
    }
  }
}

const migrationFile = process.argv[2]
runMigration(migrationFile).catch((error) => {
  console.error("❌ Migration failed:", error.message)
  process.exit(1)
})

