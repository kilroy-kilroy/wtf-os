import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth-server'
import { createServerClient } from '@repo/db/client'
import {
  getContentOrgBySlug,
  updateContentOrg,
  getUserMembership,
  getOrgMembers,
} from '@repo/db/queries/content-engine'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/content-engine/orgs/[slug]
 * Get organization details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()

    // Get org
    const org = await getContentOrgBySlug(serviceClient, slug)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check membership
    const membership = await getUserMembership(serviceClient, org.id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get members
    const members = await getOrgMembers(serviceClient, org.id)

    return NextResponse.json({
      org,
      membership,
      members,
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching org:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/content-engine/orgs/[slug]
 * Update organization settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()

    // Get org
    const org = await getContentOrgBySlug(serviceClient, slug)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user is owner
    if (org.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can update organization settings' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow updating certain fields
    const updates: Record<string, any> = {}
    if (body.name && typeof body.name === 'string') {
      updates.name = body.name.trim()
    }
    if (body.settings && typeof body.settings === 'object') {
      updates.settings = body.settings
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const updatedOrg = await updateContentOrg(serviceClient, org.id, updates)

    return NextResponse.json({ org: updatedOrg }, { status: 200 })
  } catch (error) {
    console.error('Error updating org:', error)
    return NextResponse.json(
      { error: 'Failed to update organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
