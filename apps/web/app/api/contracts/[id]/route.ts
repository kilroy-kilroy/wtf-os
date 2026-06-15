import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Delete a contract (signers cascade via FK). Guarded to non-sent states so a
// live/completed envelope can't be deleted out from under Firma.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const db = getSupabaseServerClient();

  const { data: contract } = await db.from('contracts').select('status').eq('id', id).single();
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['draft', 'sending', 'voided', 'declined'].includes(contract.status)) {
    return NextResponse.json({ error: `Cannot delete a contract in '${contract.status}' state` }, { status: 409 });
  }

  const { error } = await db.from('contracts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
