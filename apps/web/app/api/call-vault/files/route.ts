// apps/web/app/api/call-vault/files/route.ts
//
// Two modes, mirroring api/client/documents/route.ts:
//   { mode: 'sign',   callId, fileName, mimeType, sizeBytes } -> upload URL
//   { mode: 'commit', callId, storagePath, fileName, mimeType, sizeBytes } -> row
// The browser PUTs directly to Supabase Storage between the two, so a 200MB
// recording never passes through a Vercel function.
import { NextRequest, NextResponse } from 'next/server';
import { classifyFile, MAX_FILE_BYTES, MAX_FILES_PER_CALL } from '@/lib/call-vault/validate';
import { signUpload, commitFile, callBelongsTo, countFiles } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { mode, callId, fileName, mimeType, sizeBytes, storagePath } = body as {
    mode?: string; callId?: string; fileName?: string; mimeType?: string;
    sizeBytes?: number; storagePath?: string;
  };

  if (!callId || !fileName) {
    return NextResponse.json({ error: 'callId and fileName are required' }, { status: 400 });
  }
  if (!(await callBelongsTo(callId, contributor.id))) {
    return NextResponse.json({ error: 'Unknown call' }, { status: 403 });
  }

  const classified = classifyFile(fileName, mimeType || '');
  if (!classified.ok) return NextResponse.json({ error: classified.error }, { status: 400 });

  if (typeof sizeBytes === 'number' && sizeBytes > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 200MB' }, { status: 400 });
  }

  if (mode === 'sign') {
    if ((await countFiles(callId)) >= MAX_FILES_PER_CALL) {
      return NextResponse.json(
        { error: `Up to ${MAX_FILES_PER_CALL} files per call` }, { status: 400 },
      );
    }
    try {
      return NextResponse.json(await signUpload(contributor.id, callId, fileName));
    } catch (err) {
      console.error('[call-vault] signUpload failed:', err);
      return NextResponse.json({ error: 'Could not start that upload' }, { status: 500 });
    }
  }

  if (mode === 'commit') {
    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });
    }
    try {
      const fileId = await commitFile({
        contributorId: contributor.id,
        callId,
        storagePath,
        kind: classified.kind,
        fileName,
        mimeType: mimeType || null,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
      });
      return NextResponse.json({ fileId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'commit failed';
      const status = message.includes('does not belong') ? 403 : 500;
      if (status === 500) console.error('[call-vault] commitFile failed:', err);
      return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Could not save that file' }, { status });
    }
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}
