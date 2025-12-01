-- ============================================
-- CALL LAB REPORTS TABLE
-- For storing Lite and Pro analysis results
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS call_lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Call metadata
  call_id text,
  buyer_name text DEFAULT '',
  company_name text DEFAULT '',

  -- Scores (from report)
  overall_score numeric,
  trust_velocity numeric,
  agenda_control numeric,
  pattern_density numeric,

  -- Pattern info
  primary_pattern text DEFAULT '',
  improvement_highlight text DEFAULT '',

  -- Full JSON report
  full_report jsonb NOT NULL,

  -- Analysis metadata
  agent text NOT NULL CHECK (agent IN ('lite', 'pro')),
  version text NOT NULL,
  transcript text DEFAULT '',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add buyer_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'buyer_name') THEN
    ALTER TABLE call_lab_reports ADD COLUMN buyer_name text DEFAULT '';
  END IF;

  -- Add company_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'company_name') THEN
    ALTER TABLE call_lab_reports ADD COLUMN company_name text DEFAULT '';
  END IF;

  -- Add overall_score if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'overall_score') THEN
    ALTER TABLE call_lab_reports ADD COLUMN overall_score numeric;
  END IF;

  -- Add trust_velocity if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'trust_velocity') THEN
    ALTER TABLE call_lab_reports ADD COLUMN trust_velocity numeric;
  END IF;

  -- Add agenda_control if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'agenda_control') THEN
    ALTER TABLE call_lab_reports ADD COLUMN agenda_control numeric;
  END IF;

  -- Add pattern_density if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'pattern_density') THEN
    ALTER TABLE call_lab_reports ADD COLUMN pattern_density numeric;
  END IF;

  -- Add primary_pattern if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'primary_pattern') THEN
    ALTER TABLE call_lab_reports ADD COLUMN primary_pattern text DEFAULT '';
  END IF;

  -- Add improvement_highlight if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'improvement_highlight') THEN
    ALTER TABLE call_lab_reports ADD COLUMN improvement_highlight text DEFAULT '';
  END IF;

  -- Add full_report if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'full_report') THEN
    ALTER TABLE call_lab_reports ADD COLUMN full_report jsonb;
  END IF;

  -- Add agent if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'agent') THEN
    ALTER TABLE call_lab_reports ADD COLUMN agent text DEFAULT 'lite';
  END IF;

  -- Add version if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'version') THEN
    ALTER TABLE call_lab_reports ADD COLUMN version text DEFAULT '1.0';
  END IF;

  -- Add call_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'call_id') THEN
    ALTER TABLE call_lab_reports ADD COLUMN call_id text DEFAULT '';
  END IF;

  -- Add transcript if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_lab_reports' AND column_name = 'transcript') THEN
    ALTER TABLE call_lab_reports ADD COLUMN transcript text DEFAULT '';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS call_lab_reports_user_id_idx ON call_lab_reports(user_id);
CREATE INDEX IF NOT EXISTS call_lab_reports_agent_idx ON call_lab_reports(agent);
CREATE INDEX IF NOT EXISTS call_lab_reports_created_at_idx ON call_lab_reports(created_at DESC);

-- Enable RLS
ALTER TABLE call_lab_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own reports" ON call_lab_reports;
CREATE POLICY "Users can read own reports" ON call_lab_reports
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert reports" ON call_lab_reports;
CREATE POLICY "Service role can insert reports" ON call_lab_reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own reports" ON call_lab_reports;
CREATE POLICY "Users can update own reports" ON call_lab_reports
  FOR UPDATE USING (user_id = auth.uid());
