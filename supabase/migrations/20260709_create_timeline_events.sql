-- supabase/migrations/20260709_create_timeline_events.sql
-- Unified person timeline: join layer + cached summaries + cron high-water marks.

create table if not exists timeline_events (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,
  company_id   uuid references companies(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  source_type  text not null check (source_type in ('email','call','assessment','discovery')),
  source_id    text not null,
  occurred_at  timestamptz not null,
  title        text not null,
  summary      text,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists idx_timeline_events_contact
  on timeline_events (contact_id, occurred_at desc);

create table if not exists contact_summaries (
  contact_id   uuid primary key references contacts(id) on delete cascade,
  summary      text not null default '',
  next_step    text not null default '',
  generated_at timestamptz not null default now(),
  source_hash  text
);

create table if not exists sync_state (
  source         text primary key,           -- 'fireflies' | 'copper_email'
  last_synced_at timestamptz,
  updated_at     timestamptz not null default now()
);

-- Service role (server client) bypasses RLS; enable it so nothing is
-- accidentally exposed via the anon key.
alter table timeline_events   enable row level security;
alter table contact_summaries enable row level security;
alter table sync_state        enable row level security;
