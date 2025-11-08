/**
 * User Images Database Schema and Utilities
 * 
 * Stores user ID to image URL mappings for persistent user profiles.
 * Supports both Shopify customer IDs and anonymous user IDs.
 * 
 * Uses Neon Postgres for production-grade serverless database.
 * 
 * Database Schema (Postgres):
 *   CREATE TABLE user_images (
 *     id SERIAL PRIMARY KEY,
 *     user_id VARCHAR(255) NOT NULL,
 *     shopify_customer_id VARCHAR(255),
 *     image_type VARCHAR(50) NOT NULL, -- 'fullBody' or 'halfBody'
 *     image_url TEXT NOT NULL,
 *     blob_filename TEXT NOT NULL,
 *     created_at TIMESTAMP DEFAULT NOW(),
 *     updated_at TIMESTAMP DEFAULT NOW(),
 *     UNIQUE(user_id, image_type)
 *   );
 * 
 *   CREATE INDEX idx_user_images_user_id ON user_images(user_id);
 *   CREATE INDEX idx_user_images_shopify_customer_id ON user_images(shopify_customer_id);
 */

import type { Pool } from "pg"

export interface UserImage {
  id?: number
  userId: string
  shopifyCustomerId?: string | null
  username?: string | null
  imageType: "fullBody" | "halfBody"
  imageUrl: string
  blobFilename: string
  createdAt?: Date
  updatedAt?: Date
}

export interface UserImagesResult {
  fullBodyUrl?: string
  halfBodyUrl?: string
}

// Type definitions for database client discriminated union
type NeonQueryFunction = <T extends boolean = false>(
  query: TemplateStringsArray,
  ...params: any[]
) => Promise<any>

type DbClient =
  | { client: "neon"; sql: NeonQueryFunction }
  | { client: "pg"; pool: Pool }

/**
 * Get database client
 * Uses Neon Postgres for production-grade serverless database
 */
async function getDbClient(): Promise<DbClient> {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is required. Please set it to your Neon Postgres connection string.",
    )
  }

  // Prefer Neon serverless client for Next.js API routes (serverless-friendly)
  // Can use pool for traditional server environments by setting USE_SERVERLESS=false
  const useServerless = process.env.USE_SERVERLESS !== "false"

  if (useServerless) {
    try {
      const { getNeonClient } = await import("./neon-client")
      const neonClient = getNeonClient()
      return { client: "neon", sql: neonClient }
    } catch (error) {
      // Fallback to pool if Neon client fails
    }
  }

  // Fallback to Postgres pool for traditional server environments
  try {
    const { getPgPool } = await import("./neon-client")
    const pool = getPgPool()
    return { client: "pg", pool }
  } catch (error) {
    throw new Error(
      `Failed to initialize database connection: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Save user image to database
 */
export async function saveUserImage(image: UserImage): Promise<void> {
  const db = await getDbClient()

  if (db.client === "neon") {
    // Neon serverless client using tagged template literals
    await db.sql`
      INSERT INTO user_images (user_id, shopify_customer_id, username, image_type, image_url, blob_filename, updated_at)
      VALUES (${image.userId}, ${image.shopifyCustomerId || null}, ${image.username || null}, ${image.imageType}, ${image.imageUrl}, ${image.blobFilename}, NOW())
      ON CONFLICT (user_id, image_type)
      DO UPDATE SET
        image_url = EXCLUDED.image_url,
        blob_filename = EXCLUDED.blob_filename,
        shopify_customer_id = COALESCE(EXCLUDED.shopify_customer_id, user_images.shopify_customer_id),
        username = COALESCE(EXCLUDED.username, user_images.username),
        updated_at = NOW()
    `
  } else {
    // Postgres pool (parameterized query for security)
    const query = `
      INSERT INTO user_images (user_id, shopify_customer_id, username, image_type, image_url, blob_filename, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, image_type)
      DO UPDATE SET
        image_url = EXCLUDED.image_url,
        blob_filename = EXCLUDED.blob_filename,
        shopify_customer_id = COALESCE(EXCLUDED.shopify_customer_id, user_images.shopify_customer_id),
        username = COALESCE(EXCLUDED.username, user_images.username),
        updated_at = NOW()
    `
    await db.pool.query(query, [
      image.userId,
      image.shopifyCustomerId || null,
      image.username || null,
      image.imageType,
      image.imageUrl,
      image.blobFilename,
    ])
  }
}

/**
 * Get user images by user ID or Shopify customer ID
 */
export async function getUserImages(
  userId?: string,
  shopifyCustomerId?: string,
): Promise<UserImagesResult> {
  if (!userId && !shopifyCustomerId) {
    return {}
  }

  const db = await getDbClient()
  let rows: any[]

  if (db.client === "neon") {
    // Neon serverless client
    if (shopifyCustomerId) {
      const result = await db.sql`
        SELECT image_type, image_url
        FROM user_images
        WHERE shopify_customer_id = ${shopifyCustomerId}
        ORDER BY updated_at DESC
      `
      rows = result
    } else if (userId) {
      const result = await db.sql`
        SELECT image_type, image_url
        FROM user_images
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `
      rows = result
    } else {
      return {}
    }
  } else {
    // Postgres pool (parameterized query for security)
    let query: string
    let params: any[]

    if (shopifyCustomerId) {
      query = `
        SELECT image_type, image_url
        FROM user_images
        WHERE shopify_customer_id = $1
        ORDER BY updated_at DESC
      `
      params = [shopifyCustomerId]
    } else {
      query = `
        SELECT image_type, image_url
        FROM user_images
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `
      params = [userId!]
    }

    const result = await db.pool.query(query, params)
    rows = result.rows
  }

  const result: UserImagesResult = {}
  for (const row of rows) {
    if (row.image_type === "fullBody") {
      result.fullBodyUrl = row.image_url
    } else if (row.image_type === "halfBody") {
      result.halfBodyUrl = row.image_url
    }
  }

  return result
}

/**
 * Delete user image
 */
export async function deleteUserImage(
  userId: string,
  imageType: "fullBody" | "halfBody",
): Promise<void> {
  const db = await getDbClient()

  if (db.client === "neon") {
    // Neon serverless client
    await db.sql`
      DELETE FROM user_images
      WHERE user_id = ${userId} AND image_type = ${imageType}
    `
  } else {
    // Postgres pool (parameterized query for security)
    await db.pool.query(
      `DELETE FROM user_images WHERE user_id = $1 AND image_type = $2`,
      [userId, imageType],
    )
  }
}

/**
 * Get SQL migration script for creating the table
 */
export function getMigrationSQL(): string {
  return `
-- Create user_images table
CREATE TABLE IF NOT EXISTS user_images (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  shopify_customer_id VARCHAR(255),
  image_type VARCHAR(50) NOT NULL CHECK (image_type IN ('fullBody', 'halfBody')),
  image_url TEXT NOT NULL,
  blob_filename TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, image_type)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_shopify_customer_id ON user_images(shopify_customer_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_images_updated_at BEFORE UPDATE ON user_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`
}

