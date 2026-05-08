import { redirect } from 'next/navigation';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { createServerClient } from '@repo/db/client';
import { ReportContent } from './ReportContent';
import { StageProgress } from './StageProgress';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BizDevReportPage({ params }: PageProps) {
  const { id } = await params;

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  const svc = createServerClient();
  const { data: assessment, error } = await (svc as any)
    .from('biz_dev_assessments')
    .select('*')
    .eq('id', id)
    .single() as { data: Record<string, any> | null; error: unknown };

  if (error || !assessment) {
    return (
      <main className="min-h-screen p-12">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">
          This report doesn&apos;t exist or has been removed.
        </p>
      </main>
    );
  }

  if (assessment.user_id !== user.id) {
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  if (assessment.report_status !== 'completed' || !assessment.report_markdown) {
    return (
      <main className="min-h-screen p-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Your report is being prepared</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;re analyzing your website and LinkedIn alongside your answers. This usually takes 2–5 minutes. Refresh this page in a moment.
        </p>
        {/* eslint-disable-next-line @next/next/no-head-element */}
        <meta httpEquiv="refresh" content="5" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <StageProgress stage={assessment.stage as 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready'} />
        <ReportContent
          markdown={assessment.report_markdown}
          ctaTier={assessment.cta_tier as 'studio' | 'growth'}
          assessmentId={id}
        />
      </div>
    </main>
  );
}
