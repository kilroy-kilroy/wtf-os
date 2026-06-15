import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { createContract } from '@/lib/contracts/service';

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  try {
    const id = await createContract({
      templateId: body.templateId,
      title: body.title,
      fieldValues: body.fieldValues,
      sowHtml: body.sowHtml,
      signers: body.signers,
      createdBy: adminId,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'create failed' }, { status: 500 });
  }
}
