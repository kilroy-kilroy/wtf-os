import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertDocumentShared } from '@/lib/slack';
import { sendEvent } from '@/lib/loops';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// GET /api/admin/documents?enrollment_id=xxx
// Returns all documents for a given enrollment, ordered by created_at desc
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const enrollmentId = request.nextUrl.searchParams.get('enrollment_id');

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'enrollment_id query param is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Documents] GET error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error('[Admin Documents] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/documents
// Create a document for a client enrollment.
// Accepts multipart/form-data (file upload) or application/json (link / text).
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const contentType = request.headers.get('content-type') || '';

    let enrollmentId: string | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let category: string | null = null;
    let documentType: string = 'file';
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let externalUrl: string | null = null;
    let contentBody: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // ── File upload ──────────────────────────────────────
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      enrollmentId = formData.get('enrollment_id') as string | null;
      title = formData.get('title') as string | null;
      description = formData.get('description') as string | null;
      category = formData.get('category') as string | null;

      if (!file || !enrollmentId) {
        return NextResponse.json(
          { error: 'file and enrollment_id are required' },
          { status: 400 }
        );
      }

      if (!title) {
        title = file.name;
      }

      documentType = 'file';
      fileName = file.name;

      // Upload to Supabase Storage
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `${enrollmentId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Admin Documents] Upload error:', uploadError);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(storagePath);

      fileUrl = urlData.publicUrl;
    } else {
      // ── JSON body (link or text) ─────────────────────────
      const body = await request.json();
      enrollmentId = body.enrollment_id || null;
      title = body.title || null;
      description = body.description || null;
      documentType = body.document_type || 'link';
      category = body.category || null;
      externalUrl = body.external_url || null;
      contentBody = body.content_body || null;

      if (!enrollmentId || !title) {
        return NextResponse.json(
          { error: 'enrollment_id and title are required' },
          { status: 400 }
        );
      }

      if (documentType === 'link' && !externalUrl) {
        return NextResponse.json(
          { error: 'external_url is required for link documents' },
          { status: 400 }
        );
      }

      if (documentType === 'text' && !contentBody) {
        return NextResponse.json(
          { error: 'content_body is required for text documents' },
          { status: 400 }
        );
      }
    }

    // Verify enrollment exists and get user info for notifications
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id, user_id')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    let clientEmail = '';
    let clientName = 'Client';
    if (enrollment.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
      clientEmail = authUser?.user?.email || '';
      clientName = authUser?.user?.user_metadata?.full_name || clientEmail || 'Client';
    }

    // Insert document record
    const { data: document, error: insertError } = await supabase
      .from('client_documents')
      .insert({
        enrollment_id: enrollmentId,
        uploaded_by: 'admin',
        title,
        description,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        external_url: externalUrl,
        content_body: contentBody,
        category: category || 'other',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Admin Documents] Insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fire-and-forget Slack notification
    alertDocumentShared(clientName, title!);

    // Fire Loops event if client has email
    if (clientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      sendEvent({
        email: clientEmail,
        eventName: 'client_document_shared',
        eventProperties: {
          documentTitle: title!,
          documentCategory: category || 'other',
          portalUrl: `${appUrl}/client/documents`,
        },
      }).catch(err => console.error('[Admin Documents] Loops event failed:', err));
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('[Admin Documents] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/documents
// Body: { document_id }
export async function DELETE(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: 'document_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Fetch the document to check for file storage cleanup
    const { data: doc } = await supabase
      .from('client_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If there's an uploaded file, clean up storage
    if (doc.file_url) {
      try {
        const url = new URL(doc.file_url);
        const storagePath = url.pathname.split('/client-documents/').pop();
        if (storagePath) {
          await supabase.storage
            .from('client-documents')
            .remove([decodeURIComponent(storagePath)]);
        }
      } catch (storageErr) {
        // Log but don't block deletion if storage cleanup fails
        console.error('[Admin Documents] Storage cleanup error:', storageErr);
      }
    }

    // Delete DB record
    const { error } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', document_id);

    if (error) {
      console.error('[Admin Documents] Delete error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Documents] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
