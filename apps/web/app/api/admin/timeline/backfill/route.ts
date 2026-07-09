// apps/web/app/api/admin/timeline/backfill/route.ts
//
// One-time backfill: emits timeline events for every existing biz_dev,
// discovery, and growthos assessment row. Safe to re-run — emitTimelineEvent
// upserts on (source_type, source_id), so already-emitted rows are no-ops.
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { emitAssessmentEvent } from '@/lib/timeline/emit-assessment';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerClient();
  const db = supabase as any;
  let count = 0;

  const biz = (await db.from('biz_dev_assessments')
    .select('id, email, name, company_name, website_url, created_at, composite_score')).data || [];
  for (const r of biz) {
    try {
      await emitAssessmentEvent(supabase, { ...r, score: r.composite_score }, 'biz_dev');
      count++;
    } catch (err) {
      console.error(`[Timeline backfill] biz_dev_assessments row ${r.id} failed:`, err);
    }
  }

  const disc = (await db.from('discovery_briefs')
    .select('id, lead_email, lead_name, lead_company, created_at')).data || [];
  for (const r of disc) {
    try {
      await emitAssessmentEvent(supabase, {
        id: r.id, email: r.lead_email, name: r.lead_name,
        company_name: r.lead_company, created_at: r.created_at,
      }, 'discovery');
      count++;
    } catch (err) {
      console.error(`[Timeline backfill] discovery_briefs row ${r.id} failed:`, err);
    }
  }

  const growth = (await db.from('assessments')
    .select('id, intake_data, created_at, overall_score')).data || [];
  for (const r of growth) {
    // intake_data is stored verbatim from the GrowthOS IntakeData shape
    // (packages/utils/src/assessment/scoring.ts): founderName/agencyName/website,
    // not name/company_name/website_url.
    const intake = r.intake_data || {};
    try {
      await emitAssessmentEvent(supabase, {
        id: r.id, email: intake.email, name: intake.founderName,
        company_name: intake.agencyName,
        website_url: intake.website, created_at: r.created_at, score: r.overall_score,
      }, 'growthos');
      count++;
    } catch (err) {
      console.error(`[Timeline backfill] assessments row ${r.id} failed:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed: count });
}
