-- Office Hours access backfill + admin flags (2026-07-17)
--
-- 1) Office hours have only ever been run for Agency Studio, so every office-hours
--    session (client_content.content_type = 'session') is safe to expose to BOTH
--    agency-studio and agency-studio-plus. Union the agency program IDs into each
--    row's program_ids without clobbering any existing IDs.
-- 2) Ensure both of Tim's addresses are admins.

WITH agency AS (
  SELECT array_agg(id) AS ids
  FROM client_programs
  WHERE slug IN ('agency-studio', 'agency-studio-plus')
)
UPDATE client_content c
SET program_ids = ARRAY(
  SELECT DISTINCT x
  FROM unnest(COALESCE(c.program_ids, '{}'::uuid[]) || (SELECT ids FROM agency)) AS x
)
WHERE c.content_type = 'session'
  -- Safety guard: if neither agency slug resolved (ids IS NULL), the array union
  -- above would collapse program_ids to '{}', which under RLS means world-visible.
  -- Skip the update entirely in that case rather than over-expose sessions.
  AND (SELECT ids FROM agency) IS NOT NULL;

UPDATE users
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('tim@timkilroy.com', 'tk@timkilroy.com')
);
