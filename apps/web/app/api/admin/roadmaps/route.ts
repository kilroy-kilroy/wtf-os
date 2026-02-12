import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

// GET /api/admin/roadmaps?enrollment_id=xxx
// Returns all roadmaps, or filtered by enrollment_id
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const enrollmentId = request.nextUrl.searchParams.get('enrollment_id');

    let query = supabase
      .from('client_roadmaps')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (enrollmentId) {
      query = query.eq('enrollment_id', enrollmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Admin Roadmaps] GET error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ roadmaps: data || [] });
  } catch (error) {
    console.error('[Admin Roadmaps] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/roadmaps
// Upload a roadmap file for a client
// Expects multipart form data: file, enrollment_id, title (optional), description (optional)
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const enrollmentId = formData.get('enrollment_id') as string | null;
    const title = (formData.get('title') as string) || '6-Month Go Forward Roadmap';
    const description = formData.get('description') as string | null;

    if (!file || !enrollmentId) {
      return NextResponse.json({ error: 'file and enrollment_id are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify enrollment exists
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'html';
    const storagePath = `${enrollmentId}/${Date.now()}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('client-roadmaps')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'text/html',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Admin Roadmaps] Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('client-roadmaps')
      .getPublicUrl(storagePath);

    // Insert roadmap record
    const { data: roadmap, error: insertError } = await supabase
      .from('client_roadmaps')
      .insert({
        enrollment_id: enrollmentId,
        title,
        description,
        file_url: urlData.publicUrl,
        file_name: file.name,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Admin Roadmaps] Insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ roadmap });
  } catch (error) {
    console.error('[Admin Roadmaps] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/roadmaps
// Body: { roadmap_id }
export async function DELETE(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { roadmap_id } = await request.json();

    if (!roadmap_id) {
      return NextResponse.json({ error: 'roadmap_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get the roadmap to find the file URL for storage cleanup
    const { data: roadmap } = await supabase
      .from('client_roadmaps')
      .select('*')
      .eq('id', roadmap_id)
      .single();

    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    // Extract storage path from URL and delete file
    const url = new URL(roadmap.file_url);
    const storagePath = url.pathname.split('/client-roadmaps/').pop();
    if (storagePath) {
      await supabase.storage
        .from('client-roadmaps')
        .remove([decodeURIComponent(storagePath)]);
    }

    // Delete DB record
    const { error } = await supabase
      .from('client_roadmaps')
      .delete()
      .eq('id', roadmap_id);

    if (error) {
      console.error('[Admin Roadmaps] Delete error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Roadmaps] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
