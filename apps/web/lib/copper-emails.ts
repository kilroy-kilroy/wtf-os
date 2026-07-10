// apps/web/lib/copper-emails.ts
//
// Fetches recently-logged Copper "email" activities for the timeline-sync
// cron. Reuses the exact auth pattern used elsewhere in this repo
// (lib/copper-discovery.ts:10-20): the access token and acting-user email come
// from `COPPER_API` / `COPPER_API_EMAIL`, sent as `X-PW-AccessToken` /
// `X-PW-UserEmail` / `X-PW-Application: developer_api` headers. `getHeaders()`
// returns null (rather than throwing) when the env vars are missing.
//
// Verified against the live Copper Activities API (2026-07):
//   - Emails are the built-in "Email" activity type — a global Copper platform
//     constant: { category: "system", id: 6 }. Filter the /activities/search
//     with `activity_types: [{category:'system', id:6}]`.
//   - For a type-6 activity, `details` is a STRUCTURED OBJECT (unlike user-note
//     activities, whose `details` is a plain string):
//       { sender: {name, email}, recipients: [{name, email}], subject, id }
//   - The activity is linked to the person it concerns via
//     `parent: {id, type:'person'}`. We resolve the contact through that parent
//     person (see copper-email-sync.ts), which is correct for BOTH inbound and
//     outbound mail — the sender of an outbound email is the operator, not the
//     prospect, so resolving by sender would attach it to the wrong person.
//   - `activity_date` is epoch seconds.

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

// Copper's built-in "Email" system activity type (global platform constant).
const EMAIL_ACTIVITY_TYPE = { category: 'system', id: 6 };

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
  occurredAt: string; // ISO
  // Copper parent person id — the authoritative link to the person the email
  // concerns. Resolve the contact through this (via fetchPerson), not the
  // sender. Null when the activity's parent isn't a person.
  personId: number | null;
  // sender + recipient addresses, fallback signal only.
  candidateEmails: string[];
};

export type CopperEmailsResult = { ok: boolean; emails: CopperEmail[] };

// Covers a 3-hour cron window's worth of new email activity plus headroom for a
// missed run. Copper's page cap is well above this.
const SYNC_PAGE_SIZE = 100;

/**
 * Fetch recent Copper email activities. Returns `{ ok: false }` (not a thrown
 * error) when credentials are missing or the request fails, so the caller can
 * decide not to advance its sync watermark — see copper-email-sync.ts.
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
        activity_types: [EMAIL_ACTIVITY_TYPE],
        sort_by: 'activity_date',
        sort_direction: 'desc',
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

  const emails: CopperEmail[] = rows.map((r) => {
    const details = r?.details ?? {};
    const recipients = Array.isArray(details.recipients) ? details.recipients : [];
    const candidateEmails = [details?.sender?.email, ...recipients.map((x: any) => x?.email)]
      .filter((e: any): e is string => typeof e === 'string' && e.length > 0);
    const parent = r?.parent ?? {};
    return {
      id: r.id,
      subject: (details.subject ?? '(no subject)').toString(),
      occurredAt: new Date((r.activity_date ?? 0) * 1000).toISOString(),
      personId:
        parent.type === 'person' && typeof parent.id === 'number' ? parent.id : null,
      candidateEmails,
    };
  });

  return { ok: true, emails };
}
