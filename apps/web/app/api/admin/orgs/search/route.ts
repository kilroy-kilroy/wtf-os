import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdminRequest } from '@/lib/contracts/require-admin';

export async function GET(request: NextRequest) {
  if (!(await requireAdminRequest(request))) {
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
