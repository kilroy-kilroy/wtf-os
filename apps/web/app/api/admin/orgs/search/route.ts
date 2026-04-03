import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) {
    return NextResponse.json({ orgs: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data: orgs } = await (supabase as any)
    .from('orgs')
    .select('id, name, website, primary_domain')
    .ilike('name', `%${q}%`)
    .limit(10);

  return NextResponse.json({ orgs: orgs || [] });
}
