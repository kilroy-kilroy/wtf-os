// apps/web/lib/copper-emails.ts
//
// Fetches recently-logged Copper "email" activities for the timeline-sync
// cron. Reuses the exact auth pattern already used elsewhere in this repo
// (lib/copper.ts:7,31-42 and lib/copper-discovery.ts:10-20): the access
// token and acting-user email come from `COPPER_API` / `COPPER_API_EMAIL`
// (NOT `COPPER_API_KEY` / `COPPER_USER_EMAIL` as an earlier draft of this
// task guessed), sent as `X-PW-AccessToken` / `X-PW-UserEmail` /
// `X-PW-Application: developer_api` headers. `getHeaders()` below returns
// null (rather than throwing) when the env vars are missing, mirroring
// lib/copper.ts's `getHeaders()` — the caller decides how to treat "not
// configured".
//
// ASSUMPTIONS — NOT verified against a live Copper response. The human
// should `console.log` one real `/activities/search` row and confirm/fix
// these before trusting this in production:
//   1. Copper exposes logged/synced emails via `POST /activities/search`
//      with `minimum_activity_date` in epoch seconds (this matches Copper's
//      public Activities API shape and the epoch-seconds convention this
//      repo already uses for date custom fields — see
//      lib/copper-discovery.ts:161 — but has not been called against the
//      live API here).
//   2. An email-type activity is distinguishable via
//      `details.category === 'email'` or `type.category === 'email'`. This
//      repo's only other Activities usage (lib/copper.ts:171-179) *creates*
//      a `category: 'user'` note activity, which confirms the
//      `type: { id, category }` shape exists, but does NOT confirm what
//      category/type Copper assigns to synced emails (BCC dropbox /
//      Gmail-Outlook integration) — that could be `'email'`, `'system'`, or
//      something else entirely.
//   3. Field paths for subject/snippet/sender on an email activity
//      (`details.subject`, `details.body`, `details.from` / `from_email`)
//      are guesses carried over from the task brief. Copper does not
//      publicly document a stable structured `details` shape for email
//      activities, so these are read defensively with fallbacks and may
//      need to change once a real payload is inspected.
//   4. `activity_date` is epoch seconds (matching Copper's other date
//      fields elsewhere in this codebase).

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

function getHeaders(): Record<string, string> | null {
  const apiKey = process.env.COPPER_API;
  const apiEmail = process.env.COPPER_API_EMAIL;
  if (!apiKey || !apiEmail) return null;
  return {
    'X-PW-AccessToken': apiKey,
    'X-PW-UserEmail': apiEmail,
    'X-PW-Application': 'developer_api',
    'Content-Type': 'application/json',
  };
}

export type CopperEmail = {
  id: string | number;
  subject: string;
  snippet: string;
  senderEmail: string;
  occurredAt: string; // ISO
};

export type CopperEmailsResult = { ok: boolean; emails: CopperEmail[] };

// Comfortably covers a 3-hour cron window's worth of new email activity plus
// headroom for a missed run, mirroring SYNC_FETCH_LIMIT in fireflies-sync.ts.
const SYNC_PAGE_SIZE = 200;

/**
 * Fetch recent Copper activities and keep the email-type ones with a
 * resolvable sender. Returns `{ ok: false }` (not a thrown error) when
 * credentials are missing or the request fails, so the caller can decide
 * not to advance its sync watermark — see copper-email-sync.ts.
 */
export async function fetchRecentCopperEmails(since: Date): Promise<CopperEmailsResult> {
  const headers = getHeaders();
  if (!headers) return { ok: false, emails: [] };

  let res: Response;
  try {
    res = await fetch(`${COPPER_API_BASE}/activities/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        minimum_activity_date: Math.floor(since.getTime() / 1000),
        page_size: SYNC_PAGE_SIZE,
      }),
    });
  } catch (err) {
    console.error('[copper-emails] activities/search request failed', err);
    return { ok: false, emails: [] };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[copper-emails] activities/search failed (${res.status}):`, text);
    return { ok: false, emails: [] };
  }

  const rows = (await res.json().catch(() => null)) as any[] | null;
  if (!Array.isArray(rows)) {
    console.error('[copper-emails] activities/search returned an unexpected shape');
    return { ok: false, emails: [] };
  }

  const emails: CopperEmail[] = rows
    .filter((r) => r?.details?.category === 'email' || r?.type?.category === 'email')
    .map((r) => ({
      id: r.id,
      subject: r.details?.subject ?? r.subject ?? '(no subject)',
      snippet: (r.details?.body ?? r.body ?? '').toString().slice(0, 200),
      senderEmail: r.details?.from ?? r.from_email ?? '',
      occurredAt: new Date((r.activity_date ?? 0) * 1000).toISOString(),
    }))
    .filter((e) => e.senderEmail);

  return { ok: true, emails };
}
