import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth-server'
import { createServerClient } from '@repo/db/client'
import {
  getContentOrgBySlug,
  getUserMembership,
  createInvite,
  getOrgInvites,
} from '@repo/db/queries/content-engine'
import { nanoid } from 'nanoid'
import type { OrgRole } from '@repo/db/types/content-engine'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/content-engine/orgs/[slug]/invite
 * Get pending invites for an org
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

    // Check if user is owner or brand_official
    const membership = await getUserMembership(serviceClient, org.id, user.id)
    if (!membership || !['owner', 'brand_official'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized to view invites' }, { status: 403 })
    }

    const invites = await getOrgInvites(serviceClient, org.id)

    return NextResponse.json({ invites }, { status: 200 })
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-engine/orgs/[slug]/invite
 * Create an invitation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check if user is owner or brand_official
    const membership = await getUserMembership(serviceClient, org.id, user.id)
    if (!membership || !['owner', 'brand_official'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized to invite members' }, { status: 403 })
    }

    const body = await request.json()

    // Validate email
    if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Validate role
    const validRoles: OrgRole[] = ['brand_official', 'creator', 'distributor']
    const role = body.role || 'distributor'
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Generate token and expiry
    const token = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    const invite = await createInvite(serviceClient, {
      org_id: org.id,
      email: body.email.toLowerCase().trim(),
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })

    // TODO: Send email via Resend
    // For now, return the invite with token for manual sharing
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/content-hub/invite/${token}`

    return NextResponse.json({
      invite,
      inviteUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
