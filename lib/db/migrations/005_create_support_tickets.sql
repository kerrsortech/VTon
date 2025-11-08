-- Create support_tickets table for tracking customer support tickets
-- Tickets are also created in Shopify as customer notes, but this table provides internal tracking

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(255) PRIMARY KEY,
    issue TEXT NOT NULL,
    context TEXT,
    session_id VARCHAR(255),
    shop_domain VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shopify_note_id VARCHAR(255),
    -- Index for common queries
    CONSTRAINT support_tickets_id_key UNIQUE (id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop_domain ON support_tickets(shop_domain);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Add comment to table
COMMENT ON TABLE support_tickets IS 'Stores support tickets created by customers through the chatbot. Tickets are also created in Shopify as customer notes for shop owner visibility.';



