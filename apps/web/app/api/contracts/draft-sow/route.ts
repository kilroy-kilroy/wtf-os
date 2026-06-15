import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { draftSow } from '@/lib/contracts/sow';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { particulars, context } = await req.json();
  try {
    const html = await draftSow(particulars ?? '', context ?? {});
    return NextResponse.json({ ok: true, html });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'draft failed' }, { status: 500 });
  }
}
