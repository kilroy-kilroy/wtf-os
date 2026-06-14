-- Allow authenticated users to update the outcome on their own call lab reports.
--
-- Background: call_lab_reports had only two RLS policies — a SELECT policy for
-- users ("Users read own call lab reports") and a FOR ALL policy scoped to the
-- service_role. The outcome tracker (/calls/[callId]/outcome -> PATCH
-- /api/calls/[callId]/outcome) runs under the user's own session (authenticated
-- role, not service_role), so its UPDATE was silently blocked by RLS: 0 rows
-- changed, the `.select().single()` errored, and the UI showed
-- "Failed to update outcome". The page's GET worked only because of the SELECT
-- policy.
--
-- This adds the missing UPDATE policy, scoped to the user's own rows on both the
-- USING (row currently owned) and WITH CHECK (row stays owned) sides.

DROP POLICY IF EXISTS "Users update own call lab reports" ON public.call_lab_reports;
CREATE POLICY "Users update own call lab reports" ON public.call_lab_reports
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
