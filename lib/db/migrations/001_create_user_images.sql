-- Migration: Create user_images table
-- This migration creates the user_images table for storing user profile images
-- Run this migration on your Postgres database before deploying

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_images_updated_at ON user_images;
CREATE TRIGGER update_user_images_updated_at 
BEFORE UPDATE ON user_images
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_images IS 'Stores user profile images (full body and half body) with user ID and Shopify customer ID mapping';
COMMENT ON COLUMN user_images.user_id IS 'User ID (can be Shopify customer ID or anonymous user ID)';
COMMENT ON COLUMN user_images.shopify_customer_id IS 'Shopify customer ID if user is authenticated in Shopify store';
COMMENT ON COLUMN user_images.image_type IS 'Type of image: fullBody or halfBody';
COMMENT ON COLUMN user_images.image_url IS 'Public URL of the image in blob storage';
COMMENT ON COLUMN user_images.blob_filename IS 'Filename/path in blob storage';

