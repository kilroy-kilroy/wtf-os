// apps/web/app/api/call-vault/files/route.ts
//
// Two modes, mirroring api/client/documents/route.ts:
//   { mode: 'sign',   callId, fileName, mimeType, sizeBytes } -> upload URL
//   { mode: 'commit', callId, storagePath, fileName, mimeType, sizeBytes } -> row
// The browser PUTs directly to Supabase Storage between the two, so a 200MB
// recording never passes through a Vercel function.
import { NextRequest, NextResponse } from 'next/server';
import { classifyFile, ownsStoragePath, MAX_FILE_BYTES, MAX_FILES_PER_CALL } from '@/lib/call-vault/validate';
import { signUpload, commitFile, callBelongsTo, countFiles, countStoredObjects } from '@/lib/call-vault/db';
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
    // Cap on BOTH what's committed in the DB and what's actually sitting in
    // storage under this call. `countFiles` alone only counts committed rows,
    // so a client that signs repeatedly and never commits would keep that
    // count at 0 forever while pushing unlimited 200MB objects into the
    // bucket with no DB trace — `countStoredObjects` closes that gap.
    const [committed, stored] = await Promise.all([
      countFiles(callId),
      countStoredObjects(contributor.id, callId),
    ]);
    if (committed >= MAX_FILES_PER_CALL || stored >= MAX_FILES_PER_CALL) {
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
    // Same cap as `sign`, enforced again here: without this, a client can
    // sign once and then POST `commit` repeatedly (with distinct storagePaths
    // it already has signed URLs for, or by re-committing) to create
    // unbounded rows for one call.
    if ((await countFiles(callId)) >= MAX_FILES_PER_CALL) {
      return NextResponse.json(
        { error: `Up to ${MAX_FILES_PER_CALL} files per call` }, { status: 400 },
      );
    }
    // Ownership is checked explicitly here (not just inferred from whatever
    // error message `commitFile` happens to throw) so that a future wording
    // change inside commitFile can't silently downgrade a security rejection
    // into a generic 500. `commitFile` still re-checks this itself as
    // defence in depth.
    if (!ownsStoragePath(storagePath, contributor.id)) {
      console.error('[call-vault] commit rejected: storagePath does not belong to contributor', {
        contributorId: contributor.id,
        callId,
        storagePath,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      console.error('[call-vault] commitFile failed:', err);
      return NextResponse.json({ error: 'Could not save that file' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}
