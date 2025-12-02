import { NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

// One-time migration endpoint to copy existing call_scores to call_lab_reports
// This backfills reports that were created before we started saving to call_lab_reports
export async function POST(request: Request) {
  try {
    // Verify admin token for security
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token !== process.env.MIGRATION_SECRET && token !== 'run-migration') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get all call_scores with markdown_response that have a user_id
    const { data: callScores, error: fetchError } = await (supabase as any)
      .from('call_scores')
      .select(`
        id,
        user_id,
        ingestion_item_id,
        version,
        overall_score,
        markdown_response,
        created_at
      `)
      .not('markdown_response', 'is', null)
      .not('user_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching call_scores:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch call_scores', details: fetchError.message }, { status: 500 });
    }

    if (!callScores || callScores.length === 0) {
      return NextResponse.json({ message: 'No call_scores to migrate', migrated: 0 });
    }

    // Get ingestion items for metadata
    const ingestionIds = callScores
      .map((cs: any) => cs.ingestion_item_id)
      .filter(Boolean);

    const { data: ingestionItems } = await (supabase as any)
      .from('ingestion_items')
      .select('id, transcript_metadata')
      .in('id', ingestionIds);

    const ingestionMap = new Map(
      (ingestionItems || []).map((item: any) => [item.id, item.transcript_metadata || {}])
    );

    // Check which call_scores are already in call_lab_reports (by checking user_id + created_at)
    const { data: existingReports } = await (supabase as any)
      .from('call_lab_reports')
      .select('user_id, created_at');

    const existingSet = new Set(
      (existingReports || []).map((r: any) => `${r.user_id}_${r.created_at}`)
    );

    // Filter out already migrated records
    const toMigrate = callScores.filter(
      (cs: any) => !existingSet.has(`${cs.user_id}_${cs.created_at}`)
    );

    if (toMigrate.length === 0) {
      return NextResponse.json({
        message: 'All call_scores already migrated',
        total: callScores.length,
        migrated: 0
      });
    }

    // Prepare records for insertion
    const records = toMigrate.map((cs: any) => {
      const metadata = ingestionMap.get(cs.ingestion_item_id) || {};
      return {
        user_id: cs.user_id,
        buyer_name: metadata.prospect_name || metadata.buyer_name || '',
        company_name: metadata.prospect_company || '',
        call_type: metadata.call_type || metadata.call_stage || null,
        overall_score: cs.overall_score,
        full_report: { markdown: cs.markdown_response },
        tier: cs.version || 'pro',
        created_at: cs.created_at,
      };
    });

    // Insert in batches of 50
    const batchSize = 50;
    let migrated = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await (supabase as any)
        .from('call_lab_reports')
        .insert(batch);

      if (insertError) {
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`);
      } else {
        migrated += batch.length;
      }
    }

    return NextResponse.json({
      message: 'Migration complete',
      total: callScores.length,
      alreadyMigrated: callScores.length - toMigrate.length,
      migrated,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
