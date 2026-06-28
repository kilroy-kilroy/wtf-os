// apps/web/app/api/client/documents/[id]/file/route.ts
//
// Permanent, login-gated download link for a client document.
//
// The link the portal hands out (`/api/client/documents/{id}/file`) never
// expires and never changes. On every click we:
//   1. confirm the visitor is logged in,
//   2. confirm the document belongs to one of their enrollments (or they're an admin),
//   3. mint a throwaway short-lived signed URL server-side and 302 to it.
//
// The Supabase `client-documents` bucket stays PRIVATE — the signed URL lives
// for seconds and the client never holds it. This is what lets us keep
// permanent links without making client documents publicly readable.
//
// EXCEPTION — HTML docs: Supabase Storage force-serves text/html objects as
// text/plain (+ nosniff), so a redirect would show raw source instead of a
// rendered page. For .html/.htm we instead stream the bytes from this route with
// Content-Type: text/html so it renders on OUR origin, locked down by a strict
// CSP (HTML_DOC_CSP) that blocks scripts/forms/framing.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'client-documents';
// Short on purpose: the browser follows the redirect immediately, so the URL is
// dead long before it could leak or be shared.
const SIGNED_URL_TTL_SECONDS = 60;

// CSP for HTML we serve inline from our OWN origin. Supabase Storage refuses to
// render HTML (it force-serves text/html objects as text/plain + nosniff, so the
// browser shows raw source). To render it we have to stream the bytes ourselves
// and set Content-Type: text/html — but that means admin-uploaded HTML would run
// with the logged-in client's session. This CSP neutralizes that: no scripts, no
// framing, no form posts; only inline styles, data-URI images, and Google Fonts.
const HTML_DOC_CSP = [
  "default-src 'none'",
  "img-src data: https:",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ');

/**
 * Derive the in-bucket object path from a legacy public URL, e.g.
 *   https://<ref>.supabase.co/storage/v1/object/public/client-documents/<path>
 *   → <path>
 * Older rows store this public URL in `file_url` with `storage_path` NULL.
 */
function storagePathFromFileUrl(fileUrl: string | null): string | null {
  if (!fileUrl) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = fileUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(fileUrl.slice(i + marker.length));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Must be logged in.
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseServerClient();

  // Load the document (service role — RLS bypass — we authorize manually below).
  const { data: doc } = await admin
    .from('client_documents')
    .select('id, enrollment_id, storage_path, file_url')
    .eq('id', id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 2. Authorize: admins see anything; clients only see docs on their own enrollment.
  const { data: userRow } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userRow?.is_admin) {
    const { data: enrollment } = await admin
      .from('client_enrollments')
      .select('id')
      .eq('id', doc.enrollment_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 3. Resolve the object path (new rows use storage_path; old rows derive from file_url).
  const storagePath = doc.storage_path || storagePathFromFileUrl(doc.file_url);
  if (!storagePath) {
    return NextResponse.json(
      { error: 'No file is associated with this document' },
      { status: 404 }
    );
  }

  // HTML must be served from our own origin to render: Supabase Storage downgrades
  // text/html objects to text/plain, so a redirect would show raw source. Stream
  // the bytes ourselves with Content-Type: text/html, locked down by HTML_DOC_CSP.
  if (/\.html?$/i.test(storagePath)) {
    const { data: blob, error: dlError } = await admin.storage
      .from(BUCKET)
      .download(storagePath);

    if (dlError || !blob) {
      console.error('[documents/file] html download failed', {
        id,
        storagePath,
        error: dlError?.message,
      });
      return NextResponse.json(
        { error: 'Could not load document' },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline',
        'Content-Security-Policy': HTML_DOC_CSP,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    console.error('[documents/file] sign failed', {
      id,
      storagePath,
      error: error?.message,
    });
    return NextResponse.json(
      { error: 'Could not generate file link' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
