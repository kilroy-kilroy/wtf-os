// apps/web/lib/timeline/emit-assessment.ts
import type { SupabaseClient } from '@repo/db';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent } from './emit-event';

type Kind = 'biz_dev' | 'discovery' | 'growthos';
type Row = {
  id: string;
  email?: string | null;
  name?: string | null;
  company_name?: string | null;
  website_url?: string | null;
  created_at?: string | null;
  score?: number | null;
};

const LABEL: Record<Kind, string> = {
  biz_dev: 'Biz Dev assessment',
  discovery: 'Discovery brief',
  growthos: 'GrowthOS assessment',
};

export async function emitAssessmentEvent(
  supabase: SupabaseClient,
  row: Row,
  kind: Kind,
): Promise<void> {
  const contact = await resolveContact(supabase, row.email, {
    name: row.name || undefined,
    companyName: row.company_name || undefined,
    url: row.website_url || undefined,
  });
  if (!contact) return;

  const title = row.score != null ? `${LABEL[kind]} — ${row.score}` : LABEL[kind];
  await emitTimelineEvent(supabase, {
    contactId: contact.id,
    companyId: contact.company_id,
    sourceType: kind === 'discovery' ? 'discovery' : 'assessment',
    sourceId: `${kind}:${row.id}`,
    occurredAt: row.created_at || new Date().toISOString(),
    title,
    payload: { kind, assessmentId: row.id },
  });
}
