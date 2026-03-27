// apps/web/app/admin/impersonate/[userId]/page.tsx
import { createClient } from '@/lib/supabase-auth-server';
import { redirect } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function ImpersonatePage({ params }: Props) {
  const { userId } = await params;

  // Verify current user is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminCheck } = await serviceClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminCheck?.is_admin) redirect('/dashboard');

  // Fetch the target client's data
  const { data: targetUser } = await serviceClient
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-400">User not found.</p>
      </div>
    );
  }

  // Fetch their enrollment
  const { data: enrollment } = await serviceClient
    .from('client_enrollments')
    .select('*, program:client_programs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // Fetch their company
  const { data: company } = enrollment
    ? await serviceClient
        .from('client_companies')
        .select('company_name, industry_niche')
        .eq('enrollment_id', enrollment.id)
        .single()
    : { data: null };

  // Fetch their Friday submissions (last 4 weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const { data: fridays } = await serviceClient
    .from('five_minute_fridays')
    .select('id, week_of, worked_on, working_on_next, concerned_about, submitted_at')
    .eq('user_id', userId)
    .gte('submitted_at', fourWeeksAgo.toISOString())
    .order('submitted_at', { ascending: false });

  // Fetch their recent documents
  const { data: docs } = enrollment
    ? await serviceClient
        .from('client_documents')
        .select('id, title, category, created_at')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };

  const clientName = [targetUser.first_name, targetUser.last_name].filter(Boolean).join(' ') || targetUser.email;
  const program = enrollment?.program as any;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Admin banner */}
      <div className="bg-[#E51B23] text-white px-4 py-3 rounded-lg mb-8 flex items-center justify-between">
        <p className="text-sm font-medium">
          Viewing as <strong>{clientName}</strong> — this is what they see (read-only)
        </p>
        <a href="/admin" className="text-sm underline hover:no-underline">
          Back to Admin
        </a>
      </div>

      {/* Client dashboard preview */}
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{clientName}</h1>
          <p className="text-slate-400 text-sm">
            {program?.name || 'No program'} &middot; {company?.company_name || 'No company'} &middot; {targetUser.email}
          </p>
        </div>

        {/* Enrollment status */}
        {enrollment ? (
          <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Enrollment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Status</p>
                <p className="text-white capitalize">{enrollment.status}</p>
              </div>
              <div>
                <p className="text-slate-400">Onboarding</p>
                <p className="text-white">{enrollment.onboarding_completed ? 'Complete' : 'Incomplete'}</p>
              </div>
              <div>
                <p className="text-slate-400">5-Minute Friday</p>
                <p className="text-white">{program?.has_five_minute_friday ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-slate-400">Call Lab Pro</p>
                <p className="text-white">{program?.has_call_lab_pro ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-700/50 rounded-lg p-5">
            <p className="text-slate-400 text-sm">No active enrollment found.</p>
          </div>
        )}

        {/* Recent Friday submissions */}
        <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Recent Friday Check-ins
          </h2>
          {fridays && fridays.length > 0 ? (
            <div className="space-y-3">
              {fridays.map((f) => (
                <div key={f.id} className="border-l-2 border-slate-600 pl-3 py-1">
                  <p className="text-xs text-slate-500">{new Date(f.submitted_at).toLocaleDateString()}</p>
                  <p className="text-sm text-white mt-1"><strong>Worked on:</strong> {f.worked_on}</p>
                  <p className="text-sm text-slate-300"><strong>Next:</strong> {f.working_on_next}</p>
                  {f.concerned_about && (
                    <p className="text-sm text-yellow-400"><strong>Concerned:</strong> {f.concerned_about}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No submissions yet.</p>
          )}
        </div>

        {/* Recent documents */}
        <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Recent Documents
          </h2>
          {docs && docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-white">{d.title}</span>
                  <span className="text-slate-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No documents shared yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
