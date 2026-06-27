-- Case Study Lab (public lead-magnet tool). A row is created on /start with
-- the captured email; the interview transcript + gathered slots are updated each
-- turn; the composed case study lands in `result` on /generate. Leads flow through
-- the existing Loops/beehiiv/Copper pipeline; this table is the report store +
-- rate-limit source. Mirrors wah_wah_reports.

create table if not exists public.case_study_lab_reports (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id),
  email              text,
  agency_url         text,
  agency_brand       jsonb,
  client_name        text,
  client_anonymized  boolean not null default false,
  client_logo_url    text,
  status             text not null default 'interviewing',
  conversation       jsonb not null default '[]'::jsonb,
  slots              jsonb,
  result             jsonb,
  ip                 text,
  created_at         timestamptz not null default now()
);

create index if not exists case_study_lab_reports_ip_created_idx
  on public.case_study_lab_reports (ip, created_at);

alter table public.case_study_lab_reports enable row level security;

drop policy if exists "Service role full access case_study_lab_reports" on public.case_study_lab_reports;
create policy "Service role full access case_study_lab_reports" on public.case_study_lab_reports
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Users read own case_study reports" on public.case_study_lab_reports;
create policy "Users read own case_study reports" on public.case_study_lab_reports
  for select using (
    user_id = (select auth.uid())
    or email = (select auth.jwt() ->> 'email')
  );

-- Public bucket for shareable client logos + generated cards.
insert into storage.buckets (id, name, public)
values ('case-study-lab-assets', 'case-study-lab-assets', true)
on conflict (id) do nothing;
