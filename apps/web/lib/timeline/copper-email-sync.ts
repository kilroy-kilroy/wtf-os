// apps/web/lib/timeline/copper-email-sync.ts
import type { SupabaseClient } from '@repo/db';
import { fetchRecentCopperEmails, type CopperEmail } from '@/lib/copper-emails';
import { fetchPerson } from '@/lib/copper-discovery';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent, type TimelineEventInput } from './emit-event';

/** Pure mapping — no I/O. Attaches one 'email' event to the resolved contact.
 * Copper email activities carry a subject (in the structured `details`) but no
 * body in the activities payload, so there is no snippet to summarize. */
export function copperEmailToEvent(
  email: CopperEmail,
  contact: { id: string; company_id: string | null },
): TimelineEventInput {
  return {
    contactId: contact.id,
    companyId: contact.company_id,
    sourceType: 'email',
    sourceId: `copper:${email.id}`,
    occurredAt: email.occurredAt,
    title: `Email: ${email.subject}`,
    payload: { copperActivityId: email.id, personId: email.personId },
  };
}

// Mirrors fireflies-sync.ts's SyncResult: `ok: false` distinguishes "the fetch
// failed / credentials missing" from "0 new emails", so the cron route knows
// not to advance the sync_state watermark on failure.
export type SyncResult = { ok: boolean; emitted: number };

type ResolvedPerson = { email: string; name?: string; companyName?: string } | null;

/** Look up a Copper person's primary email (+ name) once per run. fetchPerson
 * throws on API failure — we catch and cache null so one bad person doesn't
 * abort the sync (and isn't retried against the same id in the same run). */
async function personContact(
  personId: number,
  cache: Map<number, ResolvedPerson>,
): Promise<ResolvedPerson> {
  const cached = cache.get(personId);
  if (cached !== undefined) return cached;

  let resolved: ResolvedPerson = null;
  try {
    const p = await fetchPerson(personId);
    const email = p.emails?.[0]?.email;
    if (email) {
      resolved = {
        email,
        name: p.name ?? undefined,
        companyName: p.company_name ?? undefined,
      };
    }
  } catch (err) {
    console.error('[copper-emails] fetchPerson failed', personId, err);
  }
  cache.set(personId, resolved);
  return resolved;
}

export async function syncCopperEmails(
  supabase: SupabaseClient,
  since: Date,
): Promise<SyncResult> {
  const result = await fetchRecentCopperEmails(since);
  if (!result.ok) return { ok: false, emitted: 0 };

  const personCache = new Map<number, ResolvedPerson>();
  let emitted = 0;
  let allEmitsOk = true;

  for (const email of result.emails) {
    // Resolve the contact through Copper's authoritative parent-person link.
    // If the activity has no person parent (or the person has no email), skip
    // rather than risk attaching the email to the wrong party (e.g. the
    // operator, who is the sender on outbound mail).
    if (email.personId == null) continue;
    const person = await personContact(email.personId, personCache);
    if (!person) continue;

    const contact = await resolveContact(supabase, person.email, {
      name: person.name,
      companyName: person.companyName,
    });
    if (!contact) continue;

    const ok = await emitTimelineEvent(supabase, copperEmailToEvent(email, contact));
    if (ok) {
      emitted++;
    } else {
      // A failed upsert must block the watermark advance so this event is
      // retried on the next cron run instead of being permanently skipped.
      allEmitsOk = false;
    }
  }
  return { ok: allEmitsOk, emitted };
}
