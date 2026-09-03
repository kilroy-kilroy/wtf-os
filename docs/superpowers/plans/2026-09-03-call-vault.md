# Call Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public form at `/call-vault` where agency owners contribute sales call transcripts and recordings, optionally sign an NDA inline, and land in Supabase with the metadata needed for later aggregate analysis.

**Architecture:** One public Next.js App Router page backed by six thin API routes. Files go browser → Supabase Storage via signed upload URLs, never through a Vercel function. The NDA reuses the existing contract generator (`contract_templates` → `renderContractPdf` → Firma) but stops before `sendSigningRequest` and instead returns a recipient id for an embedded signing iframe. Business logic lives in pure, unit-tested modules under `apps/web/lib/call-vault/`; routes stay thin.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + Storage, service-role), Firma.dev e-sign, Loops, Beehiiv, Copper, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-call-vault-design.md`

## Global Constraints

- **Test runner:** Vitest. Run from `apps/web/` with `npm test` (`vitest run`).
- **`apps/web/vitest.config.ts` uses an explicit `include` allowlist.** A new test directory that is not added to that array **silently never runs**. Task 2 adds `lib/call-vault/**/*.test.ts`. Do not skip it.
- **Test style:** the repo tests pure functions colocated as `*.test.ts`. Keep validation and decision logic in pure modules; keep DB and network calls in thin wrappers.
- **Path alias:** `@/` → `apps/web/` root.
- **Supabase access is service-role only.** All four new tables and the bucket are RLS-locked to `service_role`. Never query them from a browser client.
- **Accepted uploads:** text `.txt .md .docx .pdf .rtf .csv .vtt .srt`; audio `.mp3 .m4a .wav .aac .ogg .flac`. Video is rejected client-side **and** server-side.
- **Limits:** 200MB per file, 10 calls per contributor, 5 files per call.
- **Booking URL:** `NEXT_PUBLIC_CALL_VAULT_BOOKING_URL`, default `https://meet.timkilroy.com/sales-call-survey`.
- **Firma:** ship against `FIRMA_ENV=test`. `sendSigningRequest` must **never** be called on the Call Vault path — that would email an envelope, spend a credit, and defeat the entire feature.
- **Admin gate:** `requireAdminRequest(request: NextRequest): Promise<boolean>` from `@/lib/contracts/require-admin`.
- **Third-party fan-out is always non-blocking:** wrap in `waitUntil` and `.catch`, per `apps/web/lib/wah-wah/lead.ts`.

---

### Task 1: Database migration and storage bucket

**Files:**
- Create: `supabase/migrations/20260903_create_call_vault.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `call_vault_contributors`, `call_vault_calls`, `call_vault_files`; private storage bucket `call-vault`.

- [ ] **Step 1: Write the migration**

```sql
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

  -- Single-use emailed resume link (lib/access-tokens.ts contract).
  access_token              text,
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
```

- [ ] **Step 2: Apply the migration**

Apply through whatever path this repo normally uses (Supabase SQL editor or `supabase db push`). Then verify:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'call_vault%';
-- expect exactly: call_vault_calls, call_vault_contributors, call_vault_files

select id, public, file_size_limit from storage.buckets where id = 'call-vault';
-- expect: call-vault | false | 209715200
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260903_create_call_vault.sql
git commit -m "feat(call-vault): contributors, calls, files tables + private bucket"
```

---

### Task 2: Vocabularies and pure validation

**Files:**
- Create: `apps/web/lib/call-vault/vocabularies.ts`
- Create: `apps/web/lib/call-vault/validate.ts`
- Create: `apps/web/lib/call-vault/validate.test.ts`
- Modify: `apps/web/vitest.config.ts` (add the include glob — **without this the tests never run**)

**Interfaces:**
- Consumes: nothing.
- Produces: `SERVICES`, `REVENUE_BANDS`, `STAGES`, `OUTCOMES`, `DEAL_SIZE_BANDS`, `isValidOption`; `EMAIL_RE`, `MAX_FILE_BYTES`, `MAX_CALLS_PER_CONTRIBUTOR`, `MAX_FILES_PER_CALL`, `classifyFile`, `ownsStoragePath`, `validateAboutYou`, `validateCallMeta`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/call-vault/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  ownsStoragePath,
  validateAboutYou,
  validateCallMeta,
  isSessionExpired,
  MAX_FILE_BYTES,
} from '@/lib/call-vault/validate';

describe('classifyFile', () => {
  it('classifies text transcript formats', () => {
    expect(classifyFile('call.txt', 'text/plain')).toEqual({ ok: true, kind: 'transcript' });
    expect(classifyFile('call.vtt', 'text/vtt')).toEqual({ ok: true, kind: 'transcript' });
    expect(classifyFile('NOTES.DOCX', '')).toEqual({ ok: true, kind: 'transcript' });
  });

  it('classifies pdf separately from other text', () => {
    expect(classifyFile('deck.pdf', 'application/pdf')).toEqual({ ok: true, kind: 'pdf' });
  });

  it('classifies audio', () => {
    expect(classifyFile('call.mp3', 'audio/mpeg')).toEqual({ ok: true, kind: 'audio' });
    expect(classifyFile('call.m4a', '')).toEqual({ ok: true, kind: 'audio' });
  });

  it('rejects video even when the extension looks harmless', () => {
    const r = classifyFile('call.mp4', 'video/mp4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/video/i);
  });

  it('rejects unknown extensions', () => {
    expect(classifyFile('payload.exe', '').ok).toBe(false);
    expect(classifyFile('noextension', '').ok).toBe(false);
  });

  it('rejects a video mime type wearing an audio extension', () => {
    expect(classifyFile('call.mp3', 'video/mp4').ok).toBe(false);
  });
});

describe('ownsStoragePath', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('accepts a path under the contributor prefix', () => {
    expect(ownsStoragePath(`${id}/call-abc/file.mp3`, id)).toBe(true);
  });

  it('rejects another contributor prefix', () => {
    expect(ownsStoragePath('22222222-2222-2222-2222-222222222222/x/f.mp3', id)).toBe(false);
  });

  it('rejects traversal and prefix-collision attempts', () => {
    expect(ownsStoragePath(`${id}/../other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}-evil/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`x/${id}/f.mp3`, id)).toBe(false);
  });
});

describe('validateAboutYou', () => {
  const base = {
    name: 'Dana Reed',
    email: 'dana@example.com',
    agencyName: 'Reed Media',
    agencyUrl: 'https://reedmedia.com',
    services: ['paid_media', 'seo'],
    revenueBand: '1m_3m',
    targetClient: 'DTC brands',
    termsAccepted: true,
  };

  it('accepts a complete payload', () => {
    const r = validateAboutYou(base);
    expect(r.ok).toBe(true);
  });

  it('requires a name and a valid email', () => {
    expect(validateAboutYou({ ...base, name: '  ' }).ok).toBe(false);
    expect(validateAboutYou({ ...base, email: 'not-an-email' }).ok).toBe(false);
  });

  it('requires the consent checkbox', () => {
    const r = validateAboutYou({ ...base, termsAccepted: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/consent|terms/i);
  });

  it('rejects unknown vocabulary values', () => {
    expect(validateAboutYou({ ...base, services: ['astrology'] }).ok).toBe(false);
    expect(validateAboutYou({ ...base, revenueBand: 'squillions' }).ok).toBe(false);
  });

  it('normalizes the email to lowercase and trims text', () => {
    const r = validateAboutYou({ ...base, email: '  Dana@Example.COM ', name: ' Dana Reed ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe('dana@example.com');
      expect(r.value.name).toBe('Dana Reed');
    }
  });
});

describe('validateCallMeta', () => {
  it('accepts known vocabulary values', () => {
    expect(validateCallMeta({ stage: 'discovery', outcome: 'won', dealSizeBand: '5k_10k_mo' }).ok).toBe(true);
  });

  it('accepts an entirely empty payload — call metadata is optional', () => {
    expect(validateCallMeta({}).ok).toBe(true);
  });

  it('rejects an unknown stage', () => {
    expect(validateCallMeta({ stage: 'vibes' }).ok).toBe(false);
  });
});

describe('isSessionExpired', () => {
  const now = new Date('2026-09-03T12:00:00Z');

  it('treats a future expiry as live', () => {
    expect(isSessionExpired('2026-09-03T12:00:01Z', now)).toBe(false);
  });

  it('treats a past expiry as expired', () => {
    expect(isSessionExpired('2026-09-03T11:59:59Z', now)).toBe(true);
  });

  it('treats a missing expiry as expired — never fail open', () => {
    expect(isSessionExpired(null, now)).toBe(true);
    expect(isSessionExpired('', now)).toBe(true);
  });

  it('treats an unparseable expiry as expired', () => {
    expect(isSessionExpired('not-a-date', now)).toBe(true);
  });
});

describe('limits', () => {
  it('caps files at 200MB', () => {
    expect(MAX_FILE_BYTES).toBe(200 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Add the test glob to vitest config**

In `apps/web/vitest.config.ts`, add `"lib/call-vault/**/*.test.ts"` to the `test.include` array.

- [ ] **Step 3: Run the test to verify it fails**

Run from `apps/web/`: `npx vitest run lib/call-vault`
Expected: FAIL — cannot resolve `@/lib/call-vault/validate`.

- [ ] **Step 4: Write the vocabularies**

Create `apps/web/lib/call-vault/vocabularies.ts`:

```ts
// Fixed option sets, stored as slugs. These are the dimensions the corpus is
// later sliced by ("X% of discovery calls that were won did Y"), so the values
// must stay stable — renaming a slug silently rewrites history.

export interface Option { value: string; label: string }

export const SERVICES: Option[] = [
  { value: 'paid_media', label: 'Paid media' },
  { value: 'seo', label: 'SEO' },
  { value: 'content', label: 'Content' },
  { value: 'web_dev', label: 'Web design / development' },
  { value: 'branding', label: 'Branding / creative' },
  { value: 'email', label: 'Email / lifecycle' },
  { value: 'social', label: 'Social' },
  { value: 'pr', label: 'PR' },
  { value: 'strategy', label: 'Strategy / consulting' },
  { value: 'full_service', label: 'Full service' },
  { value: 'other', label: 'Other' },
];

export const REVENUE_BANDS: Option[] = [
  { value: 'under_500k', label: 'Under $500K' },
  { value: '500k_1m', label: '$500K – $1M' },
  { value: '1m_3m', label: '$1M – $3M' },
  { value: '3m_5m', label: '$3M – $5M' },
  { value: '5m_10m', label: '$5M – $10M' },
  { value: '10m_plus', label: '$10M+' },
];

export const STAGES: Option[] = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'pitch', label: 'Pitch / presentation' },
  { value: 'proposal', label: 'Proposal review' },
  { value: 'negotiation', label: 'Negotiation / closing' },
  { value: 'renewal', label: 'Renewal / expansion' },
  { value: 'other', label: 'Other' },
];

export const OUTCOMES: Option[] = [
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'no_decision', label: 'No decision yet' },
  { value: 'ghosted', label: 'Ghosted' },
  { value: 'na', label: 'Not applicable' },
];

export const DEAL_SIZE_BANDS: Option[] = [
  { value: 'under_2_5k_mo', label: 'Under $2.5K/mo' },
  { value: '2_5k_5k_mo', label: '$2.5K – $5K/mo' },
  { value: '5k_10k_mo', label: '$5K – $10K/mo' },
  { value: '10k_25k_mo', label: '$10K – $25K/mo' },
  { value: '25k_plus_mo', label: '$25K+/mo' },
  { value: 'one_time_project', label: 'One-time project' },
  { value: 'unsure', label: 'Not sure' },
];

export function isValidOption(options: Option[], value: unknown): boolean {
  return typeof value === 'string' && options.some((o) => o.value === value);
}

export function labelFor(options: Option[], value: string | null | undefined): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}
```

- [ ] **Step 5: Write the validation module**

Create `apps/web/lib/call-vault/validate.ts`:

```ts
import {
  SERVICES, REVENUE_BANDS, STAGES, OUTCOMES, DEAL_SIZE_BANDS, isValidOption,
} from './vocabularies';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_FILE_BYTES = 200 * 1024 * 1024;
export const MAX_CALLS_PER_CONTRIBUTOR = 10;
export const MAX_FILES_PER_CALL = 5;

// Transcripts and documents. PDFs are tracked as their own kind because they
// need a different extraction path than plain text later.
const TEXT_EXTENSIONS = ['txt', 'md', 'docx', 'rtf', 'csv', 'vtt', 'srt'];
const PDF_EXTENSIONS = ['pdf'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac'];

export type FileKind = 'transcript' | 'audio' | 'pdf';
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) return '';
  return fileName.slice(i + 1).toLowerCase();
}

/**
 * Decide whether a file is acceptable and what kind it is.
 *
 * Nothing is transcribed, so a video file is pure storage cost with no path to
 * value — rejected explicitly (rather than falling into "unknown") so the UI can
 * tell the contributor to export the audio instead. Both the extension and the
 * mime type are checked: a `video/*` mime wearing an audio extension is still a
 * video.
 */
export function classifyFile(
  fileName: string,
  mimeType: string,
): { ok: true; kind: FileKind } | { ok: false; error: string } {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) {
    return { ok: false, error: 'Video is not accepted. Please export the audio or the transcript.' };
  }

  const ext = extensionOf(fileName);
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv'].includes(ext)) {
    return { ok: false, error: 'Video is not accepted. Please export the audio or the transcript.' };
  }
  if (AUDIO_EXTENSIONS.includes(ext)) return { ok: true, kind: 'audio' };
  if (PDF_EXTENSIONS.includes(ext)) return { ok: true, kind: 'pdf' };
  if (TEXT_EXTENSIONS.includes(ext)) return { ok: true, kind: 'transcript' };

  return {
    ok: false,
    error: 'Unsupported file type. Accepted: txt, md, docx, pdf, rtf, csv, vtt, srt, mp3, m4a, wav, aac, ogg, flac.',
  };
}

/**
 * Guard for commit + download: the path must sit directly under this
 * contributor's own uuid prefix. Rejects traversal (`../`) and prefix collision
 * (`<id>-evil/`), which a naive `startsWith(id)` would let through.
 */
export function ownsStoragePath(storagePath: string, contributorId: string): boolean {
  if (storagePath.includes('..')) return false;
  const segments = storagePath.split('/');
  return segments.length > 1 && segments[0] === contributorId;
}

/**
 * Is an anonymous session past its expiry?
 *
 * Deliberately fails CLOSED: a null, empty, or unparseable expiry counts as
 * expired. This is the only gate on the public upload endpoints, so an
 * ambiguous value must never be read as "still valid".
 */
export function isSessionExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

export interface AboutYou {
  name: string;
  email: string;
  agencyName: string | null;
  agencyUrl: string | null;
  services: string[];
  revenueBand: string | null;
  targetClient: string | null;
}

export function validateAboutYou(payload: {
  name?: unknown; email?: unknown; agencyName?: unknown; agencyUrl?: unknown;
  services?: unknown; revenueBand?: unknown; targetClient?: unknown; termsAccepted?: unknown;
}): Result<AboutYou> {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) return { ok: false, error: 'Name is required' };

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' };

  if (payload.termsAccepted !== true) {
    return { ok: false, error: 'You must accept the terms and consent before contributing calls' };
  }

  const services = Array.isArray(payload.services) ? payload.services : [];
  if (!services.every((s) => isValidOption(SERVICES, s))) {
    return { ok: false, error: 'Unknown service selected' };
  }

  const revenueBand = typeof payload.revenueBand === 'string' && payload.revenueBand
    ? payload.revenueBand : null;
  if (revenueBand && !isValidOption(REVENUE_BANDS, revenueBand)) {
    return { ok: false, error: 'Unknown revenue band' };
  }

  const str = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s || null;
  };

  return {
    ok: true,
    value: {
      name,
      email,
      agencyName: str(payload.agencyName),
      agencyUrl: str(payload.agencyUrl),
      services: services as string[],
      revenueBand,
      targetClient: str(payload.targetClient),
    },
  };
}

export interface CallMeta {
  stage: string | null;
  outcome: string | null;
  dealSizeBand: string | null;
  callDate: string | null;
  label: string | null;
  notes: string | null;
}

export function validateCallMeta(payload: {
  stage?: unknown; outcome?: unknown; dealSizeBand?: unknown;
  callDate?: unknown; label?: unknown; notes?: unknown;
}): Result<CallMeta> {
  const pick = (options: typeof STAGES, v: unknown, name: string): Result<string | null> => {
    if (v === undefined || v === null || v === '') return { ok: true, value: null };
    if (!isValidOption(options, v)) return { ok: false, error: `Unknown ${name}` };
    return { ok: true, value: v as string };
  };

  const stage = pick(STAGES, payload.stage, 'stage');
  if (!stage.ok) return stage;
  const outcome = pick(OUTCOMES, payload.outcome, 'outcome');
  if (!outcome.ok) return outcome;
  const dealSizeBand = pick(DEAL_SIZE_BANDS, payload.dealSizeBand, 'deal size band');
  if (!dealSizeBand.ok) return dealSizeBand;

  const str = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s || null;
  };

  const callDate = str(payload.callDate);
  if (callDate && !/^\d{4}-\d{2}-\d{2}$/.test(callDate)) {
    return { ok: false, error: 'Call date must be YYYY-MM-DD' };
  }

  return {
    ok: true,
    value: {
      stage: stage.value,
      outcome: outcome.value,
      dealSizeBand: dealSizeBand.value,
      callDate,
      label: str(payload.label),
      notes: str(payload.notes),
    },
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run from `apps/web/`: `npx vitest run lib/call-vault`
Expected: PASS, all cases.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/call-vault/vocabularies.ts apps/web/lib/call-vault/validate.ts \
        apps/web/lib/call-vault/validate.test.ts apps/web/vitest.config.ts
git commit -m "feat(call-vault): intake vocabularies + pure validation with tests"
```

---

### Task 3: Firma recipient lookup

**Files:**
- Modify: `apps/web/lib/firma.ts` (append after `sendSigningRequest`, around line 119)
- Test: `apps/web/lib/contracts/firma.test.ts` (already covered by the vitest include glob)

**Interfaces:**
- Consumes: the module-private `firmaFetch` helper in `lib/firma.ts`.
- Produces: `export interface FirmaRecipient { id: string; email?: string; order?: number }` and `export async function getSigningUserIds(requestId: string): Promise<FirmaRecipient[]>`.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/lib/contracts/firma.test.ts`:

```ts
import { afterEach, vi } from 'vitest';
import { getSigningUserIds } from '@/lib/firma';

describe('getSigningUserIds', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubFetch(body: unknown, ok = true) {
    vi.stubEnv('FIRMA_ENV', 'test');
    vi.stubEnv('FIRMA_API_KEY_TEST', 'firma_test_key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('returns recipients ordered by signing order', async () => {
    stubFetch({
      results: [
        { id: 'rec-2', email: 'b@x.com', order: 2 },
        { id: 'rec-1', email: 'a@x.com', order: 1 },
      ],
    });
    const out = await getSigningUserIds('req-123');
    expect(out.map((r) => r.id)).toEqual(['rec-1', 'rec-2']);
  });

  it('tolerates a bare array response', async () => {
    stubFetch([{ id: 'rec-1' }]);
    const out = await getSigningUserIds('req-123');
    expect(out).toEqual([{ id: 'rec-1', email: undefined, order: undefined }]);
  });

  it('tolerates objects carrying only an id — order and email are unconfirmed in the docs', async () => {
    stubFetch({ results: [{ id: 'only-id' }] });
    const out = await getSigningUserIds('req-123');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('only-id');
  });

  it('drops entries with no id rather than returning undefined ids', async () => {
    stubFetch({ results: [{ email: 'ghost@x.com' }, { id: 'real' }] });
    const out = await getSigningUserIds('req-123');
    expect(out.map((r) => r.id)).toEqual(['real']);
  });

  it('calls the /users endpoint for the request', async () => {
    const fetchMock = stubFetch({ results: [{ id: 'rec-1' }] });
    await getSigningUserIds('req-abc');
    expect(fetchMock.mock.calls[0][0]).toContain('/signing-requests/req-abc/users');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web/`: `npx vitest run lib/contracts/firma.test.ts`
Expected: FAIL — `getSigningUserIds` is not exported.

- [ ] **Step 3: Implement**

Append to `apps/web/lib/firma.ts`:

```ts
export interface FirmaRecipient {
  id: string;
  email?: string;
  order?: number;
}

/**
 * List a signing request's recipients so an embedded signing URL can be built:
 * `https://app.firma.dev/signing/<id>`.
 *
 * Only the `id` field is confirmed by the docs; `order` and `email` may be
 * absent, so callers must match defensively (order first, then email) exactly
 * as createSigningRequest does. Results are sorted by order when present so
 * `[0]` is the first signer for single-signer envelopes.
 *
 * No `/send` is required before these ids resolve — that is what lets an
 * embedded flow avoid sending an envelope by email at all.
 */
export async function getSigningUserIds(requestId: string): Promise<FirmaRecipient[]> {
  const res = await firmaFetch(`/signing-requests/${requestId}/users`);
  const body = await res.json();
  const rows: Array<Record<string, unknown>> = Array.isArray(body)
    ? body
    : (body?.results ?? body?.users ?? body?.recipients ?? []);

  return rows
    .filter((r) => typeof r?.id === 'string' && r.id)
    .map((r) => ({
      id: r.id as string,
      email: typeof r.email === 'string' ? r.email : undefined,
      order: typeof r.order === 'number' ? r.order : undefined,
    }))
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

/** Build the embedded signing URL for a recipient id. */
export function embeddedSigningUrl(signingUserId: string): string {
  return `https://app.firma.dev/signing/${signingUserId}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `apps/web/`: `npx vitest run lib/contracts/firma.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/firma.ts apps/web/lib/contracts/firma.test.ts
git commit -m "feat(firma): list signing-request recipients for embedded signing"
```

---

### Task 4: Embedded-sign contract generation

**Files:**
- Modify: `apps/web/lib/contracts/service.ts` (append after `generateAndSend`)
- Create: `apps/web/lib/contracts/embedded-sign.test.ts`

**Interfaces:**
- Consumes: `getSigningUserIds`, `embeddedSigningUrl`, `createSigningRequest` (Task 3 and existing `lib/firma.ts`); `combineMergedHtml`, `renderContractPdf` (existing).
- Produces: `export async function generateForEmbeddedSign(contractId: string): Promise<{ requestId: string; signingUserId: string; signingUrl: string }>`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/contracts/embedded-sign.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendSigningRequest = vi.fn();
const createSigningRequest = vi.fn();
const getSigningUserIds = vi.fn();

vi.mock('@/lib/firma', () => ({
  createSigningRequest: (...a: unknown[]) => createSigningRequest(...a),
  sendSigningRequest: (...a: unknown[]) => sendSigningRequest(...a),
  getSigningUserIds: (...a: unknown[]) => getSigningUserIds(...a),
  embeddedSigningUrl: (id: string) => `https://app.firma.dev/signing/${id}`,
  getRequest: vi.fn(),
  shouldApplyStatus: vi.fn(),
}));

vi.mock('@/lib/contracts/contract-pdf', () => ({
  renderContractPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

vi.mock('@/lib/contracts/template-engine', () => ({
  combineMergedHtml: vi.fn().mockReturnValue('<p>NDA body {{sig_client}}</p>'),
}));

// Minimal chainable Supabase stub. Each `from()` call returns a builder whose
// terminal method resolves the queued result for that table.
const claimed = {
  id: 'c1', template_id: 't1', sow_template_id: null, title: 'NDA',
  field_values: {}, sow_html: '', firma_request_id: null,
};
const updateSpy = vi.fn();
const uploadSpy = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain; builder.eq = chain; builder.order = chain;
      builder.insert = chain; builder.update = (patch: unknown) => { updateSpy(table, patch); return builder; };
      builder.maybeSingle = async () => ({ data: table === 'contracts' ? claimed : null });
      builder.single = async () => ({
        data: table === 'contract_templates' ? { body_html: '<p>NDA</p>' } : null,
      });
      builder.then = undefined;
      if (table === 'contract_signers') {
        builder.select = () => ({
          eq: () => ({ order: async () => ({ data: [
            { role: 'client', name: 'Dana Reed', email: 'dana@example.com', sign_order: 1 },
          ] }) }),
        });
      }
      return builder;
    },
    storage: { from: () => ({ upload: uploadSpy }) },
  }),
}));

import { generateForEmbeddedSign } from '@/lib/contracts/service';

describe('generateForEmbeddedSign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSigningRequest.mockResolvedValue({ requestId: 'req-1', signerIds: { client: 'sig-1' } });
    getSigningUserIds.mockResolvedValue([{ id: 'rec-1', order: 1 }]);
  });

  it('NEVER sends the envelope — sending would email the signer and spend a credit', async () => {
    await generateForEmbeddedSign('c1');
    expect(sendSigningRequest).not.toHaveBeenCalled();
  });

  it('creates the envelope and returns the embedded signing URL', async () => {
    const out = await generateForEmbeddedSign('c1');
    expect(createSigningRequest).toHaveBeenCalledOnce();
    expect(out.requestId).toBe('req-1');
    expect(out.signingUserId).toBe('rec-1');
    expect(out.signingUrl).toBe('https://app.firma.dev/signing/rec-1');
  });

  it('persists the firma request id before returning, so a crash stays correlatable', async () => {
    await generateForEmbeddedSign('c1');
    const persisted = updateSpy.mock.calls.find(
      ([table, patch]) => table === 'contracts' && (patch as Record<string, unknown>).firma_request_id === 'req-1',
    );
    expect(persisted).toBeTruthy();
  });

  it('throws when Firma returns no recipients', async () => {
    getSigningUserIds.mockResolvedValue([]);
    await expect(generateForEmbeddedSign('c1')).rejects.toThrow(/recipient/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web/`: `npx vitest run lib/contracts/embedded-sign.test.ts`
Expected: FAIL — `generateForEmbeddedSign` is not exported.

- [ ] **Step 3: Implement**

Add the import of the new helpers at the top of `apps/web/lib/contracts/service.ts` (extend the existing `@/lib/firma` import) and append:

```ts
/**
 * Generate the PDF, create a Firma envelope, and return a URL the signer can be
 * shown in an iframe — WITHOUT sending it.
 *
 * This is the Call Vault path. `sendSigningRequest` is deliberately never
 * called: sending would email an envelope and spend a credit, and the entire
 * point of the flow is that the contributor signs inline without waiting.
 *
 * Mirrors generateAndSend's safety properties: an atomic draft->sending claim so
 * concurrent callers can't create two envelopes, and the Firma request id
 * persisted before we return so a crash leaves a correlatable id.
 */
export async function generateForEmbeddedSign(
  contractId: string,
): Promise<{ requestId: string; signingUserId: string; signingUrl: string }> {
  const db = getSupabaseServerClient();

  const { data: claimed } = await db
    .from('contracts')
    .update({ status: 'sending', last_error: null, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('status', 'draft')
    .select('id, template_id, sow_template_id, title, field_values, sow_html, firma_request_id')
    .maybeSingle();
  if (!claimed) throw new Error('contract is not in draft — cannot generate for embedded signing');

  try {
    let requestId = claimed.firma_request_id as string | null;

    if (!requestId) {
      const { data: template } = await db
        .from('contract_templates').select('body_html').eq('id', claimed.template_id).single();
      if (!template) throw new Error('template not found');

      const { data: signers } = await db
        .from('contract_signers').select('*').eq('contract_id', contractId).order('sign_order');
      if (!signers?.length) throw new Error('no signers');

      const mergedHtml = combineMergedHtml(template.body_html, null, claimed.field_values, claimed.sow_html);
      const pdf = await renderContractPdf(mergedHtml);

      const up = await db.storage.from(BUCKET).upload(`${contractId}/contract.pdf`, pdf, {
        contentType: 'application/pdf', upsert: true,
      });
      if (up.error) throw new Error(`pdf upload failed: ${up.error.message}`);

      const firmaSigners: FirmaSigner[] = signers.map((s) => ({
        role: s.role as 'client' | 'counter', name: s.name, email: s.email, order: s.sign_order,
      }));

      const created = await createSigningRequest(
        pdf, firmaSigners, claimed.title,
        { initials: mergedHtml.includes('{{init_') },
      );
      requestId = created.requestId;

      // Persist BEFORE returning — a crash after this point is recoverable.
      await db.from('contracts').update({
        merged_html: mergedHtml,
        pdf_path: `${contractId}/contract.pdf`,
        firma_request_id: requestId,
        status: 'sent',
        updated_at: new Date().toISOString(),
      }).eq('id', contractId);
    }

    const recipients = await getSigningUserIds(requestId!);
    const first = recipients[0];
    if (!first) throw new Error('Firma returned no recipient for the signing request');

    return {
      requestId: requestId!,
      signingUserId: first.id,
      signingUrl: embeddedSigningUrl(first.id),
    };
  } catch (err) {
    await db.from('contracts').update({
      status: 'draft',
      last_error: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    throw err;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `apps/web/`: `npx vitest run lib/contracts/embedded-sign.test.ts`
Expected: PASS, all four cases. The first case is the one that matters most.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/contracts/service.ts apps/web/lib/contracts/embedded-sign.test.ts
git commit -m "feat(contracts): generateForEmbeddedSign — envelope without send"
```

---

### Task 5: NDA template module and seed script

**Files:**
- Create: `apps/web/lib/call-vault/nda-template.ts`
- Create: `apps/web/lib/call-vault/nda-template.test.ts`
- Create: `scripts/seed-call-vault-nda.ts`
- Read: `docs/call-review-nda-massachusetts.md` (the source document)

**Interfaces:**
- Consumes: nothing.
- Produces: `CALL_VAULT_NDA_SLUG`, `CALL_VAULT_NDA_NAME`, `CALL_VAULT_NDA_HTML`, `CALL_VAULT_NDA_VARIABLES`.

**Conversion rules.** This task transcribes an existing legal document. Read
`docs/call-review-nda-massachusetts.md` in full and convert it to HTML verbatim, with
exactly these transformations and no others. Write no original legal language:

| Markdown | HTML |
|---|---|
| `# TITLE` | `<h1>` |
| `### (subtitle)` | `<h3>` |
| `## N. Heading` | `<h2>` |
| paragraph | `<p>` |
| `**bold**` | `<strong>` |
| lettered items `(a) … (b) …` | separate `<p>` each |
| `---` | omit |

`packages/pdf/contract-report.tsx` handles `h1–h4, p, ul, ol, div` **only**. There is no `<table>` branch, so a table renders as nothing — this is why the signature block below is a div.

Three content edits to the source text:

1. **Party clause.** `**[CLIENT LEGAL NAME]**, a [state] [entity type], with an address at [address] ("Client"); and` becomes:
   `<p><strong>{{client_legal_name}}</strong>, with an address at {{client_address}} (&ldquo;Client&rdquo;); and</p>`
2. **Effective date.** `as of **[DATE]**` becomes `as of <strong>{{effective_date}}</strong>`.
3. **Typo.** `thirty (30)days` becomes `thirty (30) days`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/call-vault/nda-template.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CALL_VAULT_NDA_HTML, CALL_VAULT_NDA_VARIABLES, CALL_VAULT_NDA_SLUG } from '@/lib/call-vault/nda-template';

function merge(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (m, key) =>
    key.startsWith('sig_') || key.startsWith('date_') || key.startsWith('init_') ? m : values[key] ?? m);
}

const VALUES = {
  client_legal_name: 'Reed Media LLC',
  client_address: '12 Main St, Boston, MA 02116',
  effective_date: 'September 3, 2026',
};

describe('Call Vault NDA template', () => {
  it('has a stable slug', () => {
    expect(CALL_VAULT_NDA_SLUG).toBe('call-vault-nda');
  });

  it('declares exactly the variables it uses', () => {
    const keys = CALL_VAULT_NDA_VARIABLES.map((v) => v.key).sort();
    expect(keys).toEqual(['client_address', 'client_legal_name', 'effective_date']);
  });

  it('leaves no source placeholders behind', () => {
    for (const p of ['[DATE]', '[CLIENT LEGAL NAME]', '[state]', '[entity type]', '[address]']) {
      expect(CALL_VAULT_NDA_HTML).not.toContain(p);
    }
  });

  it('fully merges — no unreplaced {{...}} except Firma anchors', () => {
    const merged = merge(CALL_VAULT_NDA_HTML, VALUES);
    const leftover = merged.match(/\{\{(\w+)\}\}/g) ?? [];
    expect(leftover.sort()).toEqual(['{{date_client}}', '{{sig_client}}']);
  });

  it('carries the client signature anchors and NO counter anchors — KLRY is pre-signed', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('{{sig_client}}');
    expect(CALL_VAULT_NDA_HTML).toContain('{{date_client}}');
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{sig_counter}}');
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{date_counter}}');
  });

  it('requests no per-page initials (drives useInitials=false in the service)', () => {
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{init_');
  });

  it('uses no <table> — the PDF renderer has no table branch and would drop it', () => {
    expect(CALL_VAULT_NDA_HTML.toLowerCase()).not.toContain('<table');
  });

  it('pre-executes the KLRY signature block as typed text', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Tim Kilroy');
    expect(CALL_VAULT_NDA_HTML).toContain('KLRY LLC');
  });

  it('fixes the source typo', () => {
    expect(CALL_VAULT_NDA_HTML).not.toContain('(30)days');
    expect(CALL_VAULT_NDA_HTML).toContain('(30) days');
  });

  it('keeps the anonymized-data license — it is what authorizes aggregate analysis', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Anonymized Data');
    expect(CALL_VAULT_NDA_HTML).toMatch(/perpetual, irrevocable, worldwide, royalty-free/);
  });

  it('keeps Massachusetts governing law and Middlesex County venue', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Commonwealth of Massachusetts');
    expect(CALL_VAULT_NDA_HTML).toContain('Middlesex County');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web/`: `npx vitest run lib/call-vault/nda-template.test.ts`
Expected: FAIL — cannot resolve `@/lib/call-vault/nda-template`.

- [ ] **Step 3: Write the template module**

Create `apps/web/lib/call-vault/nda-template.ts`. Transcribe the full source document per the conversion rules and three edits above. Structure:

```ts
// Call Vault NDA. Source of truth: docs/call-review-nda-massachusetts.md.
//
// KLRY's side is PRE-EXECUTED (typed signature) so the envelope has exactly one
// signer and the document is fully executed the instant the contributor signs —
// no countersignature, no waiting. Only {{sig_client}} / {{date_client}} are
// Firma anchors.
//
// No <table>: packages/pdf/contract-report.tsx handles h1-h4, p, ul, ol, div
// only, so a table silently renders as nothing.

export const CALL_VAULT_NDA_SLUG = 'call-vault-nda';
export const CALL_VAULT_NDA_NAME = 'Confidentiality and Data Use Agreement (Call Recordings and Transcripts)';

export const CALL_VAULT_NDA_VARIABLES = [
  { key: 'client_legal_name', label: 'Client legal entity name', required: true },
  { key: 'client_address',    label: 'Client business address',  required: true },
  { key: 'effective_date',    label: 'Effective date',           required: true },
];

export const CALL_VAULT_NDA_HTML = `
<h1>Confidentiality and Data Use Agreement</h1>
<h3>(Call Recordings and Transcripts)</h3>

<p>This Confidentiality and Data Use Agreement (this &ldquo;Agreement&rdquo;) is entered into as of <strong>{{effective_date}}</strong> (the &ldquo;Effective Date&rdquo;) by and between:</p>

<p><strong>{{client_legal_name}}</strong>, with an address at {{client_address}} (&ldquo;Client&rdquo;); and</p>

<p><strong>KLRY LLC</strong>, a Delaware Limited Liability Corporation, with an address at 139 Pleasant Street, Arlington, MA 02476 (&ldquo;Consultant&rdquo;).</p>

<h2>1. Purpose and Scope</h2>

<!-- Sections 1 through 13 continue here. This is a MECHANICAL transcription of
     docs/call-review-nda-massachusetts.md: open that file, convert each block
     per the rules table above, and change nothing else. Do not paraphrase,
     summarise, reorder, or draft any legal language of your own — the wording
     is a lawyer's and must survive byte-for-byte apart from the three listed
     edits. The tests in Step 1 fail if a section is dropped (missing s5
     licence text, missing Massachusetts / Middlesex venue) or if any source
     placeholder survives. -->

<div class="sig-block">
  <p><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Agreement as of the Effective Date.</p>
  <p><strong>For {{client_legal_name}}</strong><br/>
     Signature: {{sig_client}}<br/>
     Name: ____________________<br/>
     Title: ____________________<br/>
     Date: {{date_client}}</p>
  <p><strong>For KLRY LLC</strong><br/>
     Signature: <em>Tim Kilroy</em><br/>
     Name: Tim Kilroy<br/>
     Title: CEO<br/>
     Date: {{effective_date}}</p>
</div>
`;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `apps/web/`: `npx vitest run lib/call-vault/nda-template.test.ts`
Expected: PASS. The "no unreplaced `{{...}}`" and "no `[BRACKET]`" cases catch an incomplete transcription.

- [ ] **Step 5: Write the seed script**

Create `scripts/seed-call-vault-nda.ts`:

```ts
// Seeds the Call Vault NDA as a contract_templates row.
//   npx tsx scripts/seed-call-vault-nda.ts
// Idempotent — upserts on `slug`. Requires NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the env (e.g. from .env.local).

import { createClient } from '@supabase/supabase-js';
import {
  CALL_VAULT_NDA_SLUG, CALL_VAULT_NDA_NAME, CALL_VAULT_NDA_HTML, CALL_VAULT_NDA_VARIABLES,
} from '../apps/web/lib/call-vault/nda-template';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { error } = await db.from('contract_templates').upsert({
    slug: CALL_VAULT_NDA_SLUG,
    name: CALL_VAULT_NDA_NAME,
    body_html: CALL_VAULT_NDA_HTML,
    variables: CALL_VAULT_NDA_VARIABLES,
    signer_config: { roles: [{ role: 'client', label: 'Client', order: 1 }] },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slug' });

  if (error) throw new Error(`seed failed: ${error.message}`);
  console.log(`Seeded contract template: ${CALL_VAULT_NDA_SLUG}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 6: Run the seed and verify**

```bash
npx tsx scripts/seed-call-vault-nda.ts
```
Then confirm in Supabase: `select slug, name, is_active from contract_templates where slug = 'call-vault-nda';`

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/call-vault/nda-template.ts apps/web/lib/call-vault/nda-template.test.ts \
        scripts/seed-call-vault-nda.ts
git commit -m "feat(call-vault): NDA template, pre-signed by KLRY, with merge tests"
```

---

### Task 6: Data access layer

**Files:**
- Create: `apps/web/lib/call-vault/db.ts`

**Interfaces:**
- Consumes: `validateAboutYou`, `ownsStoragePath`, `MAX_*` limits (Task 2); `getSupabaseServerClient` from `@/lib/supabase-server`.
- Produces:
  - `startContributor(input: AboutYou & { ip: string | null }): Promise<{ contributorId: string; sessionToken: string }>`
  - `resolveSession(sessionToken: string): Promise<ContributorRow | null>`
  - `createCall(contributorId: string, meta: CallMeta): Promise<string>`
  - `signUpload(contributorId: string, callId: string, fileName: string): Promise<{ storagePath: string; uploadUrl: string; token: string }>`
  - `commitFile(input: { contributorId, callId, storagePath, kind, fileName, mimeType, sizeBytes }): Promise<string>`
  - `countCalls(contributorId: string): Promise<number>`
  - `countRecentByIp(ip: string, sinceIso: string): Promise<number>`
  - `countFiles(callId: string): Promise<number>`
  - `attachNda(contributorId: string, contractId: string): Promise<void>`
  - `markNdaSigned(contributorId: string): Promise<void>`
  - `markSubmitted(contributorId: string): Promise<{ email: string; name: string; agencyName: string | null; callCount: number; ndaSigned: boolean }>`
  - `CALL_VAULT_BUCKET = 'call-vault'`

- [ ] **Step 1: Write the module**

Create `apps/web/lib/call-vault/db.ts`:

```ts
// Thin data-access layer for Call Vault. All decision logic lives in
// ./validate.ts so it can be unit tested; this file only talks to Supabase.

import { randomBytes, randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { AboutYou, CallMeta } from './validate';
import { ownsStoragePath, isSessionExpired } from './validate';

export const CALL_VAULT_BUCKET = 'call-vault';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface ContributorRow {
  id: string;
  name: string;
  email: string;
  agency_name: string | null;
  agency_url: string | null;
  services: string[];
  revenue_band: string | null;
  target_client: string | null;
  nda_contract_id: string | null;
  nda_signed_at: string | null;
  client_legal_name: string | null;
  client_address: string | null;
  status: string;
}

const CONTRIBUTOR_COLUMNS =
  'id, name, email, agency_name, agency_url, services, revenue_band, target_client, ' +
  'nda_contract_id, nda_signed_at, client_legal_name, client_address, status';

function mintSessionToken() {
  return {
    session_token: randomBytes(32).toString('hex'),
    session_token_expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

/**
 * Create or refresh a contributor from the "About you" step, and mint a session
 * token for this sitting. Upserts on email so a returning contributor attaches
 * new calls to their existing row rather than creating a duplicate.
 */
export async function startContributor(
  input: AboutYou & { ip: string | null },
): Promise<{ contributorId: string; sessionToken: string }> {
  const db = getSupabaseServerClient();
  const session = mintSessionToken();

  const { data, error } = await db
    .from('call_vault_contributors')
    .upsert({
      name: input.name,
      email: input.email,
      agency_name: input.agencyName,
      agency_url: input.agencyUrl,
      services: input.services,
      revenue_band: input.revenueBand,
      target_client: input.targetClient,
      terms_accepted_at: new Date().toISOString(),
      ip: input.ip,
      ...session,
    }, { onConflict: 'email' })
    .select('id')
    .single();

  if (error || !data) throw new Error(`startContributor failed: ${error?.message}`);
  return { contributorId: data.id, sessionToken: session.session_token };
}

/** Resolve an anonymous session token to its contributor, or null if invalid/expired. */
export async function resolveSession(sessionToken: string): Promise<ContributorRow | null> {
  if (!sessionToken) return null;
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('call_vault_contributors')
    .select(`${CONTRIBUTOR_COLUMNS}, session_token_expires_at`)
    .eq('session_token', sessionToken)
    .maybeSingle();
  if (!data) return null;
  // Expiry is decided here rather than in SQL so it is unit-testable and fails
  // closed on a null or malformed timestamp.
  if (isSessionExpired(data.session_token_expires_at)) return null;
  return data as ContributorRow;
}

export async function countCalls(contributorId: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_calls')
    .select('id', { count: 'exact', head: true })
    .eq('contributor_id', contributorId);
  return count ?? 0;
}

/** Abuse control: how many contributors this IP has created since `sinceIso`. */
export async function countRecentByIp(ip: string, sinceIso: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_contributors')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', sinceIso);
  return count ?? 0;
}

export async function countFiles(callId: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_files')
    .select('id', { count: 'exact', head: true })
    .eq('call_id', callId);
  return count ?? 0;
}

export async function createCall(contributorId: string, meta: CallMeta): Promise<string> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_calls')
    .insert({
      contributor_id: contributorId,
      stage: meta.stage,
      outcome: meta.outcome,
      deal_size_band: meta.dealSizeBand,
      call_date: meta.callDate,
      label: meta.label,
      notes: meta.notes,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createCall failed: ${error?.message}`);
  return data.id;
}

/** Verify the call belongs to this contributor before issuing an upload URL. */
export async function callBelongsTo(callId: string, contributorId: string): Promise<boolean> {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('call_vault_calls').select('id')
    .eq('id', callId).eq('contributor_id', contributorId).maybeSingle();
  return !!data;
}

/**
 * Issue a direct-to-storage upload URL. The path is always rooted at the
 * contributor's uuid so ownership is checkable on commit and on download.
 */
export async function signUpload(
  contributorId: string, callId: string, fileName: string,
): Promise<{ storagePath: string; uploadUrl: string; token: string }> {
  const db = getSupabaseServerClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${contributorId}/${callId}/${randomUUID()}-${safeName}`;
  const { data, error } = await db.storage.from(CALL_VAULT_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) throw new Error(`signUpload failed: ${error?.message}`);
  return { storagePath, uploadUrl: data.signedUrl, token: data.token };
}

export async function commitFile(input: {
  contributorId: string; callId: string; storagePath: string;
  kind: string; fileName: string; mimeType: string | null; sizeBytes: number | null;
}): Promise<string> {
  if (!ownsStoragePath(input.storagePath, input.contributorId)) {
    throw new Error('storagePath does not belong to this contributor');
  }
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_files')
    .insert({
      call_id: input.callId,
      storage_path: input.storagePath,
      kind: input.kind,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`commitFile failed: ${error?.message}`);
  return data.id;
}

export async function attachNda(contributorId: string, contractId: string): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ nda_contract_id: contractId }).eq('id', contributorId);
}

export async function saveNdaParty(
  contributorId: string, legalName: string, address: string,
): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ client_legal_name: legalName, client_address: address })
    .eq('id', contributorId);
}

export async function markNdaSigned(contributorId: string): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ nda_signed_at: new Date().toISOString() }).eq('id', contributorId);
}

export async function markSubmitted(contributorId: string): Promise<{
  email: string; name: string; agencyName: string | null; callCount: number; ndaSigned: boolean;
}> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_contributors')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', contributorId)
    .select('email, name, agency_name, nda_signed_at')
    .single();
  if (error || !data) throw new Error(`markSubmitted failed: ${error?.message}`);

  return {
    email: data.email,
    name: data.name,
    agencyName: data.agency_name,
    callCount: await countCalls(contributorId),
    ndaSigned: !!data.nda_signed_at,
  };
}
```

- [ ] **Step 2: Type-check**

Run from `apps/web/`: `npx tsc --noEmit`
Expected: no errors from `lib/call-vault/db.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/call-vault/db.ts
git commit -m "feat(call-vault): data access layer"
```

---

### Task 7: Loops, Beehiiv, and lead fan-out

**Files:**
- Modify: `apps/web/lib/loops.ts` (append near the other `on*` events)
- Modify: `apps/web/lib/beehiiv.ts` (append near the other `add*Subscriber` helpers)
- Create: `apps/web/lib/call-vault/lead.ts`

**Interfaces:**
- Consumes: `sendEvent`, `createOrUpdateContact` (existing `lib/loops.ts`); `addSubscriber` (existing `lib/beehiiv.ts`); `copperSyncLead`, `COPPER_STAGES` (existing `lib/copper.ts`); `alertReportGenerated` (existing `lib/slack.ts`).
- Produces:
  - `onCallVaultSubmitted(args: { email; firstName; agencyName; callCount; ndaSigned; resumeUrl }): Promise<{ success: boolean; error?: string }>`
  - `addCallVaultSubscriber(email: string, agencyName?: string, firstName?: string)`
  - `captureCallVaultLead(params: { contributorId; email; name; agencyName; callCount; ndaSigned; resumeUrl }): Promise<void>`

- [ ] **Step 1: Add the Loops event**

Append to `apps/web/lib/loops.ts`:

```ts
/**
 * Fire when a Call Vault contributor submits their calls.
 *
 * The Loops automation for `call_vault_submitted` is built in the Loops
 * dashboard — firing this event does not by itself send mail. The thank-you
 * email should carry `bookingUrl` (review call) and `resumeUrl` (add more calls).
 */
export async function onCallVaultSubmitted(args: {
  email: string;
  firstName: string;
  agencyName?: string;
  callCount: number;
  ndaSigned: boolean;
  resumeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const bookingUrl =
    process.env.NEXT_PUBLIC_CALL_VAULT_BOOKING_URL || 'https://meet.timkilroy.com/sales-call-survey';

  await createOrUpdateContact({
    email: args.email,
    firstName: args.firstName || undefined,
    source: 'call_vault',
    subscribed: true,
    userGroup: 'call_vault_contributor',
    companyName: args.agencyName,
  });

  return sendEvent({
    email: args.email,
    eventName: 'call_vault_submitted',
    eventProperties: {
      firstName: args.firstName || '',
      agencyName: args.agencyName || '',
      callCount: args.callCount,
      ndaSigned: args.ndaSigned,
      bookingUrl,
      resumeUrl: args.resumeUrl,
    },
  });
}
```

- [ ] **Step 2: Add the Beehiiv subscriber helper**

Append to `apps/web/lib/beehiiv.ts`, matching the shape of the neighbouring `add*Subscriber` functions:

```ts
/** Add a Call Vault contributor to Agency Inner Circle. */
export async function addCallVaultSubscriber(
  email: string,
  agencyName?: string,
  firstName?: string,
) {
  return addSubscriber({
    email,
    first_name: firstName,
    utm_source: 'call_vault',
    utm_medium: 'product',
    utm_campaign: 'call_vault_contribution',
    custom_fields: agencyName ? [{ name: 'company_name', value: agencyName }] : undefined,
  });
}
```

- [ ] **Step 3: Write the fan-out module**

Create `apps/web/lib/call-vault/lead.ts`:

```ts
import { waitUntil } from '@vercel/functions';
import { onCallVaultSubmitted } from '@/lib/loops';
import { addCallVaultSubscriber } from '@/lib/beehiiv';
import { copperSyncLead, COPPER_STAGES } from '@/lib/copper';
import { alertReportGenerated } from '@/lib/slack';

/**
 * Fan out a completed Call Vault submission.
 *
 * Every leg is individually caught and wrapped in waitUntil: a Loops, Beehiiv,
 * Copper, or Slack hiccup must never fail a contributor's submission. They did
 * us a favour; the worst outcome is losing their upload to a third-party blip.
 * Mirrors lib/wah-wah/lead.ts.
 */
export async function captureCallVaultLead(params: {
  contributorId: string;
  email: string;
  name: string;
  agencyName: string | null;
  callCount: number;
  ndaSigned: boolean;
  resumeUrl: string;
}): Promise<void> {
  const { email, name, agencyName, callCount, ndaSigned, resumeUrl } = params;
  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  waitUntil(
    addCallVaultSubscriber(email, agencyName || undefined, firstName || undefined).catch((err) =>
      console.error('[call-vault] beehiiv subscribe failed:', err),
    ),
  );

  waitUntil(
    copperSyncLead({
      email,
      name: name || undefined,
      companyName: agencyName || undefined,
      productName: 'Call Vault',
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note:
        `Contributed ${callCount} call(s) to the Call Vault. NDA: ${ndaSigned ? 'signed' : 'skipped'}. ` +
        `Review: ${appUrl}/admin/call-vault/${params.contributorId}`,
    }).catch((err) => console.error('[call-vault] copper sync failed:', err)),
  );

  alertReportGenerated(name ? `${name} (${email})` : email, 'call-vault', agencyName || '—');

  waitUntil(
    onCallVaultSubmitted({
      email, firstName, agencyName: agencyName || undefined, callCount, ndaSigned, resumeUrl,
    }).catch((err) => console.error('[call-vault] loops event failed:', err)),
  );
}
```

- [ ] **Step 4: Type-check**

Run from `apps/web/`: `npx tsc --noEmit`
Expected: no errors. If `copperSyncLead` or `alertReportGenerated` signatures differ, match the call sites in `apps/web/lib/wah-wah/lead.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/loops.ts apps/web/lib/beehiiv.ts apps/web/lib/call-vault/lead.ts
git commit -m "feat(call-vault): Loops event, AIC subscribe, non-blocking fan-out"
```

---

### Task 8: Intake API routes — start, calls, files

**Files:**
- Create: `apps/web/app/api/call-vault/start/route.ts`
- Create: `apps/web/app/api/call-vault/calls/route.ts`
- Create: `apps/web/app/api/call-vault/files/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 and 6.
- Produces: HTTP contracts consumed by the UI in Task 10.
  - `POST /api/call-vault/start` → `{ contributorId, sessionToken }`
  - `POST /api/call-vault/calls` → `{ callId }`
  - `POST /api/call-vault/files` mode `sign` → `{ storagePath, uploadUrl, token }`; mode `commit` → `{ fileId }`

Every route after `start` reads the session token from the `x-call-vault-session` header.

- [ ] **Step 1: Write the start route**

```ts
// apps/web/app/api/call-vault/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAboutYou } from '@/lib/call-vault/validate';
import { startContributor, countRecentByIp } from '@/lib/call-vault/db';

// Public unauthenticated endpoint. Generous enough that a household or office
// behind one NAT is never blocked, tight enough that a script cannot seed
// hundreds of rows and burn signed upload URLs.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_IP = 5;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = validateAboutYou(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null;

  try {
    if (ip) {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      if ((await countRecentByIp(ip, since)) >= RATE_MAX_PER_IP) {
        return NextResponse.json(
          { error: 'Too many submissions from this network. Try again later.' },
          { status: 429 },
        );
      }
    }

    const { contributorId, sessionToken } = await startContributor({ ...parsed.value, ip });
    return NextResponse.json({ contributorId, sessionToken });
  } catch (err) {
    console.error('[call-vault] start failed:', err);
    return NextResponse.json({ error: 'Could not start your submission' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write a shared session helper**

Create `apps/web/lib/call-vault/session.ts`:

```ts
import type { NextRequest } from 'next/server';
import { resolveSession, type ContributorRow } from './db';

export const SESSION_HEADER = 'x-call-vault-session';

/** Resolve the anonymous session header to a contributor, or null. */
export async function contributorFromRequest(
  request: NextRequest,
): Promise<ContributorRow | null> {
  return resolveSession(request.headers.get(SESSION_HEADER) || '');
}
```

- [ ] **Step 3: Write the calls route**

```ts
// apps/web/app/api/call-vault/calls/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateCallMeta, MAX_CALLS_PER_CONTRIBUTOR } from '@/lib/call-vault/validate';
import { createCall, countCalls } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = validateCallMeta(body ?? {});
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if ((await countCalls(contributor.id)) >= MAX_CALLS_PER_CONTRIBUTOR) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_CALLS_PER_CONTRIBUTOR} calls. Reply to the email to send more.` },
      { status: 400 },
    );
  }

  try {
    const callId = await createCall(contributor.id, parsed.value);
    return NextResponse.json({ callId });
  } catch (err) {
    console.error('[call-vault] createCall failed:', err);
    return NextResponse.json({ error: 'Could not add that call' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the files route**

```ts
// apps/web/app/api/call-vault/files/route.ts
//
// Two modes, mirroring api/client/documents/route.ts:
//   { mode: 'sign',   callId, fileName, mimeType, sizeBytes } -> upload URL
//   { mode: 'commit', callId, storagePath, fileName, mimeType, sizeBytes } -> row
// The browser PUTs directly to Supabase Storage between the two, so a 200MB
// recording never passes through a Vercel function.
import { NextRequest, NextResponse } from 'next/server';
import { classifyFile, MAX_FILE_BYTES, MAX_FILES_PER_CALL } from '@/lib/call-vault/validate';
import { signUpload, commitFile, callBelongsTo, countFiles } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { mode, callId, fileName, mimeType, sizeBytes, storagePath } = body as {
    mode?: string; callId?: string; fileName?: string; mimeType?: string;
    sizeBytes?: number; storagePath?: string;
  };

  if (!callId || !fileName) {
    return NextResponse.json({ error: 'callId and fileName are required' }, { status: 400 });
  }
  if (!(await callBelongsTo(callId, contributor.id))) {
    return NextResponse.json({ error: 'Unknown call' }, { status: 403 });
  }

  const classified = classifyFile(fileName, mimeType || '');
  if (!classified.ok) return NextResponse.json({ error: classified.error }, { status: 400 });

  if (typeof sizeBytes === 'number' && sizeBytes > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 200MB' }, { status: 400 });
  }

  if (mode === 'sign') {
    if ((await countFiles(callId)) >= MAX_FILES_PER_CALL) {
      return NextResponse.json(
        { error: `Up to ${MAX_FILES_PER_CALL} files per call` }, { status: 400 },
      );
    }
    try {
      return NextResponse.json(await signUpload(contributor.id, callId, fileName));
    } catch (err) {
      console.error('[call-vault] signUpload failed:', err);
      return NextResponse.json({ error: 'Could not start that upload' }, { status: 500 });
    }
  }

  if (mode === 'commit') {
    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });
    }
    try {
      const fileId = await commitFile({
        contributorId: contributor.id,
        callId,
        storagePath,
        kind: classified.kind,
        fileName,
        mimeType: mimeType || null,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
      });
      return NextResponse.json({ fileId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'commit failed';
      const status = message.includes('does not belong') ? 403 : 500;
      if (status === 500) console.error('[call-vault] commitFile failed:', err);
      return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Could not save that file' }, { status });
    }
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}
```

- [ ] **Step 5: Type-check and commit**

Run from `apps/web/`: `npx tsc --noEmit`

```bash
git add apps/web/app/api/call-vault/start apps/web/app/api/call-vault/calls \
        apps/web/app/api/call-vault/files apps/web/lib/call-vault/session.ts
git commit -m "feat(call-vault): start, calls, and file upload routes"
```

---

### Task 9: NDA and submit routes

**Files:**
- Create: `apps/web/app/api/call-vault/nda/route.ts`
- Create: `apps/web/app/api/call-vault/nda/confirm/route.ts`
- Create: `apps/web/app/api/call-vault/submit/route.ts`
- Create: `apps/web/app/api/call-vault/resume/route.ts`
- Modify: `apps/web/lib/contracts/service.ts` — widen `CreateContractInput.createdBy` to `string | null`. The Call Vault NDA is created by an anonymous contributor, not an admin, and `contracts.created_by` is already nullable in the schema. Widening the type is honest; casting `null as unknown as string` at the call site is not.

**Interfaces:**
- Consumes: `generateForEmbeddedSign` (Task 4), `CALL_VAULT_NDA_SLUG` (Task 5), Task 6 db helpers, `captureCallVaultLead` (Task 7), `createContract` and `syncStatus` (existing `lib/contracts/service.ts`), `mintAccessToken` (existing `lib/access-tokens.ts`).
- Produces:
  - `POST /api/call-vault/nda` → `{ contractId, signingUrl }`
  - `POST /api/call-vault/nda/confirm` → `{ signed: boolean }`
  - `POST /api/call-vault/submit` → `{ ok: true }`
  - `GET /api/call-vault/resume?token=…` → `{ contributor, sessionToken }`

- [ ] **Step 1: Write the NDA generation route**

```ts
// apps/web/app/api/call-vault/nda/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createContract, generateForEmbeddedSign } from '@/lib/contracts/service';
import { CALL_VAULT_NDA_SLUG, CALL_VAULT_NDA_NAME } from '@/lib/call-vault/nda-template';
import { attachNda, saveNdaParty } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export const maxDuration = 60; // PDF render + Firma round trip

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const { legalName, address } = (await request.json().catch(() => ({}))) as {
    legalName?: string; address?: string;
  };
  const legal = (legalName || '').trim();
  const addr = (address || '').trim();
  if (!legal || !addr) {
    return NextResponse.json(
      { error: 'Legal entity name and business address are required for the NDA' },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseServerClient();
    const { data: template } = await db
      .from('contract_templates').select('id').eq('slug', CALL_VAULT_NDA_SLUG).single();
    if (!template) {
      return NextResponse.json(
        { error: 'NDA template not seeded — run scripts/seed-call-vault-nda.ts' }, { status: 500 },
      );
    }

    await saveNdaParty(contributor.id, legal, addr);

    const effectiveDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const contractId = await createContract({
      templateId: template.id,
      title: `${CALL_VAULT_NDA_NAME} — ${legal}`,
      fieldValues: {
        client_legal_name: legal,
        client_address: addr,
        effective_date: effectiveDate,
      },
      sowHtml: '',
      // One signer: KLRY is pre-executed in the template, so there is no counter role.
      signers: [{ role: 'client', name: contributor.name, email: contributor.email, order: 1 }],
      createdBy: null, // public flow — no admin user; contracts.created_by is nullable
    });

    await attachNda(contributor.id, contractId);

    const { signingUrl } = await generateForEmbeddedSign(contractId);
    return NextResponse.json({ contractId, signingUrl });
  } catch (err) {
    console.error('[call-vault] NDA generation failed:', err);
    return NextResponse.json(
      { error: 'Could not prepare the NDA. You can skip it and still contribute.' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Write the NDA confirm route**

```ts
// apps/web/app/api/call-vault/nda/confirm/route.ts
//
// The iframe's postMessage is a UI signal, not proof. Re-verify against Firma
// before stamping nda_signed_at — a page can post any message it likes.
import { NextRequest, NextResponse } from 'next/server';
import { syncStatus } from '@/lib/contracts/service';
import { markNdaSigned } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  if (!contributor.nda_contract_id) {
    return NextResponse.json({ error: 'No NDA in progress' }, { status: 400 });
  }

  try {
    // syncStatus polls Firma, stores the signed PDF into the contracts bucket
    // (which the admin page links to), and never regresses a richer status a
    // webhook already applied. Note getRequest maps through mapDownloadStatus,
    // which can only ever yield completed/sent/declined/voided — there is no
    // 'signed' value to test for here.
    const status = await syncStatus(contributor.nda_contract_id);
    const signed = status === 'completed';
    if (signed) await markNdaSigned(contributor.id);
    return NextResponse.json({ signed });
  } catch (err) {
    // The webhook is the durable backstop — never block the contributor on this.
    console.error('[call-vault] NDA confirm failed:', err);
    return NextResponse.json({ signed: false });
  }
}
```

- [ ] **Step 3: Write the submit route**

```ts
// apps/web/app/api/call-vault/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markSubmitted, countCalls } from '@/lib/call-vault/db';
import { captureCallVaultLead } from '@/lib/call-vault/lead';
import { contributorFromRequest } from '@/lib/call-vault/session';
import { mintAccessToken } from '@/lib/access-tokens';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  if ((await countCalls(contributor.id)) === 0) {
    return NextResponse.json({ error: 'Add at least one call before submitting' }, { status: 400 });
  }

  try {
    const summary = await markSubmitted(contributor.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const token = await mintAccessToken(contributor.id, { table: 'call_vault_contributors' });
    const resumeUrl = `${appUrl}/call-vault?token=${token}`;

    await captureCallVaultLead({
      contributorId: contributor.id,
      email: summary.email,
      name: summary.name,
      agencyName: summary.agencyName,
      callCount: summary.callCount,
      ndaSigned: summary.ndaSigned,
      resumeUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[call-vault] submit failed:', err);
    return NextResponse.json({ error: 'Could not complete your submission' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the resume route**

```ts
// apps/web/app/api/call-vault/resume/route.ts
//
// Consume the single-use emailed access token and mint a fresh anonymous
// session so the contributor can add more calls without signing the NDA again.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { randomBytes } from 'node:crypto';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getSupabaseServerClient();
  const { data: row } = await db
    .from('call_vault_contributors')
    .select('id, name, email, agency_name, agency_url, services, revenue_band, target_client, nda_signed_at, access_token_expires_at, access_token_used_at')
    .eq('access_token', token)
    .maybeSingle();

  if (!row || row.access_token_used_at || new Date(row.access_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'That link has expired' }, { status: 401 });
  }

  const sessionToken = randomBytes(32).toString('hex');
  await db.from('call_vault_contributors').update({
    access_token_used_at: new Date().toISOString(),
    session_token: sessionToken,
    session_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
  }).eq('id', row.id);

  return NextResponse.json({
    sessionToken,
    contributor: {
      name: row.name, email: row.email, agencyName: row.agency_name,
      agencyUrl: row.agency_url, services: row.services, revenueBand: row.revenue_band,
      targetClient: row.target_client, ndaSigned: !!row.nda_signed_at,
    },
  });
}
```

- [ ] **Step 5: Type-check and commit**

Run from `apps/web/`: `npx tsc --noEmit`

```bash
git add apps/web/app/api/call-vault/nda apps/web/app/api/call-vault/submit \
        apps/web/app/api/call-vault/resume
git commit -m "feat(call-vault): embedded NDA, submit fan-out, and resume routes"
```

---

### Task 10: Public form UI

**Files:**
- Create: `apps/web/app/call-vault/page.tsx`
- Create: `apps/web/app/call-vault/CallVaultForm.tsx`
- Create: `apps/web/app/call-vault/NdaModal.tsx`
- Create: `apps/web/app/call-vault/CallUploader.tsx`

**Interfaces:**
- Consumes: the HTTP contracts from Tasks 8 and 9; `SERVICES`, `REVENUE_BANDS`, `STAGES`, `OUTCOMES`, `DEAL_SIZE_BANDS` (Task 2).
- Produces: nothing consumed by later tasks.

Follow the visual conventions of an existing public tool page (`apps/web/app/wah-wah/` or `apps/web/app/case-study-lab/`) — same Tailwind idiom, spacing, and button treatment. Do not invent a new design language.

- [ ] **Step 1: Write the server page**

```tsx
// apps/web/app/call-vault/page.tsx
import CallVaultForm from './CallVaultForm';

export const metadata = {
  title: 'Contribute a sales call — Tim Kilroy',
  description: 'Share 3-5 sales calls, get an individualized improvement plan and a 30-minute review.',
};

export default async function CallVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <CallVaultForm resumeToken={token ?? null} />;
}
```

- [ ] **Step 2: Write the form shell**

`CallVaultForm.tsx` is a client component holding:

- `phase` state: `'about' | 'calls' | 'done'`
- `sessionToken` state, persisted to `sessionStorage` under `call-vault-session`
- On mount, if `resumeToken` is present: `GET /api/call-vault/resume?token=…`, store the session token and the prefilled contributor, jump to `'calls'`
- **About you** fields: name, email, agency name, agency URL, services (checkbox group from `SERVICES`), revenue band (select from `REVENUE_BANDS`), target client (textarea)
- The **required consent checkbox**, worded exactly:
  > I have the rights and consents necessary to share these calls, and I grant KLRY LLC the right to create and use anonymized, aggregated insights from them.
- Submit "About you" → `POST /api/call-vault/start` → store `sessionToken` → phase `'calls'`
- On the calls phase, an NDA banner: "Want an NDA first? It signs right here — no email, no waiting." → opens `NdaModal`. Skipping is a plain-text button, not a buried link.
- A `CallUploader` per call, plus "Add another call" (disabled at 10)
- Final submit → `POST /api/call-vault/submit` → phase `'done'` with a thank-you naming the review call

All fetches after `start` must send the session header:

```ts
const authed = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
  body: JSON.stringify(body),
});
```

- [ ] **Step 3: Write the NDA modal**

```tsx
// apps/web/app/call-vault/NdaModal.tsx
'use client';

import { useEffect, useState } from 'react';

const FIRMA_ORIGIN = 'https://app.firma.dev';

export default function NdaModal({
  sessionToken, defaultLegalName, onSigned, onClose,
}: {
  sessionToken: string;
  defaultLegalName: string;
  onSigned: () => void;
  onClose: () => void;
}) {
  const [legalName, setLegalName] = useState(defaultLegalName);
  const [address, setAddress] = useState('');
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Firma posts signing.started / completed / declined / error from its own
  // origin. Validate the origin before trusting anything: any page can postMessage.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== FIRMA_ORIGIN) return;
      const type = (event.data as { type?: string })?.type;
      if (type === 'signing.completed') {
        // The postMessage only drives UI — the server re-verifies with Firma.
        fetch('/api/call-vault/nda/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        })
          .then((r) => r.json())
          .then(() => onSigned())
          .catch(() => onSigned()); // webhook is the durable backstop
      } else if (type === 'signing.declined') {
        onClose();
      } else if (type === 'signing.error') {
        setError('Signing failed. You can close this and contribute without an NDA.');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sessionToken, onSigned, onClose]);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/call-vault/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify({ legalName, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not prepare the NDA');
      setSigningUrl(data.signingUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the NDA');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Sign the NDA">
      {!signingUrl ? (
        <form onSubmit={(e) => { e.preventDefault(); prepare(); }}>
          <p>Two details for the agreement, then you can sign right here.</p>
          <label>Legal entity name
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          </label>
          <label>Business address
            <input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Preparing…' : 'Continue to sign'}</button>
          <button type="button" onClick={onClose}>Skip the NDA</button>
        </form>
      ) : (
        <>
          <iframe
            src={signingUrl}
            style={{ width: '100%', height: 900, border: 0 }}
            allow="camera;microphone;clipboard-write"
            title="Sign the confidentiality agreement"
          />
          {error && <p role="alert">{error}</p>}
          <button type="button" onClick={onClose}>Close</button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the call uploader**

`CallUploader.tsx` — one card per call:

- Metadata row: stage, outcome, deal size band (selects from the vocabularies), call date, optional label
- On first file or on metadata change, `POST /api/call-vault/calls` once to obtain a `callId`; hold it in state
- Per file: `POST /api/call-vault/files` mode `sign` → `PUT` the file to `uploadUrl` with `Content-Type: file.type` → `POST` mode `commit`
- Show per-file progress and a retry on failure
- Reject video and unknown extensions client-side with the same message the server returns, and set `accept` on the input to the accepted extension list

- [ ] **Step 5: Verify in the browser**

```bash
npm run dev   # from repo root
```
Walk `http://localhost:3000/call-vault`: fill About you, confirm the row appears in `call_vault_contributors`, add a call with a small `.txt`, confirm rows in `call_vault_calls` and `call_vault_files` and the object in the `call-vault` bucket. Try a `.mp4` and confirm it is rejected. Open the NDA modal and confirm the Firma iframe renders.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/call-vault
git commit -m "feat(call-vault): public contribution form with embedded NDA"
```

---

### Task 11: Admin review UI

**Files:**
- Create: `apps/web/app/admin/call-vault/page.tsx`
- Create: `apps/web/app/admin/call-vault/[id]/page.tsx`
- Create: `apps/web/app/api/admin/call-vault/files/[fileId]/route.ts`

**Interfaces:**
- Consumes: `requireAdminRequest` from `@/lib/contracts/require-admin`; `CALL_VAULT_BUCKET` (Task 6); `labelFor` and the vocabularies (Task 2).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the signed-download route**

```ts
// apps/web/app/api/admin/call-vault/files/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { CALL_VAULT_BUCKET } from '@/lib/call-vault/db';

const TTL_SECONDS = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  if (!(await requireAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { fileId } = await params;

  const db = getSupabaseServerClient();
  const { data: file } = await db
    .from('call_vault_files').select('storage_path').eq('id', fileId).single();
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await db.storage
    .from(CALL_VAULT_BUCKET).createSignedUrl(file.storage_path, TTL_SECONDS);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
```

- [ ] **Step 2: Write the list page**

Server component. Gate on the session admin check the other `/admin` pages use. Query:

```ts
const { data: contributors } = await db
  .from('call_vault_contributors')
  .select('id, name, email, agency_name, revenue_band, nda_signed_at, status, submitted_at, created_at')
  .order('created_at', { ascending: false });
```

Render a table: contributor, agency, revenue band (via `labelFor(REVENUE_BANDS, …)`), call count, NDA (Signed / Skipped), status, submitted date. Each row links to `/admin/call-vault/[id]`.

Fetch call counts in one grouped query rather than per row:

```ts
const { data: calls } = await db.from('call_vault_calls').select('id, contributor_id');
const callCounts = new Map<string, number>();
for (const c of calls ?? []) callCounts.set(c.contributor_id, (callCounts.get(c.contributor_id) ?? 0) + 1);
```

- [ ] **Step 3: Write the detail page**

Server component showing the full profile (services and bands rendered through `labelFor`), then each call with its stage, outcome, deal size, date, label, notes, and its files as links to `/api/admin/call-vault/files/<fileId>`. When `nda_contract_id` is set, link to the signed PDF through the existing `/api/contracts/[id]/file` route.

- [ ] **Step 4: Verify**

Visit `/admin/call-vault` as an admin, confirm the seeded submission from Task 10 appears, open the detail page, and download a file — the link must return the file, and the same URL must stop working after 5 minutes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/call-vault apps/web/app/api/admin/call-vault
git commit -m "feat(call-vault): admin review UI with signed downloads"
```

---

### Task 12: End-to-end verification

**Files:** none created; this is a verification gate.

- [ ] **Step 1: Full suite and type-check**

From `apps/web/`:
```bash
npm test
npx tsc --noEmit
npm run lint
```
Expected: all green. Confirm the output names `lib/call-vault/validate.test.ts`, `lib/call-vault/nda-template.test.ts`, and `lib/contracts/embedded-sign.test.ts` — if any is missing, the `include` array in `vitest.config.ts` was not updated.

- [ ] **Step 2: Full contributor walkthrough against `FIRMA_ENV=test`**

1. Open `/call-vault`, complete About you with the consent checkbox
2. Open the NDA, enter legal name and address, sign in the iframe
3. Confirm `call_vault_contributors.nda_signed_at` is set and `contracts.status` reached `completed`
4. **Confirm no signing email was received** — this is the whole point of the embedded flow
5. Add two calls with metadata; upload a `.txt` to one and an `.mp3` to the other
6. Try a `.mp4` — must be rejected with the "export the audio" message
7. Submit; confirm the Beehiiv subscriber, the Slack alert, and the `call_vault_submitted` row in `loops_events`
8. Open the resume URL from the Loops event properties; confirm it loads prefilled with the NDA already signed, and that reusing the same link is rejected

- [ ] **Step 3: Note the follow-ups**

The Loops automation for `call_vault_submitted` must be built in the Loops dashboard — the app fires the event only. Flip `FIRMA_ENV` to `live` once the walkthrough passes.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(call-vault): end-to-end verification fixes"
```
