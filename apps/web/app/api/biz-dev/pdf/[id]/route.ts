import { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { createServerClient } from '@repo/db/client';
import { ReportPdf } from '@/components/biz-dev-assessment/ReportPdf';
import React from 'react';

const STAGE_LABELS: Record<string, string> = {
  all_founder_no_system: 'All Founder, No System',
  half_built_engine: 'Half-Built Engine',
  engine_online_hire_ready: 'Engine Online, Hire-Ready',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const svc = createServerClient();
  const { data: row } = await (svc as any)
    .from('biz_dev_assessments')
    .select('user_id, name, report_markdown, stage, composite_score, cta_tier, report_status')
    .eq('id', id)
    .single();

  if (!row || row.user_id !== user.id) return new Response('Not found', { status: 404 });
  if (row.report_status !== 'completed' || !row.report_markdown) {
    return new Response('Report not ready', { status: 425 });
  }

  const pdfBuffer = await renderToBuffer(
    React.createElement(ReportPdf, {
      markdown: row.report_markdown,
      stage: STAGE_LABELS[row.stage] ?? row.stage,
      composite: row.composite_score,
      ctaTier: row.cta_tier,
      name: row.name,
    }) as any
  );

  return new Response(pdfBuffer as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bd-readiness-${id.slice(0, 8)}.pdf"`,
    },
  });
}
