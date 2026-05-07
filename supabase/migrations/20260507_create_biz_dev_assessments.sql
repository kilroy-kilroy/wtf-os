-- WTF Biz Dev Assessment — table + RLS policies
-- Spec: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §10

create table if not exists biz_dev_assessments (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  user_id                uuid references auth.users(id) on delete set null,

  -- Identity (captured at intake; user_id resolved on submit)
  name                   text not null,
  email                  text not null,
  company_name           text,
  website_url            text,
  linkedin_url           text,

  -- Discovery
  service_description    text,
  customer_description   text,
  revenue_band           text,
  affordability_answer   text,
  newsletter_opt_in      boolean default false,

  -- Deterministic results
  answers                jsonb not null,
  dimensions             jsonb not null,
  composite_score        int not null,
  verdict                text not null check (verdict in ('ready','almost')),
  stage                  text not null check (stage in (
    'all_founder_no_system','half_built_engine','engine_online_hire_ready'
  )),
  hard_gate_failures     jsonb,
  dominant_trap          text check (dominant_trap in ('personality','indispensability','more_founder')),
  cta_tier               text not null check (cta_tier in ('studio','growth')),

  -- Research artifacts (filled async)
  research_artifacts     jsonb,
  research_status        text default 'pending'
    check (research_status in ('pending','completed','partial','failed')),

  -- AI-generated report (filled async)
  report_markdown        text,
  report_status          text default 'pending'
    check (report_status in ('pending','completed','failed'))
);

create index if not exists biz_dev_assessments_email_idx on biz_dev_assessments (email);
create index if not exists biz_dev_assessments_user_id_idx on biz_dev_assessments (user_id);

-- RLS
alter table biz_dev_assessments enable row level security;

-- Users can read only their own rows
drop policy if exists "biz_dev_assessments_select_own" on biz_dev_assessments;
create policy "biz_dev_assessments_select_own"
  on biz_dev_assessments for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS for inserts/updates from API route
drop policy if exists "biz_dev_assessments_service_all" on biz_dev_assessments;
create policy "biz_dev_assessments_service_all"
  on biz_dev_assessments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Auto-update updated_at on changes
create or replace function biz_dev_assessments_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists biz_dev_assessments_updated_at on biz_dev_assessments;
create trigger biz_dev_assessments_updated_at
  before update on biz_dev_assessments
  for each row execute procedure biz_dev_assessments_set_updated_at();
