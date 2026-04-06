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
      // Resolve enrollment IDs — single enrollment or all enrollments in an org
      let enrollmentIds: string[] = [];

      if (target_id.startsWith('org:')) {
        const orgId = target_id.replace('org:', '');
        // Find all users in this org, then find their active enrollments
        const { data: orgUsers } = await (supabase as any)
          .from('users')
          .select('id')
          .eq('org_id', orgId);

        if (orgUsers && orgUsers.length > 0) {
          const userIds = orgUsers.map((u: any) => u.id);
          const { data: orgEnrollments } = await supabase
            .from('client_enrollments')
            .select('id')
            .in('user_id', userIds)
            .eq('status', 'active');
          enrollmentIds = (orgEnrollments || []).map((e) => e.id);
        }

        if (enrollmentIds.length === 0) {
          return NextResponse.json({ error: 'No active enrollments found for this org' }, { status: 404 });
        }
      } else {
        enrollmentIds = [target_id];
      }

      // Insert a document for each enrollment
      const docs = [];
      const errors = [];
      for (const enrollmentId of enrollmentIds) {
        const { data: doc, error } = await supabase
          .from('client_documents')
          .insert({
            enrollment_id: enrollmentId,
            title,
            document_type: 'text',
            category: 'transcript',
            content_body: contentBody,
            file_url: vtt_url,
            file_name: original_filename,
          })
          .select()
          .single();

        if (error) {
          console.error(`[Sessions] Publish 1:1 error for enrollment ${enrollmentId}:`, error);
          errors.push({ enrollmentId, error: error.message });
          continue;
        }
        docs.push(doc);

        // Notify via Slack + email
        const { data: enrollment } = await supabase
          .from('client_enrollments')
          .select('user_id')
          .eq('id', enrollmentId)
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
      }

      if (docs.length === 0) {
        return NextResponse.json(
          { error: `Failed to publish to any enrollment`, details: errors },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, documents: docs, count: docs.length, errors });
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

      // Notify all clients enrolled in the target program
      const { data: enrollments } = await supabase
        .from('client_enrollments')
        .select('user_id')
        .eq('program_id', program.id)
        .eq('status', 'active');

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      let notifiedCount = 0;

      for (const enrollment of enrollments || []) {
        const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
        const clientEmail = authUser?.user?.email;
        if (!clientEmail) continue;

        const clientName = authUser?.user?.user_metadata?.full_name || clientEmail;
        alertDocumentShared(clientName, title);

        sendEvent({
          email: clientEmail,
          eventName: 'client_document_shared',
          eventProperties: {
            documentTitle: title,
            documentCategory: 'office-hours',
            portalUrl: `${appUrl}/client/content`,
          },
        }).catch(err => console.error(`[Sessions] Loops event failed for ${clientEmail}:`, err));

        notifiedCount++;
      }

      console.log(`[Sessions] Office hours published, notified ${notifiedCount} clients`);
      return NextResponse.json({ success: true, content, notifiedCount });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Sessions] Publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
