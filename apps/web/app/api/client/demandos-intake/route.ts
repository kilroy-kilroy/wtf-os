// apps/web/app/api/client/demandos-intake/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

async function resolveEnrollment() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const admin = getSupabaseServerClient();
  const { data: enrollment, error } = await admin
    .from('client_enrollments')
    .select('id, user_id, program_id, client_programs:program_id ( slug, has_demandos_intake )')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (error || !enrollment) return { error: 'Enrollment not found' as const, status: 404 };

  const program = Array.isArray(enrollment.client_programs)
    ? enrollment.client_programs[0]
    : enrollment.client_programs;
  if (!program?.has_demandos_intake) {
    return { error: 'Program does not have DemandOS intake enabled' as const, status: 403 };
  }

  return { user, enrollmentId: enrollment.id, admin };
}

export async function GET() {
  const resolved = await resolveEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  // Upsert an empty intake row if missing.
  await admin
    .from('demandos_intake')
    .upsert({ enrollment_id: enrollmentId }, { onConflict: 'enrollment_id', ignoreDuplicates: true });

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('id, answers, submitted_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .single();

  const { data: documents } = await admin
    .from('client_documents')
    .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
    .eq('enrollment_id', enrollmentId)
    .like('category', 'demandos-intake:%')
    .order('uploaded_at', { ascending: false });

  return NextResponse.json({
    enrollmentId,
    intake: intake ?? { answers: {}, submitted_at: null },
    documents: documents ?? [],
  });
}

export async function POST(request: NextRequest) {
  const resolved = await resolveEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'Body must be { key: string, value: unknown }' }, { status: 400 });
  }
  const { key, value } = body as { key: string; value: unknown };

  // Read current, merge, write.
  const { data: current } = await admin
    .from('demandos_intake')
    .select('answers')
    .eq('enrollment_id', enrollmentId)
    .single();

  const merged = { ...(current?.answers ?? {}), [key]: value };

  const { error } = await admin
    .from('demandos_intake')
    .update({ answers: merged })
    .eq('enrollment_id', enrollmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
