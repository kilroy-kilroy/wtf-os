-- ============================================
-- WTF Growth OS - Coaching System Schema
-- Weekly/Monthly/Quarterly Coaching Reports
-- ============================================

-- ============================================
-- CALL LAB REPORTS (Individual Call Analysis)
-- Extends call_scores with dashboard-friendly fields
-- ============================================
CREATE TABLE IF NOT EXISTS call_lab_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id              uuid REFERENCES orgs(id) ON DELETE CASCADE,

  -- Call Context
  buyer_name          text,
  company_name        text,
  call_type           text,  -- 'discovery', 'follow_up', 'presentation', 'close'
  call_date           timestamptz,
  duration_minutes    integer,

  -- WTF Method Scores (1-10 scale)
  overall_score       numeric(4,2),
  opening_score       numeric(4,2),       -- Opening & Positioning
  discovery_score     numeric(4,2),       -- Discovery Quality
  diagnostic_score    numeric(4,2),       -- Diagnostic Depth
  value_score         numeric(4,2),       -- Value Articulation
  objection_score     numeric(4,2),       -- Objection Navigation
  commitment_score    numeric(4,2),       -- Commitment & Close
  human_first_score   numeric(4,2),       -- Human-First Index

  -- Dashboard Metrics
  trust_velocity      numeric(4,2),       -- 0-100
  agenda_control      numeric(4,2),       -- 0-100
  pattern_density     numeric(4,2),       -- 0-100 (lower is better)

  -- Pattern Detection
  patterns_detected   text[],             -- Array of pattern names
  primary_pattern     text,               -- Most significant pattern

  -- Insights
  improvement_highlight text,             -- Key thing to work on
  key_moments         jsonb DEFAULT '[]', -- Array of {timestamp, description, type}

  -- Call Outcome
  outcome             text,               -- 'won', 'lost', 'ghosted', 'next_step', 'unknown'
  outcome_updated_at  timestamptz,
  last_nudge_at       timestamptz,        -- Last time we sent a nudge email

  -- Full Report Content
  full_report         jsonb,              -- Complete analysis output

  -- Metadata
  tier                text DEFAULT 'pro', -- 'lite', 'pro'
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_lab_reports_user ON call_lab_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_call_lab_reports_org ON call_lab_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_call_lab_reports_created ON call_lab_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_lab_reports_outcome ON call_lab_reports(outcome);

-- ============================================
-- COACHING REPORTS (Weekly/Monthly/Quarterly)
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id              uuid REFERENCES orgs(id) ON DELETE CASCADE,

  -- Report Type and Period
  report_type         text NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'quarterly')),
  period_start        date NOT NULL,
  period_end          date NOT NULL,

  -- Aggregate Scores (averages for period)
  scores_aggregate    jsonb DEFAULT '{}',
  -- {
  --   overall: 7.5,
  --   opening: 7.2,
  --   discovery: 6.8,
  --   diagnostic: 7.0,
  --   value_articulation: 6.5,
  --   objection_navigation: 7.8,
  --   commitment: 6.2,
  --   human_first: 8.0,
  --   trust_velocity: 72,
  --   agenda_control: 68,
  --   pattern_density: 25
  -- }

  -- Call Count
  calls_analyzed      integer DEFAULT 0,

  -- Trends (vs previous period)
  trends              jsonb DEFAULT '{}',
  -- {
  --   overall_delta: +0.5,
  --   trust_velocity_delta: +8,
  --   patterns_trending_up: ["The Mirror Close"],
  --   patterns_trending_down: ["The Advice Avalanche"]
  -- }

  -- Full Report Content (6 sections)
  content             jsonb NOT NULL,
  -- {
  --   wtf_trends: [...],          -- Top 3 WTF Method Trends
  --   human_first_trendline: {},  -- Human-First Selling analysis
  --   reinforcements: [...],      -- What's Working (3-5 items)
  --   attack_list: [...],         -- What Needs Work (3-5 items)
  --   emergent_patterns: [...],   -- New signals
  --   wrap_up: ""                 -- Tough Love Uncle summary
  -- }

  -- Email Delivery
  email_sent_at       timestamptz,
  email_status        text,  -- 'pending', 'sent', 'failed'

  -- Metadata
  generated_at        timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_reports_user ON coaching_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_type ON coaching_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_period ON coaching_reports(period_start, period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaching_reports_unique_period
  ON coaching_reports(user_id, report_type, period_start, period_end);

-- ============================================
-- CALL FOLLOWUPS (Commitments & Tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS call_followups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  call_id             uuid REFERENCES call_lab_reports(id) ON DELETE CASCADE,

  label               text NOT NULL,
  due_at              timestamptz,
  completed           boolean DEFAULT false,
  completed_at        timestamptz,

  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_followups_user ON call_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_call_followups_call ON call_followups(call_id);
CREATE INDEX IF NOT EXISTS idx_call_followups_due ON call_followups(due_at);

-- ============================================
-- COACHING SCHEDULE (Track report generation)
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_schedule (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,

  -- Preferences
  weekly_enabled      boolean DEFAULT true,
  monthly_enabled     boolean DEFAULT true,
  quarterly_enabled   boolean DEFAULT true,

  -- Last generation timestamps
  last_weekly_at      timestamptz,
  last_monthly_at     timestamptz,
  last_quarterly_at   timestamptz,

  -- Email preferences
  email_time          time DEFAULT '06:00',
  timezone            text DEFAULT 'America/New_York',

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coaching_schedule_user ON coaching_schedule(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE call_lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_schedule ENABLE ROW LEVEL SECURITY;

-- Users can read their own call lab reports
CREATE POLICY "Users read own call reports" ON call_lab_reports
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own call lab reports
CREATE POLICY "Users insert own call reports" ON call_lab_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own call lab reports (for outcome tagging)
CREATE POLICY "Users update own call reports" ON call_lab_reports
  FOR UPDATE USING (user_id = auth.uid());

-- Users can read their own coaching reports
CREATE POLICY "Users read own coaching reports" ON coaching_reports
  FOR SELECT USING (user_id = auth.uid());

-- Users can read their own followups
CREATE POLICY "Users read own followups" ON call_followups
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own followups
CREATE POLICY "Users update own followups" ON call_followups
  FOR UPDATE USING (user_id = auth.uid());

-- Users can read their own coaching schedule
CREATE POLICY "Users read own schedule" ON coaching_schedule
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own coaching schedule
CREATE POLICY "Users update own schedule" ON coaching_schedule
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- SERVICE ROLE POLICIES (for cron jobs)
-- ============================================
-- These allow the service role to insert coaching reports
CREATE POLICY "Service role insert coaching reports" ON coaching_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update coaching reports" ON coaching_reports
  FOR UPDATE USING (true);

-- Service role can update call_lab_reports (for nudge tracking)
CREATE POLICY "Service role update call reports" ON call_lab_reports
  FOR UPDATE USING (true);
