import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { copperSearchCompanies } from '@/lib/copper';

// Admin-gated company lookup for the new-contract "Pull from Copper" autofill.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ companies: [] });
  try {
    const companies = await copperSearchCompanies(q);
    return NextResponse.json({ companies });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'search failed', companies: [] },
      { status: 500 },
    );
  }
}
