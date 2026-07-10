import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { syncFireflies } from '@/lib/timeline/fireflies-sync';
import { syncCopperEmails } from '@/lib/timeline/copper-email-sync';
import { generateContactSummary } from '@/lib/timeline/summary';

export const maxDuration = 300;

/**
 * Cron: sync new Fireflies call transcripts and Copper-logged emails into
 * the unified timeline.
 *
 * ASSUMPTION (flagged for human confirmation): the Fireflies API key here is
 * read from a single operator env var, `FIREFLIES_API_KEY`. The existing
 * `/api/integrations/fireflies/*` routes store the key per-user in
 * `users.preferences.integrations.fireflies.apiKey` for the separate Call Lab
 * "import a transcript" feature. But `contacts`/`companies`/`timeline_events`
 * (and `sync_state`, keyed only by `source`) have no per-user/tenant column —
 * this is a single-tenant personal CRM — so there is no "which user's key"
 * question to resolve for this cron; it syncs one operator's Fireflies
 * account. If multiple operators end up needing independent Fireflies sync,
 * this will need to loop over users with a connected integration instead.
 *
 * The Copper email sync reuses the same single-operator assumption: `COPPER_API`
 * / `COPPER_API_EMAIL` (the existing repo-wide Copper credentials — see
 * lib/copper.ts) act as one Copper user. See lib/copper-emails.ts for the
 * (unverified) assumptions about how Copper represents logged emails as
 * activities.
 *
 * Runs every 3 hours via vercel.json cron config.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerClient();
  const db = supabase as any;

  // High-water mark; default to 7 days back on first run.
  const { data: state } = await db.from('sync_state')
    .select('last_synced_at').eq('source', 'fireflies').maybeSingle();
  // Subtract a 1-hour lag buffer: Fireflies transcription lags the call, so a
  // call ending just before a cron tick may not be listed by the API until
  // after it ticks, and its `date` could then fall before the recorded
  // watermark and be permanently skipped. Reprocessing the overlap is
  // harmless — emits are idempotent on (source_type, source_id).
  const since = state?.last_synced_at
    ? new Date(new Date(state.last_synced_at).getTime() - 60 * 60 * 1000)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const apiKey = process.env.FIREFLIES_API_KEY;
  let ok = false;
  let calls = 0;
  if (apiKey) {
    try {
      const result = await syncFireflies(supabase, apiKey, since);
      ok = result.ok;
      calls = result.emitted;
    } catch (err) {
      // Keep this source independent of the other: an unexpected throw here
      // must not abort the Copper-email sync or the summary regeneration
      // step below. Treat it like any other sync failure — do not advance
      // the watermark; the next run retries the same window.
      console.error('[cron] timeline-sync: syncFireflies threw', err);
      ok = false;
      calls = 0;
    }
  }

  // Only advance the watermark when the sync actually ran successfully —
  // if the API key is missing or the fetch failed, advancing `now` would
  // permanently skip the window we just failed to cover. The next run will
  // retry the same `since` (with its own fresh lag buffer applied).
  if (apiKey && ok) {
    await db.from('sync_state').upsert(
      { source: 'fireflies', last_synced_at: now.toISOString(), updated_at: now.toISOString() },
      { onConflict: 'source' },
    );
  }

  // Independent Copper-email high-water mark; default to 7 days back on
  // first run. Mirrors the Fireflies block above exactly.
  const { data: emailState } = await db.from('sync_state')
    .select('last_synced_at').eq('source', 'copper_email').maybeSingle();
  // Same 1-hour lag-buffer rationale as Fireflies: a Copper activity for an
  // email sent/received just before a cron tick may not be logged/searchable
  // until slightly after, and could otherwise fall before the recorded
  // watermark and be permanently skipped. Reprocessing the overlap is
  // harmless — emits are idempotent on (source_type, source_id).
  const emailSince = emailState?.last_synced_at
    ? new Date(new Date(emailState.last_synced_at).getTime() - 60 * 60 * 1000)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const copperConfigured = Boolean(process.env.COPPER_API && process.env.COPPER_API_EMAIL);
  let emailOk = false;
  let emails = 0;
  if (copperConfigured) {
    try {
      const emailResult = await syncCopperEmails(supabase, emailSince);
      emailOk = emailResult.ok;
      emails = emailResult.emitted;
    } catch (err) {
      // Same independence rule as the Fireflies block above: a throw here
      // must not prevent the summary regeneration step from running, and
      // must not advance the Copper-email watermark.
      console.error('[cron] timeline-sync: syncCopperEmails threw', err);
      emailOk = false;
      emails = 0;
    }
  }

  // Same success-gated rule as Fireflies: only advance the Copper-email
  // watermark when the credentials were present and the sync actually
  // succeeded, so a failed/unconfigured run doesn't skip its window.
  if (copperConfigured && emailOk) {
    await db.from('sync_state').upsert(
      { source: 'copper_email', last_synced_at: now.toISOString(), updated_at: now.toISOString() },
      { onConflict: 'source' },
    );
  }

  // Regenerate cached contact_summaries, but only for contacts whose timeline
  // actually changed this run — regenerating for every contact would fan out
  // an unbounded number of LLM calls on every 3-hour tick. `now` was captured
  // above, before either sync ran, so `created_at >= now` catches exactly the
  // timeline_events rows this run inserted. This relies on emitTimelineEvent's
  // upsert (source_type, source_id) leaving created_at untouched when an
  // already-synced event is re-processed inside the 1-hour lag-buffer overlap
  // — only genuinely new rows get a created_at at or after this run's start.
  const { data: touched } = await db
    .from('timeline_events')
    .select('contact_id')
    .gte('created_at', now.toISOString());
  const touchedContactIds: string[] = Array.from(
    new Set<string>((touched ?? []).map((r: any) => r.contact_id as string)),
  );

  let summariesRegenerated = 0;
  for (const contactId of touchedContactIds) {
    try {
      const result = await generateContactSummary(supabase, contactId);
      if (result) summariesRegenerated++;
    } catch (err) {
      // A single contact's summary failing must never abort the cron run —
      // the sync work above already succeeded and its watermarks are saved.
      console.error('[cron] timeline-sync: summary regeneration failed for', contactId, err);
    }
  }

  return NextResponse.json({ ok, calls, emailOk, emails, touched: touchedContactIds.length, summariesRegenerated });
}
