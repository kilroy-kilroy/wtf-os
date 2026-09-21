import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { voidContract } from '@/lib/contracts/service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    const { emailsSent } = await voidContract(id);
    return NextResponse.json({ ok: true, emailsSent });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'void failed' }, { status: 500 });
  }
}
