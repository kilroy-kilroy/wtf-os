// apps/web/lib/timeline/summary.ts
//
// Cached "where we are / next step" contact summary. Reads the most recent
// timeline_events for a contact, asks Claude to synthesize the relationship
// state + next action, and upserts the result into contact_summaries so the
// Person View can render it without an LLM round-trip on every page load.
//
// Reuses the repo's existing multi-tool Anthropic wrapper (`runModel` /
// `retryWithBackoff` / `parseModelJSON` from @repo/utils) — the same pattern
// apps/web/app/api/analyze/biz-dev/route.ts uses for its AI synthesis step —
// rather than importing @anthropic-ai/sdk directly. See packages/utils/ai.ts
// MODEL_CONFIGS['contact-summary'] for the model id (claude-sonnet-4-6,
// matching every other Anthropic-backed tool in that table).
import type { SupabaseClient } from '@repo/db';
import { runModel, retryWithBackoff, parseModelJSON } from '@repo/utils';

type EventRow = {
  source_type: string;
  title: string;
  summary: string | null;
  occurred_at: string;
};

type ContactSummary = { summary: string; next_step: string };

const SYSTEM_PROMPT =
  'You summarize a CRM contact\'s activity timeline for a busy consultant. ' +
  'Reply with ONLY a single JSON object — no markdown fences, no commentary — ' +
  'matching exactly {"summary": string, "next_step": string}.';

/**
 * Build the user-turn prompt from a contact's timeline events (expected
 * newest-first, as returned by the `timeline_events` query in
 * generateContactSummary). Pure function — no I/O, no LLM call.
 */
export function buildSummaryPrompt(events: EventRow[]): string {
  if (events.length === 0) {
    return (
      'No activity for this contact yet. ' +
      'Reply with JSON {"summary":"No activity yet.","next_step":"Reach out to open the conversation."}'
    );
  }
  const lines = events
    .map((e) => `- [${e.occurred_at}] (${e.source_type}) ${e.title}${e.summary ? ` — ${e.summary}` : ''}`)
    .join('\n');
  return [
    'You are summarizing the relationship with one prospect for a busy consultant.',
    'Here is their activity timeline, newest first:',
    lines,
    '',
    'Reply ONLY with JSON: {"summary": "2-3 sentences on where the relationship stands", "next_step": "the single best next step to take"}.',
  ].join('\n');
}

/**
 * Read a contact's recent timeline, ask Claude for a fresh summary + next
 * step, and upsert contact_summaries. Returns null (never throws) on any
 * failure — reading events, calling the model, parsing its output, or the
 * upsert — so callers (the Refresh route, the cron regeneration loop) can
 * treat this as best-effort per contact.
 */
export async function generateContactSummary(
  supabase: SupabaseClient,
  contactId: string,
): Promise<ContactSummary | null> {
  const db = supabase as any;
  const { data: events, error: selectError } = await db
    .from('timeline_events')
    .select('source_type, title, summary, occurred_at')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(30);

  if (selectError) {
    console.error('[timeline] generateContactSummary: failed to read timeline_events', selectError);
    return null;
  }

  const userPrompt = buildSummaryPrompt(events ?? []);

  let parsed: ContactSummary;
  try {
    const response = await retryWithBackoff(() =>
      runModel('contact-summary', SYSTEM_PROMPT, userPrompt),
    );
    parsed = parseModelJSON<ContactSummary>(response.content);
  } catch (err) {
    console.error('[timeline] generateContactSummary: model call/parse failed', err);
    return null;
  }

  if (!parsed || typeof parsed.summary !== 'string' || typeof parsed.next_step !== 'string') {
    console.error('[timeline] generateContactSummary: model returned unexpected shape', parsed);
    return null;
  }

  const { error: upsertError } = await db.from('contact_summaries').upsert(
    {
      contact_id: contactId,
      summary: parsed.summary,
      next_step: parsed.next_step,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'contact_id' },
  );
  if (upsertError) {
    console.error('[timeline] generateContactSummary: upsert failed', upsertError);
    return null;
  }

  return parsed;
}
