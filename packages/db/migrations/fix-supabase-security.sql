-- ============================================
-- Supabase Security & Performance Fixes
-- Run this migration in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Recreate with SECURITY INVOKER to use caller's permissions
-- ============================================

DROP VIEW IF EXISTS public.instant_scenario_stats;
DROP VIEW IF EXISTS public.instant_report_stats;

-- Recreate instant_report_stats with SECURITY INVOKER
CREATE OR REPLACE VIEW public.instant_report_stats
WITH (security_invoker = true)
AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(DISTINCT email) as unique_leads,
  AVG(score) as avg_score,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as emails_captured,
  ROUND(COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2) as capture_rate
FROM instant_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Recreate instant_scenario_stats with SECURITY INVOKER
CREATE OR REPLACE VIEW public.instant_scenario_stats
WITH (security_invoker = true)
AS
SELECT
  scenario_type,
  COUNT(*) as total,
  AVG(score) as avg_score,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as emails_captured
FROM instant_reports
WHERE scenario_type IS NOT NULL
GROUP BY scenario_type
ORDER BY total DESC;

-- ============================================
-- 2. ENABLE RLS ON TABLES MISSING IT
-- ============================================

-- team_members (service role only - schema may vary)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access team_members" ON public.team_members;
CREATE POLICY "Service role full access team_members" ON public.team_members
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- call_followups
ALTER TABLE public.call_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own call followups" ON public.call_followups;
DROP POLICY IF EXISTS "Service role full access" ON public.call_followups;
CREATE POLICY "Users read own call followups" ON public.call_followups
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access" ON public.call_followups
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- call_lab_reports
ALTER TABLE public.call_lab_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own call lab reports" ON public.call_lab_reports;
DROP POLICY IF EXISTS "Service role full access" ON public.call_lab_reports;
CREATE POLICY "Users read own call lab reports" ON public.call_lab_reports
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access" ON public.call_lab_reports
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- conversation_patterns (service role only - table schema unknown)
ALTER TABLE public.conversation_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own conversation patterns" ON public.conversation_patterns;
DROP POLICY IF EXISTS "Service role full access" ON public.conversation_patterns;
DROP POLICY IF EXISTS "Service role full access conversation_patterns" ON public.conversation_patterns;
CREATE POLICY "Service role full access conversation_patterns" ON public.conversation_patterns
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- coaching_reports
ALTER TABLE public.coaching_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own coaching reports" ON public.coaching_reports;
DROP POLICY IF EXISTS "Service role full access" ON public.coaching_reports;
CREATE POLICY "Users read own coaching reports" ON public.coaching_reports
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access" ON public.coaching_reports
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- ============================================
-- 3. FIX FUNCTION SEARCH_PATH
-- ============================================

-- Fix update_pattern_timestamp function
CREATE OR REPLACE FUNCTION public.update_pattern_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix increment_report_views function
CREATE OR REPLACE FUNCTION public.increment_report_views(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discovery_briefs
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = report_id;
END;
$$;

-- ============================================
-- 4. FIX RLS POLICIES FOR PERFORMANCE
-- Replace auth.uid() with (select auth.uid())
-- ============================================

-- users table
DROP POLICY IF EXISTS "Users read own data" ON public.users;
DROP POLICY IF EXISTS "Users read own record" ON public.users;
DROP POLICY IF EXISTS "Users insert own record" ON public.users;
DROP POLICY IF EXISTS "Users update own record" ON public.users;

CREATE POLICY "Users read own record" ON public.users
  FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY "Users insert own record" ON public.users
  FOR INSERT WITH CHECK (id = (select auth.uid()));
CREATE POLICY "Users update own record" ON public.users
  FOR UPDATE USING (id = (select auth.uid()));

-- agencies table
DROP POLICY IF EXISTS "Users read own agencies" ON public.agencies;
CREATE POLICY "Users read own agencies" ON public.agencies
  FOR SELECT USING (
    id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = (select auth.uid())
    )
  );

-- call_scores table
DROP POLICY IF EXISTS "Users read agency call scores" ON public.call_scores;
DROP POLICY IF EXISTS "Users read own call scores" ON public.call_scores;
CREATE POLICY "Users read call scores" ON public.call_scores
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = (select auth.uid())
    )
  );

-- tool_runs table
DROP POLICY IF EXISTS "Users read agency tool runs" ON public.tool_runs;
DROP POLICY IF EXISTS "Users read own tool runs" ON public.tool_runs;
CREATE POLICY "Users read tool runs" ON public.tool_runs
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = (select auth.uid())
    )
  );

-- ingestion_items table
DROP POLICY IF EXISTS "Users read agency data" ON public.ingestion_items;
DROP POLICY IF EXISTS "Users read own ingestion items" ON public.ingestion_items;
CREATE POLICY "Users read ingestion items" ON public.ingestion_items
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR agency_id IN (
      SELECT agency_id FROM user_agency_assignments
      WHERE user_id = (select auth.uid())
    )
  );

-- orgs table
DROP POLICY IF EXISTS "Users read own org" ON public.orgs;
DROP POLICY IF EXISTS "Org owners update org" ON public.orgs;
DROP POLICY IF EXISTS "Authenticated users create orgs" ON public.orgs;

CREATE POLICY "Users read own org" ON public.orgs
  FOR SELECT USING (
    id IN (SELECT org_id FROM users WHERE id = (select auth.uid()))
    OR created_by_user_id = (select auth.uid())
  );
CREATE POLICY "Org owners update org" ON public.orgs
  FOR UPDATE USING (
    id IN (SELECT org_id FROM users WHERE id = (select auth.uid()) AND is_org_owner = true)
  );
CREATE POLICY "Authenticated users create orgs" ON public.orgs
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL
  );

-- invites table
DROP POLICY IF EXISTS "Users read org invites" ON public.invites;
DROP POLICY IF EXISTS "Org owners create invites" ON public.invites;
DROP POLICY IF EXISTS "Read invites by token" ON public.invites;

CREATE POLICY "Users read org invites" ON public.invites
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = (select auth.uid()))
  );
CREATE POLICY "Org owners create invites" ON public.invites
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = (select auth.uid()) AND is_org_owner = true)
  );
-- Keep token-based access without auth check (for accepting invites)
CREATE POLICY "Anyone can read invites by token" ON public.invites
  FOR SELECT USING (true);

-- org_domains table
DROP POLICY IF EXISTS "Users read org domains" ON public.org_domains;
CREATE POLICY "Users read org domains" ON public.org_domains
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = (select auth.uid()))
  );

-- pending_signups table
DROP POLICY IF EXISTS "Service role only" ON public.pending_signups;
CREATE POLICY "Service role only" ON public.pending_signups
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- discovery_briefs table
DROP POLICY IF EXISTS "Service role can do anything" ON public.discovery_briefs;
DROP POLICY IF EXISTS "Users can view their own briefs by email" ON public.discovery_briefs;

CREATE POLICY "Users view own briefs" ON public.discovery_briefs
  FOR SELECT USING (
    lead_email = (select auth.jwt() ->> 'email')
  );
CREATE POLICY "Service role full access" ON public.discovery_briefs
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- subscriptions table
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON public.subscriptions;

CREATE POLICY "Users read own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- call_snippets table
DROP POLICY IF EXISTS "Users read own call snippets" ON public.call_snippets;
CREATE POLICY "Users read own call snippets" ON public.call_snippets
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

-- follow_up_templates table
DROP POLICY IF EXISTS "Users read own follow ups" ON public.follow_up_templates;
CREATE POLICY "Users read own follow ups" ON public.follow_up_templates
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

-- ============================================
-- DONE!
-- Note: Enable "Leaked Password Protection" in
-- Supabase Dashboard > Auth > Settings
-- ============================================
