import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

export async function GET(request: NextRequest) {
  try {
    // Simple API key auth - set ADMIN_API_KEY in your environment
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch user acquisition data
    const { data, error } = await supabase
      .from('call_lab_reports')
      .select('user_id, buyer_name, company_name, overall_score, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from('call_lab_reports')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
