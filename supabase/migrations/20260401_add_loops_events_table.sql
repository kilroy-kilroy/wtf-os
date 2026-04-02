-- Loops Event Audit Log
-- Tracks every event sent to Loops.so for per-user visibility

CREATE TABLE IF NOT EXISTS loops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_id UUID,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loops_events_email ON loops_events(user_email);
CREATE INDEX idx_loops_events_user_id ON loops_events(user_id);
CREATE INDEX idx_loops_events_sent_at ON loops_events(sent_at DESC);

ALTER TABLE loops_events ENABLE ROW LEVEL SECURITY;

-- Only service role needs access (admin API uses service role)
CREATE POLICY "Service role full access" ON loops_events
  FOR ALL USING (true) WITH CHECK (true);
