-- ============================================
-- Fix Security Definer Views & Enable RLS
-- Resolves all Supabase database linter errors
-- Created: 2026-02-11
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER so they
-- respect the querying user's RLS policies
-- ============================================

DROP VIEW IF EXISTS public.instant_report_stats;
CREATE VIEW public.instant_report_stats
WITH (security_invoker = true)
AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(DISTINCT email) as unique_leads,
  AVG(score) as avg_score,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as emails_captured,
  ROUND(COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as capture_rate
FROM instant_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.instant_scenario_stats;
CREATE VIEW public.instant_scenario_stats
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
-- 2. ENABLE RLS ON ALL FLAGGED TABLES
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is
-- idempotent and safe to run multiple times
-- ============================================

ALTER TABLE public.client_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_leadership_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_ops_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_competitors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES FOR TABLES ALREADY HANDLED
-- in fix-supabase-security.sql (re-applied
-- idempotently in case migration wasn't run)
-- ============================================

-- team_members: service role only
DROP POLICY IF EXISTS "Service role full access team_members" ON public.team_members;
CREATE POLICY "Service role full access team_members" ON public.team_members
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- call_followups
DROP POLICY IF EXISTS "Users read own call followups" ON public.call_followups;
DROP POLICY IF EXISTS "Service role full access" ON public.call_followups;
CREATE POLICY "Users read own call followups" ON public.call_followups
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access call_followups" ON public.call_followups
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- call_lab_reports
DROP POLICY IF EXISTS "Users read own call lab reports" ON public.call_lab_reports;
DROP POLICY IF EXISTS "Service role full access" ON public.call_lab_reports;
CREATE POLICY "Users read own call lab reports" ON public.call_lab_reports
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access call_lab_reports" ON public.call_lab_reports
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- coaching_reports
DROP POLICY IF EXISTS "Users read own coaching reports" ON public.coaching_reports;
DROP POLICY IF EXISTS "Service role full access" ON public.coaching_reports;
CREATE POLICY "Users read own coaching reports" ON public.coaching_reports
  FOR SELECT USING (
    user_id = (select auth.uid())
  );
CREATE POLICY "Service role full access coaching_reports" ON public.coaching_reports
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- ============================================
-- 4. RLS POLICIES FOR CLIENT ONBOARDING TABLES
-- Access pattern: users access their company's
-- data via enrollment -> company -> table chain
-- ============================================

-- Helper: check if user owns the company via enrollment
-- Used in policies below for company-scoped tables

-- client_programs: lookup table, all authenticated users can read
DROP POLICY IF EXISTS "Authenticated users read programs" ON public.client_programs;
DROP POLICY IF EXISTS "Service role full access client_programs" ON public.client_programs;
CREATE POLICY "Authenticated users read programs" ON public.client_programs
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL
  );
CREATE POLICY "Service role full access client_programs" ON public.client_programs
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_invites: users see invites for their email, service role manages
DROP POLICY IF EXISTS "Users read own invites" ON public.client_invites;
DROP POLICY IF EXISTS "Service role full access client_invites" ON public.client_invites;
CREATE POLICY "Users read own invites" ON public.client_invites
  FOR SELECT USING (
    email = (select auth.jwt() ->> 'email')
  );
CREATE POLICY "Service role full access client_invites" ON public.client_invites
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_financials: users see their company's data
DROP POLICY IF EXISTS "Users read own company financials" ON public.client_financials;
DROP POLICY IF EXISTS "Service role full access client_financials" ON public.client_financials;
CREATE POLICY "Users read own company financials" ON public.client_financials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_financials.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_financials" ON public.client_financials
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_sales_process: users see their company's data
DROP POLICY IF EXISTS "Users read own company sales process" ON public.client_sales_process;
DROP POLICY IF EXISTS "Service role full access client_sales_process" ON public.client_sales_process;
CREATE POLICY "Users read own company sales process" ON public.client_sales_process
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_sales_process.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_sales_process" ON public.client_sales_process
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_leadership_contacts: users see their company's data
DROP POLICY IF EXISTS "Users read own company leadership" ON public.client_leadership_contacts;
DROP POLICY IF EXISTS "Service role full access client_leadership_contacts" ON public.client_leadership_contacts;
CREATE POLICY "Users read own company leadership" ON public.client_leadership_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_leadership_contacts.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_leadership_contacts" ON public.client_leadership_contacts
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_team_members: users see their company's data
DROP POLICY IF EXISTS "Users read own company team members" ON public.client_team_members;
DROP POLICY IF EXISTS "Service role full access client_team_members" ON public.client_team_members;
CREATE POLICY "Users read own company team members" ON public.client_team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_team_members.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_team_members" ON public.client_team_members
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_services: users see their company's data
DROP POLICY IF EXISTS "Users read own company services" ON public.client_services;
DROP POLICY IF EXISTS "Service role full access client_services" ON public.client_services;
CREATE POLICY "Users read own company services" ON public.client_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_services.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_services" ON public.client_services
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_portfolio: users see their company's data
DROP POLICY IF EXISTS "Users read own company portfolio" ON public.client_portfolio;
DROP POLICY IF EXISTS "Service role full access client_portfolio" ON public.client_portfolio;
CREATE POLICY "Users read own company portfolio" ON public.client_portfolio
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_portfolio.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_portfolio" ON public.client_portfolio
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_ops_capacity: users see their company's data
DROP POLICY IF EXISTS "Users read own company ops capacity" ON public.client_ops_capacity;
DROP POLICY IF EXISTS "Service role full access client_ops_capacity" ON public.client_ops_capacity;
CREATE POLICY "Users read own company ops capacity" ON public.client_ops_capacity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_ops_capacity.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_ops_capacity" ON public.client_ops_capacity
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- client_competitors: users see their company's data
DROP POLICY IF EXISTS "Users read own company competitors" ON public.client_competitors;
DROP POLICY IF EXISTS "Service role full access client_competitors" ON public.client_competitors;
CREATE POLICY "Users read own company competitors" ON public.client_competitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_companies cc
      JOIN client_enrollments ce ON ce.id = cc.enrollment_id
      WHERE cc.id = client_competitors.company_id
      AND ce.user_id = (select auth.uid())
    )
  );
CREATE POLICY "Service role full access client_competitors" ON public.client_competitors
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- ============================================
-- DONE
-- This migration resolves:
-- - 2x security_definer_view errors
-- - 14x rls_disabled_in_public errors
-- ============================================
