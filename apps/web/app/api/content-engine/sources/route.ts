import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth-server'
import { createServerClient } from '@repo/db/client'
import {
  createContentSource,
  searchContentSources,
  getUserMembership,
  getUserOrgs,
} from '@repo/db/queries/content-engine'
import { runModel, parseModelJSON, retryWithBackoff } from '@repo/utils'
import {
  CATEGORIZE_SYSTEM,
  CATEGORIZE_USER,
  type CategorizeResponse,
} from '@repo/prompts/content-engine'
import type { Theme4E, SourceType } from '@repo/db/types/content-engine'

/**
 * GET /api/content-engine/sources
 * Search/list content sources for an org
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')
    const query = searchParams.get('q') || undefined
    const theme4e = searchParams.get('theme') as Theme4E | null
    const sourceType = searchParams.get('type') as SourceType | null
    const authorId = searchParams.get('author') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // If no org_id provided, use first org user belongs to
    let targetOrgId = orgId
    if (!targetOrgId) {
      const orgs = await getUserOrgs(serviceClient, user.id)
      if (orgs.length === 0) {
        return NextResponse.json({ error: 'No organizations found' }, { status: 404 })
      }
      targetOrgId = orgs[0].id
    }

    // Check membership
    const membership = await getUserMembership(serviceClient, targetOrgId, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    const { sources, total } = await searchContentSources(serviceClient, targetOrgId, {
      query,
      theme4e: theme4e || undefined,
      sourceType: sourceType || undefined,
      authorId,
      limit,
      offset,
    })

    return NextResponse.json({
      sources,
      total,
      limit,
      offset,
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-engine/sources
 * Create a new content source
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()
    const body = await request.json()

    // Validate org_id
    if (!body.org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
    }

    // Check membership and role
    const membership = await getUserMembership(serviceClient, body.org_id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Only creators and above can add content
    if (!['owner', 'brand_official', 'creator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Distributors cannot add original content' }, { status: 403 })
    }

    // Validate content
    if (!body.raw_content || typeof body.raw_content !== 'string' || body.raw_content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content is required and must be at least 50 characters' },
        { status: 400 }
      )
    }

    const rawContent = body.raw_content.trim()

    // Auto-categorize if not provided
    let theme4e = body.theme_4e as Theme4E | undefined
    let synopsis = body.synopsis as string | undefined
    let sourceType = body.source_type as SourceType | undefined

    if (!theme4e || !synopsis) {
      try {
        const response = await retryWithBackoff(async () => {
          return await runModel(
            'content-engine-categorize',
            CATEGORIZE_SYSTEM,
            CATEGORIZE_USER({
              content: rawContent,
              title: body.title,
              sourceUrl: body.source_url,
            })
          )
        })

        const categorization = parseModelJSON<CategorizeResponse>(response.content)

        if (!theme4e) theme4e = categorization.theme_4e
        if (!synopsis) synopsis = categorization.synopsis
        if (!sourceType) sourceType = categorization.source_type
      } catch (categorizationError) {
        console.error('Auto-categorization failed:', categorizationError)
        // Continue without auto-categorization - use defaults
        if (!sourceType) sourceType = 'original'
      }
    }

    const source = await createContentSource(serviceClient, {
      org_id: body.org_id,
      author_id: user.id,
      title: body.title || undefined,
      source_url: body.source_url || undefined,
      source_type: sourceType,
      raw_content: rawContent,
      synopsis,
      theme_4e: theme4e,
      vvv_tags: body.vvv_tags || [],
      visibility: body.visibility || 'team',
    })

    return NextResponse.json({ source }, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Failed to create content source', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
