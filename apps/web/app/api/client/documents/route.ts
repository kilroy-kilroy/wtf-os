// apps/web/app/api/client/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

const BUCKET = 'client-documents';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

async function getAuthedEnrollment() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const admin = getSupabaseServerClient();
  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!enrollment) return { error: 'Enrollment not found' as const, status: 404 };
  return { user, enrollmentId: enrollment.id, admin };
}

/**
 * POST — two modes:
 *   1. { mode: 'sign', category, fileName, mimeType, sizeBytes }
 *      → returns { storagePath, uploadUrl, token } for direct-to-storage PUT.
 *   2. { mode: 'commit', storagePath, category, fileName, mimeType, sizeBytes }
 *      → after successful PUT, inserts the row in client_documents.
 */
export async function POST(request: NextRequest) {
  const resolved = await getAuthedEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { user, enrollmentId, admin } = resolved;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const mode = (body as { mode?: string }).mode;

  if (mode === 'sign') {
    const { category, fileName, sizeBytes } = body as {
      category?: string; fileName?: string; sizeBytes?: number;
    };
    if (!category || !fileName) {
      return NextResponse.json({ error: 'category and fileName required' }, { status: 400 });
    }
    if (typeof sizeBytes === 'number' && sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_BYTES} bytes` }, { status: 400 });
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${enrollmentId}/${category}/${randomUUID()}-${safeName}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
    }
    return NextResponse.json({ storagePath, uploadUrl: data.signedUrl, token: data.token });
  }

  if (mode === 'commit') {
    const { storagePath, category, fileName, mimeType, sizeBytes, title } = body as {
      storagePath?: string; category?: string; fileName?: string;
      mimeType?: string; sizeBytes?: number; title?: string;
    };
    if (!storagePath || !category || !fileName) {
      return NextResponse.json({ error: 'storagePath, category, fileName required' }, { status: 400 });
    }
    if (!storagePath.startsWith(`${enrollmentId}/`)) {
      return NextResponse.json({ error: 'storagePath does not belong to your enrollment' }, { status: 403 });
    }

    const { data: inserted, error } = await admin
      .from('client_documents')
      .insert({
        enrollment_id: enrollmentId,
        category,
        title: title ?? fileName,
        document_type: 'file',
        file_name: fileName,
        storage_path: storagePath,
        mime_type: mimeType ?? null,
        size_bytes: sizeBytes ?? null,
        uploaded_by: user.id,
      })
      .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: inserted });
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}

/**
 * DELETE /api/client/documents?id=<uuid>
 */
export async function DELETE(request: NextRequest) {
  const resolved = await getAuthedEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { data: doc } = await admin
    .from('client_documents')
    .select('id, enrollment_id, storage_path')
    .eq('id', id)
    .single();

  if (!doc || doc.enrollment_id !== enrollmentId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.storage_path) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]);
  }
  const { error } = await admin.from('client_documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
