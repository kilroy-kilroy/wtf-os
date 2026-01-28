-- ============================================
-- GrowthOS Assessment Tables
-- Migration: add-growthos-assessments
-- ============================================

-- Assessment submissions and results
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- Assessment type
  assessment_type TEXT NOT NULL DEFAULT 'agency', -- 'agency', 'sales'
  version TEXT NOT NULL DEFAULT 'v3',

  -- Intake data (raw form submission)
  intake_data JSONB NOT NULL DEFAULT '{}',

  -- Enrichment data from external sources
  enrichment_data JSONB DEFAULT '{}',
  -- {
  --   apify: { homepage, caseStudies, founderPosts, companyPosts },
  --   exa: { visibility, authority, competitors },
  --   llmAwareness: { claude, chatgpt, perplexity, summary },
  --   website: { ... },
  --   meta: { startedAt, completedAt, duration, errors }
  -- }

  -- Scoring results
  scores JSONB DEFAULT '{}',
  -- Agency: {
  --   overall, segment, segmentLabel,
  --   wtfZones: { revenueQuality, profitability, growthVsChurn, ... },
  --   growthLevers, founderOS, impossibilities
  -- }

  overall_score NUMERIC(3,1), -- 1.0 to 5.0 for quick queries

  -- Report data
  report_data JSONB DEFAULT '{}',
  report_html TEXT, -- Generated HTML report
  pdf_url TEXT, -- Supabase storage URL for PDF

  -- Processing state
  status TEXT DEFAULT 'pending', -- 'pending', 'enriching', 'scoring', 'completed', 'failed'
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_agency_id ON assessments(agency_id);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_created ON assessments(created_at DESC);

-- RLS policies
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Users can read their own assessments
CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create assessments
CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for API routes)
CREATE POLICY "Service role full access"
  ON assessments
  USING (auth.role() = 'service_role');

-- Add growth_os_tier to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS growth_os_tier TEXT DEFAULT 'free';

-- Add growth_os_tier to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS growth_os_tier TEXT DEFAULT 'free';
