import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { syncFireflies } from '@/lib/timeline/fireflies-sync';

export const maxDuration = 300;

/**
 * Cron: sync new Fireflies call transcripts into the unified timeline.
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
 * Runs every 3 hours via vercel.json cron config.
 */
export async function GET(request: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
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
    const result = await syncFireflies(supabase, apiKey, since);
    ok = result.ok;
    calls = result.emitted;
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

  return NextResponse.json({ ok, calls });
}
