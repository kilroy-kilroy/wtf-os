// Admin-only: return every published office-hours session, bypassing RLS, so an
// admin (who has no client enrollment) sees the full archive in the client view.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseServerClient();
  const { data } = await admin
    .from('client_content')
    .select('*')
    .eq('content_type', 'session')
    .eq('published', true)
    .order('published_at', { ascending: false });

  return NextResponse.json({ sessions: data ?? [] });
}
