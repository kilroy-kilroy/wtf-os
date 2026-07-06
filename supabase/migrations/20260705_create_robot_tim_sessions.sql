-- supabase/migrations/20260705_create_robot_tim_sessions.sql
create table robot_tim_sessions (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  first_name         text,
  site_url           text not null,
  status             text not null default 'interviewing', -- interviewing | synthesizing | complete | failed
  stripe_session_id  text,
  current_node       int  not null default 0,
  pushed             boolean not null default false, -- have we already pushed on current_node?
  interview_complete boolean not null default false,
  answers            jsonb not null default '[]'::jsonb, -- [{nodeId, raw, classification, reaction}]
  crawl              jsonb,  -- { pages:[{url, score, flags}], homepageText }
  spine              jsonb,
  makeover           jsonb,
  node7              jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create unique index robot_tim_sessions_stripe_idx on robot_tim_sessions (stripe_session_id);
alter table robot_tim_sessions enable row level security;
-- Service-role only (app reads/writes server-side). No public policy — mirrors wah_wah_reports.
