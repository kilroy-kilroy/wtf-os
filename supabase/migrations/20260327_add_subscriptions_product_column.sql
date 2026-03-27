-- supabase/migrations/20260327_add_subscriptions_product_column.sql

-- Add product column to track which product the subscription is for
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS product text;

-- Add index for product lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON subscriptions (product);
