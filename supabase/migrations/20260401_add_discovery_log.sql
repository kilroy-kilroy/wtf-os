-- Discovery Agent Log
-- Tracks automated discovery runs triggered by Copper webhooks

CREATE TABLE IF NOT EXISTS discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id BIGINT NOT NULL,
  opportunity_name TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_payload JSONB,
  output_summary JSONB,
  discovery_brief_id UUID,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discovery_log_opp ON discovery_log(opportunity_id);
CREATE INDEX idx_discovery_log_created ON discovery_log(created_at DESC);

ALTER TABLE discovery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON discovery_log
  FOR ALL USING (true) WITH CHECK (true);
