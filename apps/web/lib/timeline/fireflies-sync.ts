// apps/web/lib/timeline/fireflies-sync.ts
//
// NOTE ON REAL FIELD SHAPES (differs from the task brief's assumptions):
// - `listTranscripts(apiKey, limit)` takes a numeric `limit`, not a date-range
//   filter, and returns `{ success, transcripts?, error? }` — not a bare array.
//   The Fireflies GraphQL query wired up in lib/fireflies.ts requests no
//   `fromDate`/`toDate` args, so incremental sync is done client-side here by
//   filtering the fetched page against `since`.
// - `getTranscriptMetadata()` is a UI display formatter (`displayDate`,
//   `displayDuration`, `participantCount` — human strings), not a source of
//   machine-readable id/title/date/attendeeEmails. It is not usable for sync
//   and is intentionally NOT used below; the raw `FirefliesTranscript` fields
//   are read directly instead.
// - There is no `meeting_attendees` field in the current query — attendee
//   emails are derived from `participants` (filtered to entries containing
//   "@", since dial-in participants can appear as phone numbers) unioned with
//   `organizer_email`.
// - `date` is typed `string` on `FirefliesTranscript` but is treated
//   permissively here (Fireflies' actual GraphQL response is a numeric epoch
//   ms value at runtime); `parseTranscriptDate` accepts either.
import type { SupabaseClient } from '@repo/db';
import { listTranscripts, type FirefliesTranscript } from '@/lib/fireflies';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent, type TimelineEventInput } from './emit-event';

type Meta = { id: string; title: string; date: number; attendeeEmails: string[] };

export function transcriptToEvents(
  meta: Meta,
  resolvedByEmail: Map<string, { id: string; company_id: string | null }>,
): TimelineEventInput[] {
  const events: TimelineEventInput[] = [];
  const seen = new Set<string>();
  for (const email of meta.attendeeEmails) {
    const contact = resolvedByEmail.get(email.toLowerCase());
    if (!contact || seen.has(contact.id)) continue;
    seen.add(contact.id);
    events.push({
      contactId: contact.id,
      companyId: contact.company_id,
      sourceType: 'call',
      sourceId: meta.id,
      occurredAt: new Date(meta.date).toISOString(),
      title: `Call: ${meta.title}`,
      payload: { firefliesId: meta.id },
    });
  }
  return events;
}

/** Accepts either a numeric epoch-ms value or a Date-parseable string. */
function parseTranscriptDate(date: unknown): number {
  if (typeof date === 'number') return date;
  const parsed = Date.parse(String(date));
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/** Derives attendee emails from `participants` (filtered to email-shaped
 * strings) unioned with `organizer_email`; dial-in participants can show up
 * as phone numbers rather than emails. */
function attendeeEmailsFor(t: FirefliesTranscript): string[] {
  const emails = new Set<string>();
  for (const p of t.participants ?? []) {
    if (p && p.includes('@')) emails.add(p.toLowerCase());
  }
  if (t.organizer_email) emails.add(t.organizer_email.toLowerCase());
  return [...emails];
}

// listTranscripts has no server-side date filter, so fetch a bounded page and
// filter against `since` client-side. 100 comfortably covers a 3-hour cron
// window's worth of new calls plus headroom for a missed run.
const SYNC_FETCH_LIMIT = 100;

export async function syncFireflies(
  supabase: SupabaseClient,
  apiKey: string,
  since: Date,
): Promise<number> {
  const result = await listTranscripts(apiKey, SYNC_FETCH_LIMIT);
  if (!result.success || !result.transcripts) {
    if (!result.success) console.error('[fireflies-sync] listTranscripts failed', result.error);
    return 0;
  }

  const sinceMs = since.getTime();
  let emitted = 0;
  for (const t of result.transcripts) {
    const dateMs = parseTranscriptDate(t.date);
    if (dateMs < sinceMs) continue;

    const attendeeEmails = attendeeEmailsFor(t);
    const resolved = new Map<string, { id: string; company_id: string | null }>();
    for (const email of attendeeEmails) {
      const contact = await resolveContact(supabase, email);
      if (contact) resolved.set(email, contact);
    }

    const meta: Meta = { id: t.id, title: t.title || 'Untitled', date: dateMs, attendeeEmails };
    for (const e of transcriptToEvents(meta, resolved)) {
      await emitTimelineEvent(supabase, e);
      emitted++;
    }
  }
  return emitted;
}
