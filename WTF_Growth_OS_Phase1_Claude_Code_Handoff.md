# WTF Growth OS — Phase 1 + Call Lab
## Claude Code Implementation Handoff

**Version:** 1.0  
**Date:** November 24, 2025  
**Owner:** Tim Kilroy

---

## 1. What We're Building

**Phase 1 Scope:**
- Core OS data spine (identity, companies, deals, ingestion, insights)
- Call Lab Lite (lead magnet)
- Call Lab Pro (paid module)
- Basic API routes for ingestion and extraction
- Monorepo foundation

**Note on Naming:** All tools follow the Lite/Pro convention (not Lite/Full)

**The 5-Door Model:**
This schema supports the complete 5-door lead magnet strategy:
1. **WTF Agency Assessment** (universal front door → routes to SalesOS or DemandOS)
2. **Call Lab Lite** (SalesOS primary entry)
3. **Discovery Lab Lite** (SalesOS secondary entry)
4. **Angle Lab Lite** (DemandOS primary entry)
5. **Visibility Engine Lite** (DemandOS secondary entry)

Phase 1 focuses on Call Lab, but the schema includes `visibility_analyses` table to support future Visibility Engine builds without migrations.

**NOT in Phase 1:**
- Projects, Proof Items, Performance Metrics (Phase 2)
- Other Labs: Discovery Lab, Angle Lab, Visibility Engine (Phase 2+)
- Content Lab (tool inside DemandOS Pro, not a front door)
- Builders (Proposal, Case Study)
- Archetypes system
- CRM integrations

**Schema Future-Proofing:** The `visibility_analyses` table is included in Phase 1 schema even though Visibility Engine build is Phase 2+. This avoids future migrations.

---

## 2. Tech Stack

```
Framework:      Next.js 14+ (App Router)
Language:       TypeScript (strict mode)
Database:       Supabase (PostgreSQL + Auth + Storage)
UI:             ShadCN UI + Tailwind CSS
Email:          Resend
AI:             Model-agnostic (config-driven)
PDF:            @react-pdf/renderer or similar
```

---

## 3. Monorepo Structure

```
wtf-growth-os/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── (auth)/         # Auth routes
│       │   ├── (dashboard)/    # Protected dashboard
│       │   ├── (tools)/        # Tool interfaces
│       │   │   └── call-lab/
│       │   └── api/
│       │       ├── ingest/
│       │       │   ├── upload/route.ts
│       │       │   ├── transcript/route.ts
│       │       │   └── email/route.ts
│       │       ├── extract/route.ts
│       │       ├── analyze/
│       │       │   └── call/route.ts
│       │       └── webhooks/
│       ├── components/
│       └── lib/
├── packages/
│   ├── db/                     # Supabase client, types, queries
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── queries/
│   ├── prompts/                # All AI prompts
│   │   ├── call-lab/
│   │   │   ├── lite.ts
│   │   │   ├── full.ts
│   │   │   └── shared.ts
│   │   └── index.ts
│   ├── ui/                     # Shared components
│   │   └── components/
│   ├── utils/                  # Shared utilities
│   │   ├── ai.ts               # Model abstraction
│   │   ├── scoring.ts
│   │   └── transcript.ts
│   └── pdf/                    # PDF generation
├── turbo.json
├── package.json
└── .env.example
```

---

## 4. Database Schema (Supabase PostgreSQL)

### 4.1 Core Identity Tables

```sql
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
  subscription_tier TEXT DEFAULT 'lead', -- 'lead', 'free', 'subscriber', 'client'
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
```

### 4.2 Ingestion & Intelligence Tables

```sql
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
  version TEXT DEFAULT 'lite', -- 'lite', 'pro'
  
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
  
  -- Pro scoring (1-10 scale, three layers)
  pro_scores JSONB DEFAULT '{}',
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
-- VISIBILITY ANALYSES (for Visibility Engine)
-- ============================================
CREATE TABLE visibility_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  tool_run_id UUID REFERENCES tool_runs(id) ON DELETE SET NULL,
  
  -- Analyzed entity
  entity_type TEXT NOT NULL, -- 'agency', 'founder', 'competitor'
  entity_url TEXT,
  entity_name TEXT,
  
  -- Visibility metrics
  search_presence JSONB DEFAULT '{}', 
  -- { branded_score: 8, category_score: 6, thought_leadership_score: 7 }
  
  content_footprint JSONB DEFAULT '{}', 
  -- { volume: 45, frequency: 'weekly', platforms: ['linkedin', 'blog'], formats: ['article', 'video'] }
  
  pov_strength JSONB DEFAULT '{}', 
  -- { clarity: 7, consistency: 6, differentiation: 8 }
  
  reach_indicators JSONB DEFAULT '{}', 
  -- { estimated_reach: 50000, engagement_signals: ['comments', 'shares'], authority_markers: ['speaking', 'press'] }
  
  content_themes JSONB DEFAULT '[]',
  -- ['AI automation', 'Agency growth', 'Positioning']
  
  distribution_channels JSONB DEFAULT '{}',
  -- { owned: ['blog', 'newsletter'], earned: ['podcasts'], paid: ['linkedin_ads'] }
  
  -- Scores
  overall_visibility_score NUMERIC(4,2), -- 0-100
  visibility_grade TEXT, -- 'A', 'B', 'C', 'D', 'F'
  
  -- Analysis
  strengths JSONB DEFAULT '[]',
  gaps JSONB DEFAULT '[]',
  quick_wins JSONB DEFAULT '[]',
  strategic_recommendations JSONB DEFAULT '[]',
  
  -- Competitive context
  competitive_analysis JSONB DEFAULT '{}',
  -- { direct_competitors: [...], share_of_voice: 0.15 }
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Tool Execution Tables

```sql
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
  tool_name TEXT NOT NULL, -- 'call_lab_lite', 'call_lab_pro', 'visibility_engine_lite', 'angle_lab_lite', etc.
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
```

### 4.4 Indexes

```sql
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

CREATE INDEX idx_visibility_agency ON visibility_analyses(agency_id);
CREATE INDEX idx_visibility_entity ON visibility_analyses(entity_type, entity_url);
CREATE INDEX idx_visibility_score ON visibility_analyses(overall_visibility_score DESC);
```

### 4.5 Row Level Security (RLS)

```sql
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
ALTER TABLE visibility_analyses ENABLE ROW LEVEL SECURITY;
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

-- Similar patterns for other tables...
-- (Expand these based on your auth requirements)
```

---

## 5. API Routes

### 5.1 Ingestion Routes

```typescript
// POST /api/ingest/transcript
// Accepts: multipart/form-data (audio) or application/json (text transcript)
{
  // For lead magnet users
  email: string;
  first_name: string;
  last_name?: string;
  
  // Agency context (if logged in)
  agency_id?: string;
  deal_id?: string;
  
  // Transcript data
  transcript: string; // Required if not uploading audio
  audio_file?: File; // If uploading audio for Whisper
  
  // Call metadata
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: 'discovery' | 'demo' | 'closing' | 'follow_up';
  deal_size_tier?: 'small' | 'medium' | 'large' | 'enterprise';
  services_discussed?: string;
}

// Response
{
  success: boolean;
  ingestion_item_id: string;
  tool_run_id: string;
  status: 'processing' | 'completed';
  message: string;
}
```

```typescript
// POST /api/ingest/upload
// Accepts: multipart/form-data
{
  file: File;
  source_type: 'email' | 'slack' | 'crm' | 'document' | 'pdf';
  agency_id?: string;
  deal_id?: string;
  metadata?: object;
}
```

### 5.2 Analysis Routes

```typescript
// POST /api/analyze/call
{
  ingestion_item_id: string;
  version: 'lite' | 'pro';
  
  // Additional context for pro version
  rep_name?: string;
  known_objections?: string[];
  icp_context?: string;
}

// Response
{
  success: boolean;
  tool_run_id: string;
  call_score_id: string;
  
  // Inline results for immediate display
  result: {
    overall_score: number;
    overall_grade: string;
    diagnosis_summary: string;
    scores: object;
    strengths: Snippet[];
    weaknesses: Snippet[];
    follow_ups: FollowUpTemplate[];
  }
}
```

### 5.3 Extract Route

```typescript
// POST /api/extract
// Generic extraction endpoint
{
  ingestion_item_id: string;
  extract_types: ('problems' | 'promises' | 'objections' | 'scope_markers' | 'all')[];
}

// Response
{
  success: boolean;
  insights: Insight[];
}
```

---

## 6. Call Lab Prompts

### 6.1 Shared Prompt Components

```typescript
// packages/prompts/call-lab/shared.ts

export const TRANSCRIPT_VALIDATION = `
🎬 Transcript Access Check
- Quote the first 2–3 lines of the transcript.
- Identify participants (rep + prospects) by name.
- If you can't read the transcript, respond: "I can't read this transcript. Please provide the full text."
- No guesses, no fabrication. Transcript or it didn't happen.
`;

export const EVIDENCE_RULES = `
🛠️ Rules of Analysis
- Every score, strength, and critique MUST include a direct transcript quote.
- If something wasn't covered, mark as: Discussed / Partially discussed / Not discussed in this call.
- Strengths and Improvements must use a 3-column structure:
  | Transcript Quote | Rep Behavior | Coaching Note |
- Start with strengths before critique.
- If the rep said the right thing, mark as ✅ strength. Only flag as wrong if the transcript shows it landed badly.
- Tone: conversational, challenger, direct.
`;

export const SCORING_RUBRIC = `
🎯 Scoring Rubric
1–3 = Weak (missed it)
4–6 = Surface-level
7–10 = Strong (consultative, transcript-backed)

For Lite (1-5 scale):
1 = Missing entirely
2 = Weak attempt
3 = Adequate
4 = Strong
5 = Exceptional
`;

export const FRAMEWORKS = `
📚 Frameworks
- SPIN → Situation / Problem / Implication / Need-Payoff
- Challenger → Teach / Tailor / Take Control
- Gap Selling → Current / Future / Gap
- BANT → Budget / Authority / Need / Timeline
`;

export const GUARDRAILS = `
🚫 vs ✅ Guardrails

1. Salutation / Recipient
❌ Addressing report to the prospect
✅ Addressing report to the rep (the requester)

2. Humor / Tone
❌ Marking all humor as inappropriate
✅ Evaluate by reaction: If prospect laughed/relaxed → ✅ strength. If discomfort → ⚠️ risk.

3. Solutioning Too Early
❌ Praising premature pitching
✅ If solution was given before problem quantified → mark as "too soon"

4. Transcript Anchoring
❌ Claims without evidence: "You clearly discussed budget."
✅ Always quote with evidence

5. Follow-Up Urgency
❌ Suggesting passive next steps: "Send a resource link."
✅ Tie urgency to transcript evidence

6. Pain Framing
❌ Oversimplifying: "Price is their only problem."
✅ Nuanced analysis connecting symptoms to root causes
`;
```

### 6.2 Call Lab Lite Prompt

```typescript
// packages/prompts/call-lab/lite.ts

import { 
  TRANSCRIPT_VALIDATION, 
  EVIDENCE_RULES, 
  SCORING_RUBRIC,
  GUARDRAILS 
} from './shared';

export const CALL_LAB_LITE_SYSTEM = `
You are Call Lab Lite, a fast sales call diagnostic that gives founders an immediate read on their call quality.

Your voice: Sharp, consultative, a little irreverent. You focus on what happened and what to do next.

${TRANSCRIPT_VALIDATION}

${EVIDENCE_RULES}

${SCORING_RUBRIC}

${GUARDRAILS}
`;

export const CALL_LAB_LITE_USER = (params: {
  transcript: string;
  rep_name: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
}) => `
Analyze this sales call transcript and provide a Lite diagnostic.

Rep Name: ${params.rep_name}
Prospect Company: ${params.prospect_company || 'Not provided'}
Prospect Role: ${params.prospect_role || 'Not provided'}
Call Stage: ${params.call_stage || 'Not provided'}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "validation": {
    "opening_lines": "First 2-3 lines quoted",
    "participants": ["Rep Name", "Prospect Name"],
    "valid": true
  },
  "overall": {
    "score": 3.8,
    "grade": "B",
    "one_liner": "Strong discovery but weak close commitment"
  },
  "scores": {
    "control_confidence": { "score": 4, "reason": "One sentence with quote" },
    "discovery_depth": { "score": 3, "reason": "One sentence with quote" },
    "relevance_narrative": { "score": 4, "reason": "One sentence with quote" },
    "objection_handling": { "score": 3, "reason": "One sentence with quote" },
    "next_steps_clarity": { "score": 4, "reason": "One sentence with quote" }
  },
  "strengths": [
    {
      "quote": "Exact transcript quote",
      "behavior": "What the rep did well",
      "note": "Why this matters"
    }
  ],
  "weaknesses": [
    {
      "quote": "Exact transcript quote",
      "behavior": "What went wrong",
      "note": "What to do instead"
    }
  ],
  "focus_area": {
    "theme": "The one thing to work on",
    "why": "Brief explanation",
    "drill": "Specific practice suggestion"
  },
  "follow_ups": [
    {
      "type": "direct_close",
      "subject": "Email subject line",
      "body": "Full email body"
    },
    {
      "type": "value_add",
      "subject": "Email subject line", 
      "body": "Full email body"
    }
  ],
  "tasks": [
    "Specific task 1",
    "Specific task 2"
  ]
}

Important:
- All quotes MUST be verbatim from the transcript
- Scores are 1-5 scale
- Exactly 3 strengths and 3 weaknesses
- Follow-up emails should reference specific moments from the call
`;
```

### 6.3 Call Lab Pro Prompt

```typescript
// packages/prompts/call-lab/pro.ts

import { 
  TRANSCRIPT_VALIDATION, 
  EVIDENCE_RULES, 
  SCORING_RUBRIC,
  FRAMEWORKS,
  GUARDRAILS 
} from './shared';

export const CALL_LAB_PRO_SYSTEM = `
You are SalesOS Call Lab, the complete call grading and coaching system.

Your voice: Sharp, consultative, irreverent. Tim Kilroy's voice—focused on what happened in the moment and what to do next time.

${TRANSCRIPT_VALIDATION}

${EVIDENCE_RULES}

${SCORING_RUBRIC}

${FRAMEWORKS}

${GUARDRAILS}

You evaluate calls across three layers:
1. Core Call Scoring (10 categories, 1-10 scale)
2. FYFS Alignment Scoring (6 categories)
3. Emotional Intelligence Layer (4 categories)

You also score against Challenger, Gap Selling, SPIN, and BANT frameworks.
`;

export const CALL_LAB_PRO_USER = (params: {
  transcript: string;
  rep_name: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
  deal_tier?: string;
  known_objections?: string[];
  icp_context?: string;
}) => `
Analyze this sales call transcript with full diagnostic depth.

Rep Name: ${params.rep_name}
Prospect Company: ${params.prospect_company || 'Not provided'}
Prospect Role: ${params.prospect_role || 'Not provided'}
Call Stage: ${params.call_stage || 'Not provided'}
Deal Tier: ${params.deal_tier || 'Not provided'}
Known Objections: ${params.known_objections?.join(', ') || 'None provided'}
ICP Context: ${params.icp_context || 'Not provided'}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "validation": {
    "opening_lines": "First 2-3 lines quoted",
    "participants": [{"name": "Name", "role": "rep|prospect"}],
    "valid": true
  },
  
  "summary": {
    "diagnosis": "One paragraph high-level diagnosis",
    "prospect_fit_score": 8,
    "call_quality_grade": "A-",
    "likelihood_to_advance": 0.75,
    "killer_highlight": { "quote": "...", "why": "..." },
    "biggest_miss": { "quote": "...", "why": "..." }
  },
  
  "scores": {
    "overall": 8.2,
    "core": {
      "control_authority": { "score": 8, "evidence": "quote", "note": "..." },
      "discovery_depth": { "score": 7, "evidence": "quote", "note": "..." },
      "narrative_framing": { "score": 8, "evidence": "quote", "note": "..." },
      "relevance_resonance": { "score": 9, "evidence": "quote", "note": "..." },
      "solution_fit": { "score": 7, "evidence": "quote", "note": "..." },
      "objection_navigation": { "score": 6, "evidence": "quote", "note": "..." },
      "value_creation": { "score": 8, "evidence": "quote", "note": "..." },
      "proof_story_use": { "score": 7, "evidence": "quote", "note": "..." },
      "risk_reduction": { "score": 6, "evidence": "quote", "note": "..." },
      "next_step_clarity": { "score": 8, "evidence": "quote", "note": "..." }
    },
    "fyfs": {
      "gap_clarity": { "score": 9, "evidence": "quote", "note": "..." },
      "storytelling": { "score": 8, "evidence": "quote", "note": "..." },
      "guide_not_respond": { "score": 7, "evidence": "quote", "note": "..." },
      "category_framing": { "score": 6, "evidence": "quote", "note": "..." },
      "high_signal_questions": { "score": 8, "evidence": "quote", "note": "..." },
      "client_leadership": { "score": 8, "evidence": "quote", "note": "..." }
    },
    "eq": {
      "tone_warmth_pacing": { "score": 8, "evidence": "quote", "note": "..." },
      "presence": { "score": 7, "evidence": "quote", "note": "..." },
      "listening_quality": { "score": 9, "evidence": "quote", "note": "..." },
      "rapport": { "score": 9, "evidence": "quote", "note": "..." }
    }
  },
  
  "frameworks": {
    "challenger": {
      "score": 8.5,
      "teach": { "status": "strong", "evidence": "quote" },
      "tailor": { "status": "strong", "evidence": "quote" },
      "take_control": { "status": "moderate", "evidence": "quote" }
    },
    "gap_selling": {
      "score": 9,
      "current_state": { "status": "discussed", "evidence": "quote" },
      "future_state": { "status": "discussed", "evidence": "quote" },
      "gap": { "status": "discussed", "evidence": "quote" }
    },
    "spin": {
      "score": 8,
      "situation": { "status": "discussed", "evidence": "quote" },
      "problem": { "status": "discussed", "evidence": "quote" },
      "implication": { "status": "partial", "evidence": "quote" },
      "need_payoff": { "status": "not_discussed", "evidence": null }
    },
    "bant": {
      "score": 7.5,
      "budget": { "status": "partial", "evidence": "quote" },
      "authority": { "status": "confirmed", "evidence": "quote" },
      "need": { "status": "strong", "evidence": "quote" },
      "timeline": { "status": "unclear", "evidence": "quote" }
    }
  },
  
  "metrics": {
    "talk_listen_ratio": { "rep": 35, "prospect": 65 },
    "engagement_level": "high",
    "objections_surfaced": ["objection 1", "objection 2"],
    "decision_process_clarity": "moderate"
  },
  
  "moments": {
    "best": [
      { "quote": "...", "timestamp": "12:34", "why": "..." }
    ],
    "missed": [
      { "quote": "...", "timestamp": "15:20", "opportunity": "..." }
    ],
    "red_flags": [
      { "quote": "...", "timestamp": "20:15", "risk": "..." }
    ],
    "coachable": [
      { "quote": "...", "timestamp": "25:00", "lesson": "...", "drill": "..." }
    ]
  },
  
  "phrases": {
    "high_impact": ["Verbatim quote 1", "Verbatim quote 2"],
    "detrimental": ["Verbatim quote 1"],
    "alternatives": [
      {
        "prospect_said": "quote",
        "rep_said": "quote",
        "better_response": "suggested response"
      }
    ]
  },
  
  "improvement": {
    "theme": "Primary improvement theme",
    "drills": ["Drill 1", "Drill 2"],
    "role_plays": ["Scenario 1", "Scenario 2"],
    "next_call_focus": "Specific thing to do differently"
  },
  
  "follow_ups": [
    {
      "type": "commitment",
      "subject": "...",
      "body": "..."
    },
    {
      "type": "value_reinforcement", 
      "subject": "...",
      "body": "..."
    },
    {
      "type": "soft_ask_authority",
      "subject": "...",
      "body": "..."
    }
  ],
  
  "tasks": [
    { "task": "...", "tied_to": "promise from call" }
  ]
}

Important:
- ALL evidence fields MUST contain verbatim transcript quotes
- Status options: "discussed", "partial", "not_discussed", "strong", "moderate", "weak"
- Timestamps should be approximate if not available
- Follow-up emails must reference specific call moments
`;
```

---

## 7. Model Abstraction Layer

```typescript
// packages/utils/ai.ts

export type ModelProvider = 'anthropic' | 'openai';
export type ModelId = 
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'gpt-4o'
  | 'gpt-4o-mini';

interface ModelConfig {
  provider: ModelProvider;
  model: ModelId;
  maxTokens: number;
  temperature: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'call-lab-lite': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.3
  },
  'call-lab-pro': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    temperature: 0.3
  },
  'visibility-engine-lite': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.3
  },
  // Add more tool configs as you build them...
};

export async function runModel(
  toolName: string,
  systemPrompt: string,
  userPrompt: string,
  options?: Partial<ModelConfig>
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const config = { ...MODEL_CONFIGS[toolName], ...options };
  
  if (config.provider === 'anthropic') {
    return runAnthropic(config, systemPrompt, userPrompt);
  } else {
    return runOpenAI(config, systemPrompt, userPrompt);
  }
}

async function runAnthropic(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  
  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: { input: data.usage.input_tokens, output: data.usage.output_tokens }
  };
}

// Similar for OpenAI...
```

---

## 8. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALL LAB FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User submits transcript
        │
        ▼
┌───────────────────┐
│  /api/ingest/     │
│    transcript     │
└───────────────────┘
        │
        ├──► Create/find user (by email)
        ├──► Create/find agency (by URL)
        ├──► Create ingestion_item (raw transcript)
        ├──► Create tool_run (status: processing)
        │
        ▼
┌───────────────────┐
│  /api/analyze/    │
│      call         │
└───────────────────┘
        │
        ├──► Load ingestion_item
        ├──► Run model with prompts
        ├──► Parse JSON response
        │
        ▼
┌───────────────────┐
│   Store Results   │
└───────────────────┘
        │
        ├──► Insert call_scores
        ├──► Insert call_snippets (strengths, weaknesses, moments)
        ├──► Insert follow_up_templates
        ├──► Insert insights (extracted intelligence)
        ├──► Update tool_run (status: completed)
        │
        ▼
┌───────────────────┐
│  Return + Email   │
└───────────────────┘
        │
        ├──► Return JSON to frontend
        ├──► Generate PDF (optional)
        ├──► Send email via Resend
        └──► Update tool_run (email_sent_at)
```

---

## 9. Implementation Order

### Week 1: Foundation
1. Set up monorepo with Turborepo
2. Initialize Supabase project
3. Run schema migrations (identity tables first)
4. Set up auth flow (magic link)
5. Create basic UI shell with ShadCN

### Week 2: Ingestion
1. Build `/api/ingest/transcript` route
2. Create ingestion_items storage logic
3. Build transcript paste UI
4. Add Whisper integration for audio (optional, can defer)

### Week 3: Call Lab Lite
1. Port prompts to `packages/prompts`
2. Build model abstraction layer
3. Build `/api/analyze/call` route (lite version)
4. Create call_scores, call_snippets storage
5. Build results display UI

### Week 4: Polish + Email
1. Build PDF generation
2. Set up Resend integration
3. Build email templates
4. Add tool_runs tracking
5. Build basic dashboard (run history)

### Week 5: Call Lab Pro (if continuing)
1. Extend prompts for pro version
2. Add framework scoring
3. Add moment mapping
4. Build longitudinal tracking (rep_trends)

---

## 10. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=calllab@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 11. Acceptance Criteria

### Must Have (Phase 1)
- [ ] User can paste transcript without login
- [ ] User provides email to receive results
- [ ] Call Lab Lite returns scores in <30 seconds
- [ ] Results display immediately in UI
- [ ] Results emailed to user
- [ ] All runs logged to tool_runs
- [ ] Transcript and scores persisted to database

### Should Have
- [ ] PDF export of results
- [ ] User can create account to see history
- [ ] Agency profile can be updated
- [ ] Deal can be linked to call

### Nice to Have (Phase 1)
- [ ] Audio upload with Whisper transcription
- [ ] Call Lab Pro version
- [ ] Rep trend tracking

---

## 12. Known Constraints

1. **Transcript length**: Claude handles ~100k tokens. A 90-minute call transcript is typically 15-25k tokens. Should be fine, but add chunking logic for safety.

2. **Messy transcripts**: Fireflies, Zoom, etc. have different formats. Build a normalizer.

3. **JSON parsing**: LLMs sometimes break JSON. Always wrap in try/catch with retry logic.

4. **Rate limits**: Anthropic has rate limits. Add queue/retry logic for high volume.

5. **Costs**: Full analysis runs ~$0.10-0.30 per call. Track in tool_runs.

---

## 13. Files to Create First

```
1. packages/db/schema.sql          ← This entire schema
2. packages/db/client.ts           ← Supabase client setup
3. packages/db/types.ts            ← TypeScript types from schema
4. packages/prompts/call-lab/*     ← All prompts from Section 6
5. packages/utils/ai.ts            ← Model abstraction
6. apps/web/app/api/ingest/transcript/route.ts
7. apps/web/app/api/analyze/call/route.ts
8. apps/web/app/(tools)/call-lab/page.tsx
```

---

**End of Handoff Document**
