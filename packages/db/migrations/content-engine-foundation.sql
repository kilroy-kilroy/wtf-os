-- Content Engine Foundation Tables
-- Migration: content-engine-foundation.sql

-- ============================================================================
-- CONTENT ORGANIZATIONS
-- Separate org structure for content engine (may link to agencies later)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_status TEXT DEFAULT 'trial' CHECK (billing_status IN ('trial', 'active', 'past_due', 'cancelled')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_orgs_owner ON content_orgs(owner_id);
CREATE INDEX IF NOT EXISTS idx_content_orgs_slug ON content_orgs(slug);

-- RLS
ALTER TABLE content_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orgs they belong to" ON content_orgs
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM content_org_members
      WHERE content_org_members.org_id = content_orgs.id
      AND content_org_members.user_id = auth.uid()
      AND content_org_members.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Only owners can update their org" ON content_orgs
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create orgs" ON content_orgs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- CONTENT ORG MEMBERS
-- Team membership with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'brand_official', 'creator', 'distributor')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_org_members_org ON content_org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_content_org_members_user ON content_org_members(user_id);

-- RLS
ALTER TABLE content_org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their orgs" ON content_org_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM content_org_members AS m
      WHERE m.org_id = content_org_members.org_id
      AND m.user_id = auth.uid()
      AND m.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Owners and brand officials can manage members" ON content_org_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_org_members AS m
      WHERE m.org_id = content_org_members.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'brand_official')
      AND m.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- CONTENT PROFILES
-- Extended user profiles for content engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  title TEXT,
  department TEXT,
  platforms TEXT[] DEFAULT '{}',
  comfort_level TEXT DEFAULT 'distributor' CHECK (comfort_level IN ('distributor', 'creator')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_profiles_user ON content_profiles(user_id);

-- RLS
ALTER TABLE content_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit their own profile" ON content_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view profiles in their org" ON content_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_org_members AS m1
      JOIN content_org_members AS m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
      AND m2.user_id = content_profiles.user_id
      AND m1.accepted_at IS NOT NULL
      AND m2.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- VOICE PROFILES
-- The core innovation - voice DNA extraction
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  examples TEXT[] DEFAULT '{}',
  description TEXT,
  extracted_dna JSONB,
  is_locked BOOLEAN DEFAULT FALSE,
  calibration_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON voice_profiles(user_id);

-- RLS
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own voice profile" ON voice_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view voice profiles in their org" ON voice_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_org_members AS m1
      JOIN content_org_members AS m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid()
      AND m2.user_id = voice_profiles.user_id
      AND m1.accepted_at IS NOT NULL
      AND m2.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- CONTENT INVITES
-- Team invitation system
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'distributor' CHECK (role IN ('brand_official', 'creator', 'distributor')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_invites_org ON content_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_content_invites_email ON content_invites(email);
CREATE INDEX IF NOT EXISTS idx_content_invites_token ON content_invites(token);

-- RLS
ALTER TABLE content_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invite by token" ON content_invites
  FOR SELECT USING (true);

CREATE POLICY "Org admins can manage invites" ON content_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_org_members
      WHERE content_org_members.org_id = content_invites.org_id
      AND content_org_members.user_id = auth.uid()
      AND content_org_members.role IN ('owner', 'brand_official')
      AND content_org_members.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- CONTENT SOURCES (Repository)
-- The content library
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  title TEXT,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('article', 'call', 'meeting', 'podcast', 'original', 'email')),
  raw_content TEXT NOT NULL,
  synopsis TEXT,
  theme_4e TEXT CHECK (theme_4e IN ('evidence', 'education', 'entertainment', 'envision')),
  vvv_tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('draft', 'team')),
  repurpose_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_sources_org ON content_sources(org_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_author ON content_sources(author_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_theme ON content_sources(theme_4e);
CREATE INDEX IF NOT EXISTS idx_content_sources_created ON content_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_sources_visibility ON content_sources(visibility);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_content_sources_fts ON content_sources
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(raw_content, '') || ' ' || COALESCE(synopsis, '')));

-- RLS
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own content" ON content_sources
  FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Team members can view team content" ON content_sources
  FOR SELECT USING (
    visibility = 'team' AND
    EXISTS (
      SELECT 1 FROM content_org_members
      WHERE content_org_members.org_id = content_sources.org_id
      AND content_org_members.user_id = auth.uid()
      AND content_org_members.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- REPURPOSES
-- Generated content variations
-- ============================================================================

CREATE TABLE IF NOT EXISTS repurposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'email', 'pull_quotes')),
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  voice_profile_id UUID REFERENCES voice_profiles(id),
  tone_adjustments TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'draft' CHECK (visibility IN ('draft', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repurposes_source ON repurposes(source_id);
CREATE INDEX IF NOT EXISTS idx_repurposes_user ON repurposes(user_id);
CREATE INDEX IF NOT EXISTS idx_repurposes_platform ON repurposes(platform);

-- RLS
ALTER TABLE repurposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own repurposes" ON repurposes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view team repurposes" ON repurposes
  FOR SELECT USING (
    visibility = 'team' AND
    EXISTS (
      SELECT 1 FROM content_sources
      JOIN content_org_members ON content_org_members.org_id = content_sources.org_id
      WHERE content_sources.id = repurposes.source_id
      AND content_org_members.user_id = auth.uid()
      AND content_org_members.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- CALL IMPORTS
-- External transcript imports (Fireflies, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_call_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES content_orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT DEFAULT 'fireflies' CHECK (provider IN ('fireflies', 'zoom', 'gong', 'otter', 'fathom', 'google_meet')),
  external_id TEXT NOT NULL,
  external_url TEXT,
  title TEXT,
  participants TEXT[] DEFAULT '{}',
  duration_seconds INTEGER,
  call_date TIMESTAMPTZ,
  call_type TEXT,
  transcript TEXT NOT NULL,
  summary TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_moments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_call_imports_org ON content_call_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_content_call_imports_user ON content_call_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_content_call_imports_status ON content_call_imports(processing_status);

-- RLS
ALTER TABLE content_call_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own call imports" ON content_call_imports
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view org call imports" ON content_call_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_org_members
      WHERE content_org_members.org_id = content_call_imports.org_id
      AND content_org_members.user_id = auth.uid()
      AND content_org_members.accepted_at IS NOT NULL
    )
  );

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_notification_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  new_content_alerts BOOLEAN DEFAULT TRUE,
  call_gold_alerts BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  digest_day TEXT DEFAULT 'monday' CHECK (digest_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE content_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification prefs" ON content_notification_prefs
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique slugs for orgs
CREATE OR REPLACE FUNCTION generate_org_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM content_orgs WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment repurpose count
CREATE OR REPLACE FUNCTION increment_repurpose_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content_sources
  SET repurpose_count = repurpose_count + 1
  WHERE id = NEW.source_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_repurpose_count
  AFTER INSERT ON repurposes
  FOR EACH ROW
  EXECUTE FUNCTION increment_repurpose_count();

-- Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_content_orgs
  BEFORE UPDATE ON content_orgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_content_profiles
  BEFORE UPDATE ON content_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_voice_profiles
  BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_content_sources
  BEFORE UPDATE ON content_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_repurposes
  BEFORE UPDATE ON repurposes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_content_call_imports
  BEFORE UPDATE ON content_call_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_content_notification_prefs
  BEFORE UPDATE ON content_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
