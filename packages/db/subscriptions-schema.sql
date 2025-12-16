-- ============================================
-- WTF Growth OS - Subscriptions Schema
-- Tracks Stripe subscriptions for Pro users
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe IDs
  stripe_customer_id    text NOT NULL,
  stripe_subscription_id text UNIQUE NOT NULL,

  -- User linkage (may be null if user hasn't logged in yet)
  user_id               uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Customer info from Stripe
  customer_email        text NOT NULL,

  -- Plan info
  plan_type             text NOT NULL,  -- 'solo' or 'team'

  -- Subscription status
  status                text NOT NULL,  -- 'active', 'canceled', 'past_due', 'trialing', etc.

  -- Dates
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  canceled_at           timestamptz,

  -- Metadata
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for webhook)
CREATE POLICY "Service role full access" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');
