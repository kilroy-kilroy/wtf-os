import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Admin-only: Manage client content
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, content_type, content_url, content_body, thumbnail_url, program_slugs, sort_order, published } = body;

    if (!title || !content_type) {
      return NextResponse.json({ error: 'title and content_type are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Resolve program slugs to IDs
    let program_ids: string[] = [];
    if (program_slugs && program_slugs.length > 0) {
      const { data: programs } = await supabase
        .from('client_programs')
        .select('id')
        .in('slug', program_slugs);

      program_ids = programs?.map(p => p.id) || [];
    }

    const { data: content, error } = await supabase
      .from('client_content')
      .insert({
        title,
        description: description || null,
        content_type,
        content_url: content_url || null,
        content_body: content_body || null,
        thumbnail_url: thumbnail_url || null,
        program_ids,
        sort_order: sort_order || 0,
        published: published || false,
        published_at: published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create content', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('Content create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin-only: List all content
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data: content } = await supabase
      .from('client_content')
      .select('*')
      .order('sort_order', { ascending: true });

    return NextResponse.json({ content: content || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/client/content
 * Update a content item
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Allowlist updatable fields to prevent mass assignment
    const allowedFields = [
      'title', 'description', 'content_type', 'content_url',
      'content_body', 'thumbnail_url', 'program_ids', 'sort_order', 'published',
    ];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    // Resolve program slugs to IDs if provided
    if (body.program_slugs) {
      const { data: programs } = await supabase
        .from('client_programs')
        .select('id')
        .in('slug', body.program_slugs);
      updates.program_ids = programs?.map((p: any) => p.id) || [];
    }

    // Handle published toggle
    if ('published' in updates) {
      updates.published_at = updates.published ? new Date().toISOString() : null;
    }

    const { data: content, error } = await supabase
      .from('client_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/client/content
 * Delete a content item
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('client_content')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Delete failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Content delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
