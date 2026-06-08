import { NextRequest, NextResponse } from 'next/server';
import { onReportRevisited } from '@/lib/loops';

// Best-effort re-engagement ping from the report page footer.
export async function POST(request: NextRequest) {
  try {
    const { email, tool, reportId, reportUrl } = await request.json();
    if (email && tool && reportId) {
      await onReportRevisited(email, tool, reportId, reportUrl || '');
    }
  } catch (err) {
    console.error('[revisit] failed (non-blocking):', err);
  }
  return NextResponse.json({ ok: true });
}
