-- Contract Generator + E-Sign (Firma).
-- Single source of truth = our HTML templates. Firma is the e-sign layer only.
-- The app talks to these tables with the service-role key, server-side, behind
-- the admin gate, so RLS exposes nothing to anon/authenticated clients.

-- Reusable contract templates (authored once from existing Word/Google docs).
create table if not exists public.contract_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  body_html     text not null,                 -- contract language with {{placeholders}} + {{sow}}
  variables     jsonb not null default '[]',   -- [{key,label,required}] drives the form
  signer_config jsonb not null default '{}',   -- default signer roles/labels
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Reusable SOW building blocks dropped into a draft.
create table if not exists public.sow_snippets (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   text not null default 'clause',   -- deliverable | clause | timeline | ...
  body_html  text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- One generated contract. merged_html + field_values are an immutable snapshot:
-- once sent, editing a template must not change in-flight contracts.
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid references public.contract_templates(id),
  title           text not null default 'Untitled contract',
  field_values    jsonb not null default '{}',
  sow_html        text not null default '',
  merged_html     text,
  pdf_path        text,
  signed_pdf_path text,
  status          text not null default 'draft', -- draft|sending|sent|viewed|signed|completed|declined|voided
  firma_request_id text,
  last_error      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contracts_status_idx on public.contracts (status, created_at desc);

-- Per-signer status (client signs first, counter second).
create table if not exists public.contract_signers (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.contracts(id) on delete cascade,
  role            text not null,            -- client | counter
  name            text not null,
  email           text not null,
  sign_order      int  not null default 1,
  status          text not null default 'pending', -- pending|viewed|signed
  signed_at       timestamptz,
  firma_signer_id text
);

create index if not exists contract_signers_contract_idx on public.contract_signers (contract_id);

-- RLS: service-role only (app is server-side + admin-gated; nothing client-readable).
alter table public.contract_templates enable row level security;
alter table public.sow_snippets       enable row level security;
alter table public.contracts          enable row level security;
alter table public.contract_signers   enable row level security;

drop policy if exists "Service role full access contract_templates" on public.contract_templates;
create policy "Service role full access contract_templates" on public.contract_templates
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access sow_snippets" on public.sow_snippets;
create policy "Service role full access sow_snippets" on public.sow_snippets
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access contracts" on public.contracts;
create policy "Service role full access contracts" on public.contracts
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access contract_signers" on public.contract_signers;
create policy "Service role full access contract_signers" on public.contract_signers
  for all using ((select auth.role()) = 'service_role');

-- Private storage bucket for generated + signed PDFs.
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;
