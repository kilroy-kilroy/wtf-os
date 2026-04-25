// apps/web/app/api/client/demandos-intake/submit/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onDemandosIntakeSubmitted } from '@/lib/loops';
import { requiredKeys } from '@/lib/demandos-intake/questions';

export async function POST() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseServerClient();

  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id, program_id, client_programs:program_id ( name, has_demandos_intake ), user_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

  const program = Array.isArray(enrollment.client_programs)
    ? enrollment.client_programs[0]
    : enrollment.client_programs;
  if (!program?.has_demandos_intake) {
    return NextResponse.json({ error: 'Not a DemandOS enrollment' }, { status: 403 });
  }

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('answers, submitted_at')
    .eq('enrollment_id', enrollment.id)
    .single();

  if (intake?.submitted_at) {
    return NextResponse.json({ success: true });
  }

  const answers = (intake?.answers ?? {}) as Record<string, unknown>;
  const missing = requiredKeys().filter((k) => {
    const v = answers[k];
    return v === undefined || v === null || v === '';
  });
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Required fields missing', missingKeys: missing },
      { status: 400 }
    );
  }

  const { error: updateErr } = await admin
    .from('demandos_intake')
    .update({ submitted_at: new Date().toISOString() })
    .eq('enrollment_id', enrollment.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const companyName = typeof answers.company_name === 'string' ? answers.company_name : '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.timkilroy.com';
  const reviewUrl = `${baseUrl}/admin/demandos-intake/${enrollment.id}`;

  await onDemandosIntakeSubmitted(
    user.email ?? '',
    companyName,
    program?.name ?? '',
    enrollment.id,
    reviewUrl,
  ).catch((err) => console.error('Loops notification failed:', err));

  return NextResponse.json({ success: true });
}
