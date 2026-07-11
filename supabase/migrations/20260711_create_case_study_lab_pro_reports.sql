-- Case Study Lab Pro. The paid, auth-gated tier: a row is created on /classify
-- with the router's recommendation; the archetype-specific interview transcript +
-- gathered superset slots are updated each turn; the composed case study lands in
-- `result` and the scorer's coaching in `quality` on /generate. Keyed to the
-- signed-in account (not an anonymous email lead like the free table). Reuses the
-- free tool's public `case-study-lab-assets` bucket for logos + Craft assets.

create table if not exists public.case_study_lab_pro_reports (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  agency_url           text,
  agency_brand         jsonb,                 -- { colors[], logoUrl, name }
  agency_name          text,
  agency_logo_url      text,
  accent               text,
  discipline           text,                  -- router input: what the agency does
  raw_win              text,                  -- router input: the pasted win
  audience             text,                  -- router input: who reads this
  archetype            text,                  -- proof | transformation | big_idea | craft | method
  secondary_archetype  text,
  router               jsonb,                 -- { confidence, why, missingIngredients[] }
  client_name          text,
  client_anonymized    boolean not null default false,
  client_logo_url      text,
  asset_urls           text[],                -- Craft Showcase uploaded work
  status               text not null default 'routing', -- routing | interviewing | complete
  conversation         jsonb not null default '[]'::jsonb,
  slots                jsonb,                 -- superset ProCaseStudySlots
  result               jsonb,                 -- composed case study (archetype-shaped)
  quality              jsonb,                 -- { score, band, missing[], suggestions[] }
  cta_url              text,
  white_label          boolean not null default true, -- Pro drops the "Powered by" mark
  published            boolean not null default false,
  wall_slug            text,                  -- hostable case-study wall
  created_at           timestamptz not null default now()
);

create index if not exists case_study_lab_pro_reports_user_idx
  on public.case_study_lab_pro_reports (user_id, created_at desc);
create unique index if not exists case_study_lab_pro_reports_wall_slug_idx
  on public.case_study_lab_pro_reports (wall_slug) where wall_slug is not null;

alter table public.case_study_lab_pro_reports enable row level security;

drop policy if exists "Service role full access case_study_lab_pro_reports" on public.case_study_lab_pro_reports;
create policy "Service role full access case_study_lab_pro_reports" on public.case_study_lab_pro_reports
  for all using ((select auth.role()) = 'service_role');

-- Owners read/write their own rows.
drop policy if exists "Users read own pro reports" on public.case_study_lab_pro_reports;
create policy "Users read own pro reports" on public.case_study_lab_pro_reports
  for select using (user_id = (select auth.uid()));

-- Anyone may read a PUBLISHED row (for the public case-study wall / shared report).
drop policy if exists "Anyone reads published pro reports" on public.case_study_lab_pro_reports;
create policy "Anyone reads published pro reports" on public.case_study_lab_pro_reports
  for select using (published = true);

-- Note: the public `case-study-lab-assets` storage bucket is already created by
-- 20260627_create_case_study_lab_reports.sql; Pro reuses it under pro/<id>/*.
