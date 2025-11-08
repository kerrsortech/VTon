-- Migration: Add username column to user_images table
-- This migration adds a username field to store Shopify customer names

-- Add username column (nullable for backward compatibility)
ALTER TABLE user_images 
ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN user_images.username IS 'Shopify customer username/name (first name + last name)';

