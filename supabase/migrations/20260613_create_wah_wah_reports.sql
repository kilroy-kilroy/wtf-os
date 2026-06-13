-- Wah-Wah Detector (Self-Serve Positioning Engine, Product 1 — free tier).
-- Anonymous public tool: a row is created on analyze (no email), then the email
-- is written on at report-gate time. Leads flow through the existing
-- Loops/beehiiv/Copper pipeline; this table is the report store + rate-limit source.

create table if not exists public.wah_wah_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  email       text,
  url         text not null,
  score       int  not null,
  result      jsonb not null,
  ip          text,
  created_at  timestamptz not null default now()
);

-- Supports the per-IP hourly rate limit (count by ip over the last hour).
create index if not exists wah_wah_reports_ip_created_idx
  on public.wah_wah_reports (ip, created_at);

alter table public.wah_wah_reports enable row level security;

-- Mirrors the visibility_lab_reports policy: the app uses the service-role key
-- server-side; a signed-in user may read their own rows by user_id or jwt email.
drop policy if exists "Service role full access wah_wah_reports" on public.wah_wah_reports;
create policy "Service role full access wah_wah_reports" on public.wah_wah_reports
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Users read own wah_wah reports" on public.wah_wah_reports;
create policy "Users read own wah_wah reports" on public.wah_wah_reports
  for select using (
    user_id = (select auth.uid())
    or email = (select auth.jwt() ->> 'email')
  );
