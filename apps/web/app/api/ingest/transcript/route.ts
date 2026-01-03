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
import { addLeadToLoops, triggerLoopsEvent } from '@/lib/loops';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    // Find or create user
    const user = await findOrCreateUser(supabase, email, first_name, last_name);

    // Find or create agency
    let agency = null;
    if (agency_name) {
      agency = await findOrCreateAgency(supabase, agency_name, agency_url);
      // Assign user to agency
      await assignUserToAgency(supabase, user.id, agency.id, 'member');
    } else {
      // Create a default agency for the user
      agency = await findOrCreateAgency(supabase, `${first_name || email}'s Agency`);
      await assignUserToAgency(supabase, user.id, agency.id, 'owner');
    }

    // Normalize and process transcript
    const normalizedTranscript = normalizeTranscript(transcript);
    const stats = getTranscriptStats(normalizedTranscript);

    // Create ingestion item
    const ingestionItem = await createIngestionItem(supabase, {
      agency_id: agency.id,
      user_id: user.id,
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

    // Create tool run record
    const toolRun = await createToolRun(supabase, {
      user_id: user.id,
      agency_id: agency.id,
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

    // Sync lead to Loops for nurture sequence
    if (email) {
      await addLeadToLoops(email, 'call-lab', {
        firstName: first_name || '',
        lastName: last_name || '',
        company: agency_name || '',
      });

      // Trigger event for automation
      await triggerLoopsEvent(email, 'call_lab_started', {
        callStage: call_stage || 'unknown',
      });
    }

    return NextResponse.json(
      {
        success: true,
        ingestion_item_id: ingestionItem.id,
        tool_run_id: toolRun.id,
        user_id: user.id,
        agency_id: agency.id,
        status: 'pending',
        message: 'Transcript received successfully. Ready for analysis.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error ingesting transcript:', error);

    return NextResponse.json(
      {
        error: 'Failed to ingest transcript',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status of an ingestion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from('ingestion_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ingestion item:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch ingestion item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
