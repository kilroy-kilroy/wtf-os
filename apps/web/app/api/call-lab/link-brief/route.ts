import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, discoveryBriefId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    // Verify the report belongs to the user
    const { data: report } = await supabase
      .from('call_lab_reports')
      .select('id')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // If linking, verify the brief belongs to the user
    if (discoveryBriefId) {
      const { data: brief } = await supabase
        .from('discovery_briefs')
        .select('id')
        .eq('id', discoveryBriefId)
        .eq('user_id', user.id)
        .single();

      if (!brief) {
        return NextResponse.json({ error: 'Discovery brief not found' }, { status: 404 });
      }
    }

    // Update the link
    const { error: updateError } = await supabase
      .from('call_lab_reports')
      .update({ discovery_brief_id: discoveryBriefId || null })
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update discovery_brief_id:', updateError);
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Link brief API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
