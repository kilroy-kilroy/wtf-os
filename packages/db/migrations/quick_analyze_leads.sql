-- Migration: Create quick_analyze_leads table for Call Lab Instant lead capture
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS quick_analyze_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'quick-analyze',
  transcript TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Prevent duplicate emails
  CONSTRAINT unique_lead_email UNIQUE (email)
);

-- Index for querying by source and date
CREATE INDEX IF NOT EXISTS idx_leads_source ON quick_analyze_leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON quick_analyze_leads(created_at DESC);

-- Enable RLS
ALTER TABLE quick_analyze_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON quick_analyze_leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE quick_analyze_leads IS 'Leads captured from Call Lab Instant quick analyze feature';
