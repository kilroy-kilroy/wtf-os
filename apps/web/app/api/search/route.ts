import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = `%${query.trim()}%`;

    // Search call_lab_reports (user's own data only)
    const { data: callReports, error: callError } = await supabase
      .from('call_lab_reports')
      .select('id, buyer_name, company_name, created_at, overall_score')
      .eq('user_id', user.id)
      .or(`buyer_name.ilike.${searchTerm},company_name.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (callError) {
      console.error('Search error:', callError);
    }

    // Search coaching_reports (user's own data only)
    const { data: coachingReports, error: coachingError } = await supabase
      .from('coaching_reports')
      .select('id, seller_name, buyer_name, created_at')
      .eq('user_id', user.id)
      .or(`seller_name.ilike.${searchTerm},buyer_name.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (coachingError) {
      console.error('Coaching search error:', coachingError);
    }

    // Format results
    const results = [
      ...(callReports || []).map(report => ({
        id: report.id,
        type: 'call_report' as const,
        title: report.buyer_name || report.company_name || 'Unnamed Call',
        subtitle: `${report.company_name || ''} • Score: ${report.overall_score || 'N/A'}`,
        date: report.created_at,
        url: `/calls/${report.id}/outcome`,
      })),
      ...(coachingReports || []).map(report => ({
        id: report.id,
        type: 'coaching_report' as const,
        title: report.buyer_name || 'Coaching Report',
        subtitle: `Seller: ${report.seller_name || 'N/A'}`,
        date: report.created_at,
        url: `/dashboard`, // Adjust based on your routing
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
