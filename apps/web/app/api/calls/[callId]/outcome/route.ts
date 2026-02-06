import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outcome } = body;

    if (!outcome || !['won', 'lost', 'ghosted', 'next_step', 'unknown'].includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome. Must be one of: won, lost, ghosted, next_step, unknown' },
        { status: 400 }
      );
    }

    // Update the call outcome
    const { data, error } = await supabase
      .from('call_lab_reports')
      .update({
        outcome,
        outcome_updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call outcome:', error);
      return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, outcome: data.outcome });
  } catch (error) {
    console.error('Outcome update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
