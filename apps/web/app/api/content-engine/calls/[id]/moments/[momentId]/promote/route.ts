import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'
import {
  getCallImportById,
  updateCallImport,
  getUserMembership,
  createContentSource,
} from '@repo/db/queries/content-engine'
import type { ContentMoment } from '@repo/db/types/content-engine'

interface RouteParams {
  params: Promise<{ id: string; momentId: string }>
}

/**
 * POST /api/content-engine/calls/[id]/moments/[momentId]/promote
 * Promote a moment to the content repository
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, momentId } = await params
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const call = await getCallImportById(supabase, id)
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Check membership
    const membership = await getUserMembership(supabase, call.org_id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Only creators and above can add content
    if (!['owner', 'brand_official', 'creator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Distributors cannot add original content' }, { status: 403 })
    }

    // Find the moment
    const moments = call.extracted_moments as ContentMoment[]
    const moment = moments.find(m => m.id === momentId)
    if (!moment) {
      return NextResponse.json({ error: 'Moment not found' }, { status: 404 })
    }

    // Check if already promoted
    if (moment.promoted) {
      return NextResponse.json({ error: 'Moment already promoted' }, { status: 400 })
    }

    const body = await request.json()

    // Create content source from moment
    const source = await createContentSource(supabase, {
      org_id: call.org_id,
      author_id: user.id,
      title: body.title || `From: ${call.title || 'Call'}`,
      source_type: 'call',
      raw_content: moment.quote,
      theme_4e: moment.suggested4E,
      visibility: 'team',
    })

    // Update moment to mark as promoted
    const updatedMoments = moments.map(m =>
      m.id === momentId
        ? { ...m, promoted: true, promotedSourceId: source.id }
        : m
    )

    await updateCallImport(supabase, id, {
      extracted_moments: updatedMoments,
    })

    return NextResponse.json({
      source,
      moment: { ...moment, promoted: true, promotedSourceId: source.id },
    }, { status: 201 })
  } catch (error) {
    console.error('Error promoting moment:', error)
    return NextResponse.json(
      { error: 'Failed to promote moment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
