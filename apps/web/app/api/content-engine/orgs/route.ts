import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'
import {
  createContentOrg,
  addOrgMember,
  getUserOrgs,
} from '@repo/db/queries/content-engine'
import { nanoid } from 'nanoid'

/**
 * GET /api/content-engine/orgs
 * Get all orgs for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client for queries (bypasses RLS)
    const serviceClient = createServerClient()
    const orgs = await getUserOrgs(serviceClient, user.id)

    return NextResponse.json({ orgs }, { status: 200 })
  } catch (error) {
    console.error('Error fetching orgs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-engine/orgs
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client for mutations (bypasses RLS)
    const serviceClient = createServerClient()

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Organization name is required and must be at least 2 characters' },
        { status: 400 }
      )
    }

    const name = body.name.trim()

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Add random suffix to ensure uniqueness
    const slug = `${baseSlug}-${nanoid(6)}`

    // Create the organization
    const org = await createContentOrg(serviceClient, {
      name,
      slug,
      owner_id: user.id,
      billing_status: 'trial',
    })

    // Add owner as member with 'owner' role
    const membership = await addOrgMember(serviceClient, {
      org_id: org.id,
      user_id: user.id,
      role: 'owner',
      accepted_at: new Date().toISOString(),
    })

    return NextResponse.json(
      { org, membership },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating org:', error)
    return NextResponse.json(
      { error: 'Failed to create organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
