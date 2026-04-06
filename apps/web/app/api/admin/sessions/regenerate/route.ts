import { NextRequest, NextResponse } from 'next/server';
import { generateSessionContent } from '@/lib/session-ai';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions/regenerate
// Re-generate synopsis and/or teaching from transcript text.
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
