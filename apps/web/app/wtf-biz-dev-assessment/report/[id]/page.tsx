import { redirect } from 'next/navigation';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { createServerClient } from '@repo/db/client';
import { ReportContent } from './ReportContent';
import { StageProgress } from './StageProgress';
import ReportEngagementFooter from '@/components/ReportEngagementFooter';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function BizDevReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { admin } = await searchParams;

  // Magic-link exchange happens in /api/biz-dev/auth/[id] before reaching
  // this page. By the time we get here, the visitor must already have a
  // Supabase session — otherwise we send them to request a fresh link.
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  const svc = createServerClient();

  // ?admin=1 lets a signed-in admin view any report without owning it. Same
  // convention used by call-lab/discovery/visibility report pages.
  let isAdmin = false;
  if (admin === '1') {
    const { data: viewer } = await (svc as any)
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = Boolean(viewer?.is_admin);
  }

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

  if (!isAdmin && assessment.user_id !== user.id) {
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  if (assessment.report_status === 'failed') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-24">
          <p className="font-poppins text-xs uppercase tracking-[0.25em] text-brand mb-4">Synthesis failed</p>
          <h1 className="font-anton uppercase tracking-tight text-5xl md:text-6xl leading-none mb-6">
            Something went sideways generating your report.
          </h1>
          <p className="font-poppins text-lg text-muted-foreground mb-6">
            Your answers and research are saved. We just need to retry the AI step. Email{' '}
            <a href="mailto:tim@timkilroy.com" className="text-brand underline underline-offset-4">tim@timkilroy.com</a>{' '}
            and I&apos;ll get this regenerated for you.
          </p>
        </div>
      </main>
    );
  }

  if (assessment.report_status !== 'completed' || !assessment.report_markdown) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-24">
          <p className="font-poppins text-xs uppercase tracking-[0.25em] text-brand mb-4">Cooking</p>
          <h1 className="font-anton uppercase tracking-tight text-5xl md:text-6xl leading-none mb-6">
            Your report is being prepared.
          </h1>
          <p className="font-poppins text-lg text-muted-foreground mb-6">
            We&apos;re analyzing your website and LinkedIn alongside your answers. This usually takes 2 to 5 minutes. Refresh this page in a moment.
          </p>
          {/* eslint-disable-next-line @next/next/no-head-element */}
          <meta httpEquiv="refresh" content="5" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <StageProgress stage={assessment.stage as 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready'} />
        <ReportContent
          markdown={assessment.report_markdown}
          ctaTier={assessment.cta_tier as 'studio' | 'growth'}
          assessmentId={id}
          dimensions={assessment.dimensions ?? {}}
          compositeScore={assessment.composite_score ?? 0}
        />
        <ReportEngagementFooter
          currentTool="biz-dev"
          email={assessment.email ?? null}
          reportId={id}
          reportUrl={`/wtf-biz-dev-assessment/report/${id}`}
        />
      </div>
    </main>
  );
}
