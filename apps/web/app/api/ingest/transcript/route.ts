import { requiredLabId, authorizeLab, grantGuest, reportLink, labUser, requirePro, readLabJson, limitLab, labFailure, LabError } from '@/lib/labs/access';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  findOrCreateUser,
  findOrCreateAgency,
  assignUserToAgency,
  createIngestionItem,
  createToolRun,
} from '@repo/db';
import { normalizeTranscript, getTranscriptStats } from '@repo/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await readLabJson(request);
    const actor = await labUser();
    await limitLab(request, "ingest", actor?.id);
    if (typeof body.transcript !== "string" || body.transcript.length < 20 || body.transcript.length > 200_000 || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new LabError(400, "Provide a valid email and a transcript between 20 and 200,000 characters.");
    if (actor?.email) body.email = actor.email;

    // Validate required fields
    if (!body.transcript || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript and email' },
        { status: 400 }
      );
    }

    const {
      transcript,
      email,
      first_name,
      last_name,
      agency_name,
      agency_url,
      prospect_company,
      prospect_role,
      call_stage,
      deal_size_tier,
      services_discussed,
    } = body;

    // Initialize Supabase client
    const supabase = createServerClient();

    // Identity comes only from the verified session. Never attach a guest to
    // an existing user/team based on a submitted email or agency name.
    const user = actor ? { id: actor.id } : null;
    let agencyId: string | undefined;
    if (user) {
      const { data } = await (supabase as any).from('user_agency_assignments')
        .select('agency_id').eq('user_id', user.id).limit(1).maybeSingle();
      agencyId = data?.agency_id;
    }

    // Normalize and process transcript
    const normalizedTranscript = normalizeTranscript(transcript);
    const stats = getTranscriptStats(normalizedTranscript);

    // Create ingestion item
    const ingestionItem = await createIngestionItem(supabase, {
      agency_id: agencyId,
      user_id: user?.id,
      source_type: 'transcript',
      source_channel: 'manual',
      raw_content: normalizedTranscript,
      content_format: 'text',
      transcript_metadata: {
        word_count: stats.wordCount,
        estimated_duration: stats.estimatedDuration,
        participant_count: stats.participantCount,
        prospect_company,
        prospect_role,
        call_stage,
        deal_size_tier,
        services_discussed,
      },
    });

    if (!actor) await grantGuest("ingestion", ingestionItem.id);

    // Create tool run record
    const toolRun = await createToolRun(supabase, {
      user_id: user?.id,
      agency_id: agencyId,
      lead_email: email,
      lead_name: first_name ? `${first_name} ${last_name || ''}`.trim() : undefined,
      tool_name: 'call_lab_lite',
      tool_version: '1.0',
      ingestion_item_id: ingestionItem.id,
      input_data: {
        prospect_company,
        prospect_role,
        call_stage,
        deal_size_tier,
      },
    });

    return NextResponse.json(
      {
        success: true,
        ingestion_item_id: ingestionItem.id,
        tool_run_id: toolRun.id,
        user_id: user?.id,
        agency_id: agencyId,
        status: 'pending',
        message: 'Transcript received successfully. Ready for analysis.',
      },
      { status: 200 }
    );
  } catch (error) {
    const failure = labFailure(error); if (failure) return failure;
    console.error('Error ingesting transcript:', error);

    return NextResponse.json(
      {
        error: 'Failed to ingest transcript',

      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status of an ingestion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = requiredLabId(searchParams);

    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from('ingestion_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error || !item) throw new LabError(404, "Transcript not found.");
    await authorizeLab("ingestion", itemId, (item as any).user_id, searchParams.get("access_token"));

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (error) {
    const failure = labFailure(error); if (failure) return failure;
    console.error('Error fetching ingestion item:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch ingestion item',

      },
      { status: 500 }
    );
  }
}
