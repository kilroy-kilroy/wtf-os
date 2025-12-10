-- ============================================
-- WTF Growth OS - Coaching System Schema
-- Weekly/Monthly/Quarterly Coaching Reports
-- ============================================
-- NOTE: This uses the existing call_scores table for call data.
-- Only creates coaching_reports for storing generated reports.

-- ============================================
-- COACHING REPORTS (Weekly/Monthly/Quarterly)
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  agency_id           uuid REFERENCES agencies(id) ON DELETE CASCADE,

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
  email_status        text,  -- 'pending', 'queued', 'sent', 'failed'

  -- Metadata
  generated_at        timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_reports_user ON coaching_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_agency ON coaching_reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_type ON coaching_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_coaching_reports_period ON coaching_reports(period_start, period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaching_reports_unique_period
  ON coaching_reports(user_id, report_type, period_start, period_end);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE coaching_reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own coaching reports
CREATE POLICY "Users read own coaching reports" ON coaching_reports
  FOR SELECT USING (user_id = auth.uid());

-- Service role can insert/update coaching reports (for cron jobs)
CREATE POLICY "Service role insert coaching reports" ON coaching_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update coaching reports" ON coaching_reports
  FOR UPDATE USING (true);
