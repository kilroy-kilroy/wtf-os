import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { parseVttContent, titleFromFilename } from '@/lib/vtt';
import { generateSessionContent } from '@/lib/session-ai';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// POST /api/admin/sessions
// Upload a VTT file, parse it, generate synopsis + teaching via AI.
// Returns draft content for review (does NOT publish yet).
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'office-hours' | 'one-on-one' | null;
    const targetId = formData.get('target_id') as string | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file || !type || !targetId) {
      return NextResponse.json(
        { error: 'file, type, and target_id are required' },
        { status: 400 }
      );
    }

    // Read the VTT file
    const vttContent = await file.text();
    const parsedTranscript = parseVttContent(vttContent);

    if (!parsedTranscript.trim()) {
      return NextResponse.json(
        { error: 'VTT file appears to be empty or invalid' },
        { status: 400 }
      );
    }

    // Upload raw VTT to Supabase Storage
    const supabase = getSupabaseServerClient();
    const storagePath = type === 'one-on-one'
      ? `${targetId.replace('org:', 'org-')}/${Date.now()}-${file.name}`
      : `sessions/${Date.now()}-${file.name}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/vtt',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Sessions] Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(storagePath);

    // Get client/org name for 1:1s (for the AI prompt)
    let clientName: string | undefined;
    if (type === 'one-on-one') {
      if (targetId.startsWith('org:')) {
        // Org-level session — use the org name
        const orgId = targetId.replace('org:', '');
        const { data: org } = await (supabase as any)
          .from('orgs')
          .select('name')
          .eq('id', orgId)
          .single();
        clientName = org?.name || undefined;
      } else {
        const { data: enrollment } = await supabase
          .from('client_enrollments')
          .select('user_id')
          .eq('id', targetId)
          .single();

        if (enrollment?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
          clientName = authUser?.user?.user_metadata?.full_name || undefined;
        }
      }
    }

    // Generate synopsis + teaching via AI
    const aiResult = await generateSessionContent(parsedTranscript, type, clientName);

    const title = titleOverride || titleFromFilename(file.name);

    return NextResponse.json({
      title,
      synopsis: aiResult.synopsis,
      teaching: aiResult.teaching,
      vtt_url: urlData.publicUrl,
      original_filename: file.name,
      parsed_transcript: parsedTranscript,
    });
  } catch (error) {
    console.error('[Sessions] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/sessions — List all sessions (from both tables)
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get 1:1 sessions from client_documents
    const { data: oneOnOnes } = await supabase
      .from('client_documents')
      .select('id, title, category, created_at, enrollment_id')
      .eq('category', 'session')
      .order('created_at', { ascending: false });

    // Get office hours sessions from client_content
    const { data: officeHours } = await supabase
      .from('client_content')
      .select('id, title, content_type, published, created_at, program_ids')
      .eq('content_type', 'session')
      .order('created_at', { ascending: false });

    // Enrich 1:1 sessions with client names
    const enrichedOneOnOnes = await Promise.all(
      (oneOnOnes || []).map(async (doc) => {
        let clientName = 'Unknown Client';
        if (doc.enrollment_id) {
          const { data: enrollment } = await supabase
            .from('client_enrollments')
            .select('user_id')
            .eq('id', doc.enrollment_id)
            .single();
          if (enrollment?.user_id) {
            const { data: authUser } = await supabase.auth.admin.getUserById(enrollment.user_id);
            clientName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Unknown';
          }
        }
        return {
          ...doc,
          session_type: 'one-on-one' as const,
          status: 'published' as const,
          target_name: clientName,
        };
      })
    );

    // Enrich office hours with program names
    const enrichedOfficeHours = await Promise.all(
      (officeHours || []).map(async (item) => {
        let programName = 'All Programs';
        if (item.program_ids && item.program_ids.length > 0) {
          const { data: programs } = await supabase
            .from('client_programs')
            .select('name')
            .in('id', item.program_ids);
          programName = programs?.map((p: any) => p.name).join(', ') || 'Unknown Program';
        }
        return {
          ...item,
          session_type: 'office-hours' as const,
          status: item.published ? 'published' as const : 'draft' as const,
          target_name: programName,
        };
      })
    );

    const sessions = [...enrichedOneOnOnes, ...enrichedOfficeHours]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Sessions] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
