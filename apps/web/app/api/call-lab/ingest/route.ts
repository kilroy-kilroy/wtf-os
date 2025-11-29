import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { report, metadata } = await req.json();

    // Validate payload
    if (!report || !metadata) {
      return NextResponse.json(
        { error: 'Invalid payload: must contain report and metadata' },
        { status: 400 }
      );
    }

    // Insert into call_lab_reports
    const { data, error } = await supabase
      .from('call_lab_reports')
      .insert({
        full_report: report,
        ...metadata,
        user_id: user.id, // Always use authenticated user
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      callId: metadata.callId || data.id,
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
