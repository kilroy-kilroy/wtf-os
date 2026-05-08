import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@repo/db/client';
import { generateMagicLink } from '@/lib/biz-dev-auth';
import { onBizDevReportGenerated } from '@/lib/loops';

const schema = z.object({
  email: z.string().email(),
  assessmentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    const { email, assessmentId } = parsed.data;

    const svc = createServerClient();
    const { data: row } = await (svc as any)
      .from('biz_dev_assessments')
      .select('email, name, verdict, stage, composite_score, cta_tier, dominant_trap, dimensions')
      .eq('id', assessmentId)
      .single() as { data: Record<string, any> | null };

    // Always return success to avoid confirming whether email matches
    if (!row || row.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://timkilroy.com';
    const magicLinkUrl = await generateMagicLink(email, `${siteUrl}/wtf-biz-dev-assessment/report/${assessmentId}`);

    const dimEntries = Object.entries(row.dimensions as Record<string, number>);
    dimEntries.sort((a, b) => a[1] - b[1]);
    const dimLabels: Record<string, string> = {
      lead_flow: 'Lead Flow', sales_process: 'Sales Process',
      icp_offer: 'ICP & Offer Clarity', founder_readiness: 'Founder Readiness',
      proof_enablement: 'Proof & Enablement',
    };
    const stageLabels: Record<string, string> = {
      all_founder_no_system: 'All Founder, No System',
      half_built_engine: 'Half-Built Engine',
      engine_online_hire_ready: 'Engine Online, Hire-Ready',
    };

    await onBizDevReportGenerated({
      email,
      name: row.name,
      verdict: row.verdict,
      stage: stageLabels[row.stage] ?? row.stage,
      composite: row.composite_score,
      cta_tier: row.cta_tier,
      dominant_trap: row.dominant_trap,
      top_3_gaps: dimEntries.slice(0, 3).map(([d]) => dimLabels[d] ?? d),
      magic_link_url: magicLinkUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[biz-dev:resend-link]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
