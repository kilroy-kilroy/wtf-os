import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { CALL_VAULT_BUCKET } from '@/lib/call-vault/db';

const TTL_SECONDS = 300;

// GET /api/admin/call-vault/files/[fileId]
// Mints a short-TTL signed URL into the private call-vault bucket and
// redirects to it, so the file is never served through a public URL. Modeled
// on /api/contracts/[id]/file, which does the same for the (separate)
// contracts bucket.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  if (!(await requireAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { fileId } = await params;

  const db = getSupabaseServerClient();
  const { data: file } = await db
    .from('call_vault_files').select('storage_path').eq('id', fileId).single();
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await db.storage
    .from(CALL_VAULT_BUCKET).createSignedUrl(file.storage_path, TTL_SECONDS);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
