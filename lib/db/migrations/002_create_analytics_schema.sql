-- Migration: Create analytics schema for dashboard
-- This migration creates tables for tracking try-on events, orders, and store plans

-- Create stores table to track merchant/store information
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  shop_name VARCHAR(255),
  access_token TEXT,
  plan_id VARCHAR(50) DEFAULT 'free',
  plan_name VARCHAR(100) DEFAULT 'Free Plan',
  plan_limits JSONB DEFAULT '{"try_ons": 100, "orders": 1000}'::jsonb,
  plan_usage JSONB DEFAULT '{"try_ons": 0, "orders": 0}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create try_on_events table to track try-on usage
CREATE TABLE IF NOT EXISTS try_on_events (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255),
  product_name VARCHAR(500),
  product_url TEXT,
  product_image_url TEXT,
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  shopify_customer_id VARCHAR(255),
  event_type VARCHAR(50) DEFAULT 'try_on',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table to track Shopify orders (for conversion tracking)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  shopify_order_id VARCHAR(255) NOT NULL,
  order_name VARCHAR(100),
  order_number VARCHAR(100),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  shopify_customer_id VARCHAR(255),
  total_price DECIMAL(10, 2),
  currency_code VARCHAR(10),
  line_items JSONB,
  order_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_domain, shopify_order_id)
);

-- Create order_conversions table to link try-ons to orders (conversion tracking)
CREATE TABLE IF NOT EXISTS order_conversions (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  try_on_event_id INTEGER REFERENCES try_on_events(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  shopify_customer_id VARCHAR(255),
  conversion_window_hours INTEGER DEFAULT 30, -- 30 days default conversion window
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_shop_domain ON stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_try_on_events_store_id ON try_on_events(store_id);
CREATE INDEX IF NOT EXISTS idx_try_on_events_shop_domain ON try_on_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_try_on_events_product_id ON try_on_events(product_id);
CREATE INDEX IF NOT EXISTS idx_try_on_events_customer_id ON try_on_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_try_on_events_created_at ON try_on_events(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_domain ON orders(shop_domain);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_conversions_store_id ON order_conversions(store_id);
CREATE INDEX IF NOT EXISTS idx_order_conversions_try_on_event_id ON order_conversions(try_on_event_id);
CREATE INDEX IF NOT EXISTS idx_order_conversions_order_id ON order_conversions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_conversions_product_id ON order_conversions(product_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at 
BEFORE UPDATE ON stores
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
BEFORE UPDATE ON orders
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE stores IS 'Stores merchant/store information including plan details and usage';
COMMENT ON TABLE try_on_events IS 'Tracks all try-on events per store and product';
COMMENT ON TABLE orders IS 'Tracks Shopify orders for conversion analysis';
COMMENT ON TABLE order_conversions IS 'Links try-on events to orders to calculate conversion rates';

