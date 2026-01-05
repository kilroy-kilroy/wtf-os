-- ============================================
-- Call Lab Instant - Database Schema
-- ============================================
-- Run this migration in Supabase SQL Editor

-- ============================================
-- INSTANT REPORTS (Quick 30-sec analysis)
-- ============================================
CREATE TABLE instant_reports (
  id TEXT PRIMARY KEY,                      -- Short nanoid (10 chars), e.g., 'V1StGXR8_Z'
  email TEXT,                               -- Set when user captures email

  -- Audio/Transcript
  audio_url TEXT,                           -- Optional S3/Supabase storage URL
  transcript TEXT NOT NULL,                 -- Full transcript from Whisper
  duration_seconds INTEGER,                 -- Recording duration

  -- Analysis Results
  analysis JSONB NOT NULL,                  -- Full analysis result
  -- {
  --   summary: "You opened with...",
  --   what_worked: ["Specific client reference", "Clear value prop"],
  --   what_to_watch: ["Too much jargon", "Rushed the close"],
  --   one_move: "Next time, slow down at 0:18..."
  -- }
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),  -- 1-10 score
  scenario_type TEXT,                       -- 'discovery', 'value_prop', 'pricing', 'objection'

  -- Engagement Tracking
  viewed_at TIMESTAMPTZ,                    -- First view timestamp
  view_count INTEGER DEFAULT 0,             -- Total views

  -- Cost Tracking (in cents)
  cost_cents INTEGER DEFAULT 0,             -- ~50 = $0.50

  -- Metadata
  source TEXT DEFAULT 'call-lab-instant',   -- Traffic source
  user_agent TEXT,                          -- Browser info
  ip_address TEXT,                          -- For rate limiting (hashed)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSTANT LEADS (Email captures from instant)
-- ============================================
CREATE TABLE instant_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,

  -- Source tracking
  source TEXT DEFAULT 'call-lab-instant',   -- Where they came from
  first_report_id TEXT REFERENCES instant_reports(id) ON DELETE SET NULL,

  -- Email sequence tracking
  welcome_sent_at TIMESTAMPTZ,              -- Email 1: Report + WTF Guide
  pro_pitch_sent_at TIMESTAMPTZ,            -- Follow-up pitch

  -- Conversion tracking
  subscribed_to_newsletter BOOLEAN DEFAULT TRUE,
  upgraded_to_pro BOOLEAN DEFAULT FALSE,
  upgraded_at TIMESTAMPTZ,

  -- Beehiiv integration
  beehiiv_subscriber_id TEXT,
  beehiiv_synced_at TIMESTAMPTZ,

  -- Metadata
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_instant_reports_email ON instant_reports(email);
CREATE INDEX idx_instant_reports_created ON instant_reports(created_at DESC);
CREATE INDEX idx_instant_reports_score ON instant_reports(score);
CREATE INDEX idx_instant_reports_scenario ON instant_reports(scenario_type);

CREATE INDEX idx_instant_leads_email ON instant_leads(email);
CREATE INDEX idx_instant_leads_source ON instant_leads(source);
CREATE INDEX idx_instant_leads_created ON instant_leads(created_at DESC);
CREATE INDEX idx_instant_leads_upgraded ON instant_leads(upgraded_to_pro) WHERE upgraded_to_pro = TRUE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE instant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_leads ENABLE ROW LEVEL SECURITY;

-- Public can create reports (no auth required for instant)
CREATE POLICY "Anyone can create instant reports" ON instant_reports
  FOR INSERT WITH CHECK (true);

-- Public can view reports by ID (shareable links)
CREATE POLICY "Anyone can view instant reports by id" ON instant_reports
  FOR SELECT USING (true);

-- Service role can update reports (for linking email)
CREATE POLICY "Service role can update instant reports" ON instant_reports
  FOR UPDATE USING (true);

-- Leads are managed via service role only
CREATE POLICY "Service role manages instant leads" ON instant_leads
  FOR ALL USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_report_views(report_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE instant_reports
  SET
    view_count = view_count + 1,
    viewed_at = COALESCE(viewed_at, NOW()),
    updated_at = NOW()
  WHERE id = report_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS VIEWS (Optional)
-- ============================================

-- Daily report stats
CREATE OR REPLACE VIEW instant_report_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(DISTINCT email) as unique_leads,
  AVG(score) as avg_score,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as emails_captured,
  ROUND(COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as capture_rate
FROM instant_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Scenario breakdown
CREATE OR REPLACE VIEW instant_scenario_stats AS
SELECT
  scenario_type,
  COUNT(*) as total,
  AVG(score) as avg_score,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as emails_captured
FROM instant_reports
WHERE scenario_type IS NOT NULL
GROUP BY scenario_type
ORDER BY total DESC;
