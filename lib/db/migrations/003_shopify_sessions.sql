-- Migration: Shopify Sessions Storage
-- PRODUCTION FIX: Persistent session storage to survive server restarts
-- Created: November 3, 2025

-- Create shopify_sessions table
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT,
  expires TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  storefront_token TEXT,
  custom_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on shop domain (primary lookup key)
CREATE INDEX IF NOT EXISTS idx_sessions_shop ON shopify_sessions(shop);

-- Create index on custom domain (for custom domain lookups)
CREATE INDEX IF NOT EXISTS idx_sessions_custom_domain ON shopify_sessions(custom_domain) WHERE custom_domain IS NOT NULL;

-- Create index on expires for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON shopify_sessions(expires) WHERE expires IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE shopify_sessions IS 'Stores Shopify OAuth sessions with support for custom domains. Sessions are cached in-memory for performance.';
COMMENT ON COLUMN shopify_sessions.shop IS 'Shopify myshopify.com domain (e.g., store.myshopify.com)';
COMMENT ON COLUMN shopify_sessions.access_token IS 'Shopify Admin API access token (encrypted in production)';
COMMENT ON COLUMN shopify_sessions.storefront_token IS 'Shopify Storefront API token for public product queries';
COMMENT ON COLUMN shopify_sessions.custom_domain IS 'Custom domain if merchant uses one (e.g., www.example.com)';

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shopify_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shopify_sessions_updated_at
  BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_sessions_updated_at();

