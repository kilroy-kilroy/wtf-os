// apps/web/lib/timeline/copper-email-sync.ts
import type { SupabaseClient } from '@repo/db';
import { fetchRecentCopperEmails, type CopperEmail } from '@/lib/copper-emails';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent, type TimelineEventInput } from './emit-event';

/** Pure mapping — no I/O. See lib/copper-emails.ts for the field-path
 * assumptions in the `email` shape this consumes. */
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
    summary: email.snippet,
    payload: { copperActivityId: email.id, from: email.senderEmail },
  };
}

// Mirrors fireflies-sync.ts's SyncResult: `ok: false` distinguishes "the
// fetch failed / credentials missing" from "0 new emails", so the cron
// route knows not to advance the sync_state watermark on failure.
export type SyncResult = { ok: boolean; emitted: number };

export async function syncCopperEmails(
  supabase: SupabaseClient,
  since: Date,
): Promise<SyncResult> {
  const result = await fetchRecentCopperEmails(since);
  if (!result.ok) return { ok: false, emitted: 0 };

  let emitted = 0;
  let allEmitsOk = true;
  for (const email of result.emails) {
    const contact = await resolveContact(supabase, email.senderEmail);
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
