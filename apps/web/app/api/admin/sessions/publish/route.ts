import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { alertDocumentShared } from '@/lib/slack';
import { sendEvent } from '@/lib/loops';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions/publish
// Publish a reviewed session to the appropriate table.
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, target_id, title, synopsis, teaching, vtt_url, original_filename } = body;

    if (!type || !target_id || !title || !synopsis || !teaching || !vtt_url) {
      return NextResponse.json(
        { error: 'type, target_id, title, synopsis, teaching, and vtt_url are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const contentBody = JSON.stringify({ synopsis, teaching, original_filename });

    if (type === 'one-on-one') {
      // Insert into client_documents
      const { data: doc, error } = await supabase
        .from('client_documents')
        .insert({
          enrollment_id: target_id,
          title,
          document_type: 'text',
          category: 'session',
          content_body: contentBody,
          file_url: vtt_url,
          file_name: original_filename,
        })
        .select()
        .single();

      if (error) {
        console.error('[Sessions] Publish 1:1 error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Notify via Slack + email
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('user_id')
        .eq('id', target_id)
        .single();

      if (enrollment?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
        const clientEmail = authUser?.user?.email || '';
        const clientName = authUser?.user?.user_metadata?.full_name || clientEmail || 'Client';

        alertDocumentShared(clientName, title);

        if (clientEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
          sendEvent({
            email: clientEmail,
            eventName: 'client_document_shared',
            eventProperties: {
              documentTitle: title,
              documentCategory: 'session',
              portalUrl: `${appUrl}/client/documents`,
            },
          }).catch(err => console.error('[Sessions] Loops event failed:', err));
        }
      }

      return NextResponse.json({ success: true, document: doc });
    } else if (type === 'office-hours') {
      // Resolve program slug to ID
      const { data: program } = await supabase
        .from('client_programs')
        .select('id')
        .eq('slug', target_id)
        .single();

      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 });
      }

      const { data: content, error } = await supabase
        .from('client_content')
        .insert({
          title,
          content_type: 'session',
          content_body: contentBody,
          content_url: vtt_url,
          program_ids: [program.id],
          published: true,
          published_at: new Date().toISOString(),
          sort_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[Sessions] Publish office hours error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ success: true, content });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Sessions] Publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
