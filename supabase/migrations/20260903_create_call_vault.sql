-- Call Vault — public intake for contributed sales calls.
-- Contributors give 3-5 calls (transcripts or audio) in exchange for a review.
-- Service-role only: the public form is unauthenticated and talks to these
-- tables exclusively through server routes holding the service key.

create table if not exists public.call_vault_contributors (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  email                     text not null unique,
  agency_name               text,
  agency_url                text,
  services                  text[] not null default '{}',
  revenue_band              text,
  target_client             text,

  -- Baseline consent. Compresses NDA s5(b) + s7: the contributor confirms they
  -- have the rights to share, and grants the anonymized-aggregate license.
  -- Required of everyone, NDA or not — it is what makes the corpus usable.
  terms_accepted_at         timestamptz not null,

  -- NDA (optional upgrade). Set at envelope creation so an abandoned signature
  -- is still correlatable; nda_signed_at only after server-side verification.
  nda_contract_id           uuid references public.contracts(id),
  nda_signed_at             timestamptz,
  client_legal_name         text,
  client_address            text,

  -- Short-lived anonymous session for this sitting (24h).
  session_token             text,
  session_token_expires_at  timestamptz,

  -- Single-use emailed resume link (lib/access-tokens.ts contract, which
  -- specifies `access_token text unique`). The uniqueness matters: the resume
  -- route does .eq('access_token', token).maybeSingle(), which THROWS rather
  -- than returning null if two rows ever shared a token. Postgres allows
  -- multiple NULLs under a UNIQUE constraint, so the many contributors with no
  -- live token are unaffected. The partial index below stays — it is what
  -- keeps the lookup cheap.
  access_token              text unique,
  access_token_expires_at   timestamptz,
  access_token_used_at      timestamptz,

  status                    text not null default 'draft', -- draft | submitted
  ip                        text,
  created_at                timestamptz not null default now(),
  submitted_at              timestamptz
);

create index if not exists call_vault_contributors_session_idx
  on public.call_vault_contributors (session_token)
  where session_token is not null;

create index if not exists call_vault_contributors_access_token_idx
  on public.call_vault_contributors (access_token)
  where access_token is not null;

create index if not exists call_vault_contributors_ip_created_idx
  on public.call_vault_contributors (ip, created_at);

-- The unit of analysis. One row per sales call, regardless of how many files
-- carry it — a call uploaded as both a recording and a transcript is ONE call,
-- otherwise every "X% of calls" figure is wrong.
create table if not exists public.call_vault_calls (
  id              uuid primary key default gen_random_uuid(),
  contributor_id  uuid not null references public.call_vault_contributors(id) on delete cascade,
  stage           text,   -- discovery | pitch | proposal | negotiation | renewal | other
  outcome         text,   -- won | lost | no_decision | ghosted | na
  deal_size_band  text,
  call_date       date,
  label           text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists call_vault_calls_contributor_idx
  on public.call_vault_calls (contributor_id, created_at);

create table if not exists public.call_vault_files (
  id          uuid primary key default gen_random_uuid(),
  call_id     uuid not null references public.call_vault_calls(id) on delete cascade,
  storage_path text not null,
  kind        text not null,  -- transcript | audio | pdf | other
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

create index if not exists call_vault_files_call_idx
  on public.call_vault_files (call_id);

alter table public.call_vault_contributors enable row level security;
alter table public.call_vault_calls        enable row level security;
alter table public.call_vault_files        enable row level security;

drop policy if exists "Service role full access call_vault_contributors" on public.call_vault_contributors;
create policy "Service role full access call_vault_contributors" on public.call_vault_contributors
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access call_vault_calls" on public.call_vault_calls;
create policy "Service role full access call_vault_calls" on public.call_vault_calls
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access call_vault_files" on public.call_vault_files;
create policy "Service role full access call_vault_files" on public.call_vault_files
  for all using ((select auth.role()) = 'service_role');

-- Private bucket. 200MB ceiling is generous for audio-only (a 2h MP3 is
-- ~60-120MB) and there is no transcription step to bound.
insert into storage.buckets (id, name, public, file_size_limit)
values ('call-vault', 'call-vault', false, 209715200)
on conflict (id) do nothing;
