-- ============================================
-- Fix Remaining Supabase Security Linter Errors
-- Created: 2026-03-03
--
-- Resolves:
-- - 2x security_definer_view (instant_scenario_stats, instant_report_stats)
-- - 15x rls_disabled_in_public (including visibility_lab_reports)
--
-- All statements are idempotent and safe to re-run.
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Recreate with security_invoker = true so they
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
  ROUND(COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2) as capture_rate
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
-- 2. ENABLE RLS ON ALL 15 FLAGGED TABLES
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
ALTER TABLE public.visibility_lab_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICY FOR visibility_lab_reports
-- (missing from previous migration)
-- Users can read their own reports; service role
-- has full access for admin/API operations
-- ============================================

DROP POLICY IF EXISTS "Users read own visibility lab reports" ON public.visibility_lab_reports;
DROP POLICY IF EXISTS "Service role full access visibility_lab_reports" ON public.visibility_lab_reports;

CREATE POLICY "Users read own visibility lab reports" ON public.visibility_lab_reports
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

CREATE POLICY "Service role full access visibility_lab_reports" ON public.visibility_lab_reports
  FOR ALL USING (
    (select auth.role()) = 'service_role'
  );

-- ============================================
-- DONE
-- This migration resolves all 17 Supabase
-- database linter security errors:
-- - 2x security_definer_view
-- - 15x rls_disabled_in_public
-- ============================================
