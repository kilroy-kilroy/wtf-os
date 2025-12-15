-- ============================================
-- WTF Growth OS - Phase 1 Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  auth_method TEXT DEFAULT 'magic_link', -- 'magic_link', 'password', 'google'
  subscription_tier TEXT DEFAULT 'lead', -- 'lead', 'free', 'subscriber', 'client' (legacy)

  -- Per-product subscription tiers
  -- Values: 'free' | 'pro' (null means never accessed)
  call_lab_tier TEXT DEFAULT 'free',
  discovery_lab_tier TEXT,

  tags JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGENCIES
-- ============================================
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT,
  industry TEXT,
  team_size TEXT, -- '1-5', '6-15', '16-50', '50+'
  revenue_band TEXT, -- '<500k', '500k-1m', '1m-3m', '3m-10m', '10m+'
  services JSONB DEFAULT '[]',
  icp_data JSONB DEFAULT '{}',
  market_position TEXT,
  health_scores JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER <-> AGENCY ASSIGNMENTS
-- ============================================
CREATE TABLE user_agency_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

-- ============================================
-- COMPANIES (prospects, clients, any external company)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT,
  industry TEXT,
  markets_served JSONB DEFAULT '[]',
  services_offered JSONB DEFAULT '[]',
  competitors JSONB DEFAULT '[]',
  icp_data JSONB DEFAULT '{}',
  positioning_summary TEXT,
  social_links JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACTS (people at companies)
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  linkedin_url TEXT,
  buyer_type TEXT, -- 'champion', 'decision_maker', 'influencer', 'blocker', 'user'
  stakeholder_type TEXT, -- 'economic', 'technical', 'user', 'coach'
  influence_score INTEGER, -- 1-10
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEALS
-- ============================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage TEXT DEFAULT 'discovery', -- 'discovery', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  value_cents BIGINT,
  currency TEXT DEFAULT 'USD',
  timeline JSONB DEFAULT '{}', -- { expected_close, first_contact, last_activity }
  buyer_reasons JSONB DEFAULT '[]',
  desired_outcomes JSONB DEFAULT '[]',
  objections JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  constraints JSONB DEFAULT '[]',
  scope_signals JSONB DEFAULT '[]',
  competitor_context JSONB DEFAULT '{}',
  stakeholder_ids UUID[] DEFAULT '{}', -- References contacts
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INGESTION ITEMS (raw content enters here)
-- ============================================
CREATE TABLE ingestion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Source info
  source_type TEXT NOT NULL, -- 'transcript', 'email', 'slack', 'crm', 'upload', 'scrape'
  source_channel TEXT, -- 'fireflies', 'zoom', 'gong', 'manual', 'gmail', etc.
  source_url TEXT,

  -- Content
  raw_content TEXT,
  content_format TEXT, -- 'text', 'html', 'markdown', 'json'
  file_path TEXT, -- Supabase storage path if applicable

  -- Transcript-specific fields
  transcript_metadata JSONB DEFAULT '{}', -- { duration_seconds, participant_count, call_date }
  participants JSONB DEFAULT '[]', -- [{ name, role, email }]

  -- Processing state
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSIGHTS (extracted intelligence)
-- ============================================
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Type classification
  insight_type TEXT NOT NULL,
  -- General: 'problem', 'promise', 'constraint', 'outcome', 'objection', 'risk',
  --          'scope_marker', 'timeline_cue', 'decision_criteria', 'buying_signal'
  -- Call-specific: 'call_score', 'moment', 'coaching_note', 'follow_up'

  insight_category TEXT, -- 'sales', 'delivery', 'scope', 'general'

  -- Content
  title TEXT,
  summary TEXT,
  detail JSONB DEFAULT '{}', -- Flexible structure per insight_type

  -- Evidence
  source_quote TEXT, -- Direct quote from source
  source_timestamp TEXT, -- For transcripts: "12:34" or character position
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00

  -- Classification
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  urgency TEXT, -- 'low', 'medium', 'high', 'critical'
  tags JSONB DEFAULT '[]',

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALL SCORES (Call Lab specific - extends insights)
-- ============================================
CREATE TABLE call_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- The rep

  -- Version tracking
  version TEXT DEFAULT 'lite', -- 'lite', 'full'

  -- Overall scores
  overall_score NUMERIC(4,2), -- 0-10 or 0-100
  overall_grade TEXT, -- 'A', 'B', 'C', 'D', 'F' or similar

  -- Lite scoring (1-5 scale)
  lite_scores JSONB DEFAULT '{}',
  -- {
  --   control_confidence: 4,
  --   discovery_depth: 3,
  --   relevance_narrative: 5,
  --   objection_handling: 3,
  --   next_steps_clarity: 4
  -- }

  -- Full scoring (1-10 scale, three layers)
  full_scores JSONB DEFAULT '{}',
  -- {
  --   core: { control_authority: 8, discovery_depth: 7, ... },
  --   fyfs: { gap_clarity: 9, storytelling: 8, ... },
  --   eq: { tone: 8, presence: 7, rapport: 9 }
  -- }

  -- Framework scores
  framework_scores JSONB DEFAULT '{}',
  -- {
  --   challenger: 8.5,
  --   gap_selling: 9,
  --   spin: 8,
  --   bant: { budget: 'partial', authority: 'confirmed', need: 'strong', timeline: 'unclear' }
  -- }

  -- Metrics
  talk_listen_ratio JSONB DEFAULT '{}', -- { rep: 35, prospect: 65 }
  engagement_level TEXT, -- 'low', 'medium', 'high'
  likelihood_to_advance NUMERIC(3,2), -- 0-1

  -- Summary
  diagnosis_summary TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALL SNIPPETS (moments from transcripts)
-- ============================================
CREATE TABLE call_snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_score_id UUID REFERENCES call_scores(id) ON DELETE CASCADE,
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE CASCADE,

  -- Classification
  snippet_type TEXT NOT NULL,
  -- 'strength', 'weakness', 'best_moment', 'missed_moment',
  -- 'red_flag', 'coachable_moment', 'high_impact_phrase', 'detrimental_phrase'

  -- Content
  transcript_quote TEXT NOT NULL,
  speaker TEXT, -- 'rep', 'prospect', 'unknown'
  timestamp_start TEXT, -- "12:34" or character position
  timestamp_end TEXT,

  -- Analysis
  rep_behavior TEXT, -- What the rep did
  coaching_note TEXT, -- What to do differently
  alternative_response TEXT, -- Better way to respond

  -- Scoring contribution
  category_affected TEXT, -- Which score category this impacts
  impact TEXT, -- 'positive', 'negative'

  display_order INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOLLOW UP TEMPLATES (generated follow-ups)
-- ============================================
CREATE TABLE follow_up_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_score_id UUID REFERENCES call_scores(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  -- Type
  template_type TEXT NOT NULL,
  -- 'commitment', 'value_add', 'challenger', 'consultative', 'soft_ask'

  -- Content
  subject_line TEXT,
  body TEXT NOT NULL,

  -- Tasks
  task_checklist JSONB DEFAULT '[]', -- [{ task: "Send case study", done: false }]
  promises_referenced JSONB DEFAULT '[]', -- Promises from the call to fulfill

  display_order INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REP TRENDS (longitudinal tracking)
-- ============================================
CREATE TABLE rep_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT DEFAULT 'weekly', -- 'weekly', 'monthly', 'quarterly'

  -- Aggregate scores
  avg_overall_score NUMERIC(4,2),
  call_count INTEGER,

  -- Category trends
  score_trends JSONB DEFAULT '{}', -- { control: [7,8,8,9], discovery: [6,6,7,7] }

  -- Patterns
  behavioral_patterns JSONB DEFAULT '[]',
  stage_weaknesses JSONB DEFAULT '{}', -- { discovery: ['budget qualification'], demo: ['objection handling'] }
  improvement_themes JSONB DEFAULT '[]',

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, period_start, period_end, period_type)
);

-- ============================================
-- TOOL RUNS (every tool execution logged here)
-- ============================================
CREATE TABLE tool_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- For lead magnet users without accounts
  lead_email TEXT,
  lead_name TEXT,

  -- Tool info
  tool_name TEXT NOT NULL, -- 'call_lab_lite', 'call_lab_full', 'discovery_lab', etc.
  tool_version TEXT DEFAULT '1.0',

  -- Execution
  status TEXT DEFAULT 'started', -- 'started', 'processing', 'completed', 'failed', 'emailed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Input/Output references
  input_data JSONB DEFAULT '{}', -- Sanitized input summary
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE SET NULL,

  -- Results references (polymorphic based on tool)
  result_ids JSONB DEFAULT '{}', -- { call_score_id: "uuid", insight_ids: ["uuid", "uuid"] }

  -- Error handling
  error_message TEXT,
  error_stack TEXT,

  -- Model tracking
  model_used TEXT, -- 'claude-3-5-sonnet', 'gpt-4o', etc.
  tokens_used JSONB DEFAULT '{}', -- { input: 1234, output: 567 }

  -- Delivery
  email_sent_at TIMESTAMPTZ,
  pdf_generated_at TIMESTAMPTZ,
  pdf_path TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ARTIFACTS (generated documents, exports)
-- ============================================
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_run_id UUID REFERENCES tool_runs(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  artifact_type TEXT NOT NULL, -- 'call_report', 'proposal', 'case_study', 'pdf_export', etc.
  title TEXT,
  content JSONB DEFAULT '{}', -- Structured content
  content_html TEXT, -- Rendered HTML if applicable

  file_path TEXT, -- Supabase storage path
  file_format TEXT, -- 'pdf', 'docx', 'html', 'json'

  version INTEGER DEFAULT 1,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_agencies_url ON agencies(url);
CREATE INDEX idx_companies_url ON companies(url);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE INDEX idx_deals_agency ON deals(agency_id);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_stage ON deals(stage);

CREATE INDEX idx_ingestion_agency ON ingestion_items(agency_id);
CREATE INDEX idx_ingestion_deal ON ingestion_items(deal_id);
CREATE INDEX idx_ingestion_status ON ingestion_items(status);
CREATE INDEX idx_ingestion_source ON ingestion_items(source_type);

CREATE INDEX idx_insights_ingestion ON insights(ingestion_item_id);
CREATE INDEX idx_insights_deal ON insights(deal_id);
CREATE INDEX idx_insights_type ON insights(insight_type);

CREATE INDEX idx_call_scores_ingestion ON call_scores(ingestion_item_id);
CREATE INDEX idx_call_scores_user ON call_scores(user_id);
CREATE INDEX idx_call_scores_agency ON call_scores(agency_id);

CREATE INDEX idx_snippets_score ON call_snippets(call_score_id);
CREATE INDEX idx_snippets_type ON call_snippets(snippet_type);

CREATE INDEX idx_tool_runs_user ON tool_runs(user_id);
CREATE INDEX idx_tool_runs_tool ON tool_runs(tool_name);
CREATE INDEX idx_tool_runs_status ON tool_runs(status);
CREATE INDEX idx_tool_runs_created ON tool_runs(created_at DESC);

CREATE INDEX idx_rep_trends_user ON rep_trends(user_id);
CREATE INDEX idx_rep_trends_period ON rep_trends(period_start, period_end);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agency_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Basic policies (expand as needed)
-- Users can read their own data
CREATE POLICY "Users read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read agencies they belong to
CREATE POLICY "Users read own agencies" ON agencies
  FOR SELECT USING (
    id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Users can read data for their agencies
CREATE POLICY "Users read agency data" ON ingestion_items
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users read agency call scores" ON call_scores
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users read agency tool runs" ON tool_runs
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass (for API operations)
-- These will be handled via service role key in the backend
