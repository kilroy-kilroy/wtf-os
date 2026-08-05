import { NextRequest, NextResponse } from 'next/server';
import { generateSessionContent } from '@/lib/session-ai';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { describeModelError } from '@repo/utils';

// POST /api/admin/sessions/regenerate
// Re-generate synopsis and/or teaching from transcript text.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { transcript, field, type, client_name } = await request.json();

    if (!transcript || !type) {
      return NextResponse.json(
        { error: 'transcript and type are required' },
        { status: 400 }
      );
    }

    const result = await generateSessionContent(transcript, type, client_name);

    if (field === 'synopsis') {
      return NextResponse.json({ synopsis: result.synopsis });
    } else if (field === 'teaching') {
      return NextResponse.json({ teaching: result.teaching });
    } else {
      return NextResponse.json({ synopsis: result.synopsis, teaching: result.teaching });
    }
  } catch (error) {
    console.error('[Sessions] Regenerate error:', error);
    // Provider failures (out of credits, rate limit, bad key) are actionable —
    // report them instead of collapsing everything into a generic 500.
    const providerError = describeModelError(error);
    if (providerError) {
      return NextResponse.json({ error: providerError }, { status: 502 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
