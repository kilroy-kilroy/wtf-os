// apps/web/app/api/person/[id]/refresh-summary/route.ts
//
// Person View "Refresh" button target. Regenerates the cached
// contact_summaries row for one contact, then redirects back to the page so
// it re-renders with the fresh row. Best-effort: generateContactSummary
// never throws (it logs and returns null on any failure), so a model or DB
// hiccup here still lands the user back on /person/[id] rather than a 500.
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { createClient } from '@/lib/supabase-auth-server';
import { generateContactSummary } from '@/lib/timeline/summary';

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth guard: this route triggers a billed Anthropic call via
  // generateContactSummary and is excluded from middleware (api/ paths), so
  // it must check for an authenticated user itself.
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    await generateContactSummary(supabase, id);
  } catch (err) {
    // Belt-and-suspenders: generateContactSummary already guards internally,
    // but a POST-then-redirect flow should never surface a 500 to the form.
    console.error('[person] refresh-summary failed', err);
  }

  // 303: force the browser to GET /person/[id] instead of resubmitting the POST.
  return NextResponse.redirect(new URL(`/person/${id}`, request.url), 303);
}
