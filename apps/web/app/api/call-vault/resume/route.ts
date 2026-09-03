// apps/web/app/api/call-vault/resume/route.ts
//
// Consumes the single-use emailed access token and mints a fresh anonymous
// session so the contributor can add more calls without signing the NDA
// again. This does its OWN lookup by access_token rather than calling
// lib/access-tokens.ts's consumeAccessToken: that helper requires a row id it
// cannot get from the URL (only the token is in the emailed link), and it
// defaults to looking up a `user_id` column that call_vault_contributors does
// not have.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { randomBytes } from 'node:crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getSupabaseServerClient();
  const { data: row } = await db
    .from('call_vault_contributors')
    .select('id, name, email, agency_name, agency_url, services, revenue_band, target_client, nda_signed_at, access_token_expires_at, access_token_used_at')
    .eq('access_token', token)
    .maybeSingle();

  if (!row || row.access_token_used_at || !row.access_token_expires_at ||
      new Date(row.access_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'That link has expired' }, { status: 401 });
  }

  const sessionToken = randomBytes(32).toString('hex');

  // Stamp the token used and mint the session in the same update, scoped back
  // to the still-unused token — this is the actual consumption, and closes
  // the race between the read above and this write (two concurrent requests
  // for the same link can't both succeed).
  const { data: updated } = await db
    .from('call_vault_contributors')
    .update({
      access_token_used_at: new Date().toISOString(),
      session_token: sessionToken,
      session_token_expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      status: 'draft',
    })
    .eq('id', row.id)
    .eq('access_token', token)
    .is('access_token_used_at', null)
    .select('id')
    .maybeSingle();

  if (!updated) {
    return NextResponse.json({ error: 'That link has expired' }, { status: 401 });
  }

  return NextResponse.json({
    sessionToken,
    contributor: {
      name: row.name,
      email: row.email,
      agencyName: row.agency_name,
      agencyUrl: row.agency_url,
      services: row.services,
      revenueBand: row.revenue_band,
      targetClient: row.target_client,
      ndaSigned: !!row.nda_signed_at,
    },
  });
}
