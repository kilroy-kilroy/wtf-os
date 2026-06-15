import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'contracts';
const TTL = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const which = new URL(req.url).searchParams.get('which') === 'draft' ? 'pdf_path' : 'signed_pdf_path';

  const db = getSupabaseServerClient();
  const { data: contract } = await db.from('contracts').select('pdf_path, signed_pdf_path').eq('id', id).single();
  const path = contract?.[which as 'pdf_path' | 'signed_pdf_path'];
  if (!path) return NextResponse.json({ error: 'No file' }, { status: 404 });

  const { data: signed, error } = await db.storage.from(BUCKET).createSignedUrl(path, TTL);
  if (error || !signed) return NextResponse.json({ error: 'Could not sign' }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
