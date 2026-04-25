// apps/web/app/api/admin/demandos-intake/[enrollmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'client-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enrollmentId } = await params;
  const admin = getSupabaseServerClient();

  const { data: enrollment, error: enrollErr } = await admin
    .from('client_enrollments')
    .select('id, user_id, program_id, client_programs:program_id ( slug, name )')
    .eq('id', enrollmentId)
    .single();

  if (enrollErr || !enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('answers, submitted_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .single();

  const { data: rawDocs } = await admin
    .from('client_documents')
    .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
    .eq('enrollment_id', enrollmentId)
    .like('category', 'demandos-intake:%');

  const docsWithUrls = await Promise.all(
    (rawDocs ?? []).map(async (d) => {
      let signedUrl: string | null = null;
      if (d.storage_path) {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(d.storage_path, SIGNED_URL_TTL_SECONDS);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...d, signedUrl };
    })
  );

  return NextResponse.json({
    enrollment,
    intake: intake ?? null,
    documents: docsWithUrls,
  });
}
