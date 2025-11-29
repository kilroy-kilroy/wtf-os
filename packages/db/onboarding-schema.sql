-- ============================================
-- WTF Growth OS - Onboarding Schema
-- Orgs, Users updates, and Invites
-- ============================================

-- ============================================
-- ORGS (Companies/Workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS orgs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  primary_domain    text,
  company_size      text,        -- '1', '2-5', '6-10', '11-25', '26-50', '51-100', '100+'
  sales_team_size   text,        -- 'Just me', '2-3', '4-5', '6-10', '10+'
  crm               text,        -- 'None yet', 'HubSpot', 'Salesforce', etc
  logo_url          text,
  personal          boolean DEFAULT false,
  plan_type         text,        -- 'call_lab_pro', 'team', etc
  seat_count        integer DEFAULT 1,
  mode              text DEFAULT 'solo', -- 'solo' or 'team'
  created_by_user_id uuid,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Unique index on primary_domain (only for non-null domains)
CREATE UNIQUE INDEX IF NOT EXISTS orgs_primary_domain_unique
ON orgs (primary_domain)
WHERE primary_domain IS NOT NULL;

-- ============================================
-- ADD ORG REFERENCE TO USERS
-- ============================================
-- Run these ALTER statements if users table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_org_owner boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- ============================================
-- INVITES
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid REFERENCES orgs(id) ON DELETE CASCADE,
  inviter_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  email             text NOT NULL,
  role              text,              -- 'manager', 'rep', etc
  token             text NOT NULL UNIQUE,
  status            text NOT NULL DEFAULT 'pending',
                    -- 'pending', 'accepted', 'expired', 'revoked'
  cross_domain      boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  accepted_at       timestamptz,
  expires_at        timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS invites_email_idx ON invites (email);
CREATE INDEX IF NOT EXISTS invites_org_idx ON invites (org_id);
CREATE INDEX IF NOT EXISTS invites_token_idx ON invites (token);

-- ============================================
-- ORG DOMAINS (for multiple domains per org)
-- ============================================
CREATE TABLE IF NOT EXISTS org_domains (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid REFERENCES orgs(id) ON DELETE CASCADE,
  domain    text NOT NULL,
  verified  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_domains_domain_unique
ON org_domains (domain);

-- ============================================
-- PUBLIC EMAIL DOMAINS (for detection)
-- ============================================
CREATE TABLE IF NOT EXISTS public_email_domains (
  domain text PRIMARY KEY
);

-- Seed common public email providers
INSERT INTO public_email_domains (domain) VALUES
  ('gmail.com'),
  ('googlemail.com'),
  ('yahoo.com'),
  ('yahoo.co.uk'),
  ('hotmail.com'),
  ('hotmail.co.uk'),
  ('outlook.com'),
  ('live.com'),
  ('msn.com'),
  ('icloud.com'),
  ('me.com'),
  ('mac.com'),
  ('aol.com'),
  ('protonmail.com'),
  ('proton.me'),
  ('zoho.com'),
  ('mail.com'),
  ('gmx.com'),
  ('yandex.com'),
  ('fastmail.com')
ON CONFLICT (domain) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_domains ENABLE ROW LEVEL SECURITY;

-- USERS table RLS (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users read own record" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can insert their own record (onboarding)
CREATE POLICY "Users insert own record" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users update own record" ON users
  FOR UPDATE USING (id = auth.uid());

-- Users can read their own org (via users.org_id OR if they created it)
CREATE POLICY "Users read own org" ON orgs
  FOR SELECT USING (
    id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR created_by_user_id = auth.uid()
  );

-- Authenticated users can create orgs (during onboarding)
CREATE POLICY "Authenticated users create orgs" ON orgs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Org owners can update their org
CREATE POLICY "Org owners update org" ON orgs
  FOR UPDATE USING (
    id IN (SELECT org_id FROM users WHERE id = auth.uid() AND is_org_owner = true)
  );

-- Users can read invites for their org
CREATE POLICY "Users read org invites" ON invites
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Org owners/admins can create invites
CREATE POLICY "Org owners create invites" ON invites
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND is_org_owner = true)
  );

-- Anyone can read invites by token (for accepting)
CREATE POLICY "Read invites by token" ON invites
  FOR SELECT USING (true);

-- Users can read org domains for their org
CREATE POLICY "Users read org domains" ON org_domains
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Public email domains readable by all authenticated users
ALTER TABLE public_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read public domains" ON public_email_domains
  FOR SELECT USING (true);
