import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth-server'
import { createServerClient } from '@repo/db/client'
import {
  getUserMembership,
  getUserOrgs,
  createCallImport,
} from '@repo/db/queries/content-engine'

/**
 * POST /api/content-engine/integrations/fireflies/connect
 * Store Fireflies API key for an org
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

    if (!body.api_key || typeof body.api_key !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Get user's org
    const orgs = await getUserOrgs(serviceClient, user.id)
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const org = orgs[0]

    // Check if user is owner or brand_official
    const membership = await getUserMembership(serviceClient, org.id, user.id)
    if (!membership || !['owner', 'brand_official'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized to manage integrations' }, { status: 403 })
    }

    // Store API key in org settings (encrypted in production)
    // For now, we'll store it in the settings JSONB field
    const { error: updateError } = await (serviceClient as any)
      .from('content_orgs')
      .update({
        settings: {
          ...((org as any).settings || {}),
          fireflies: {
            api_key: body.api_key, // In production, encrypt this
            connected_at: new Date().toISOString(),
            connected_by: user.id,
          },
        },
      })
      .eq('id', org.id)

    if (updateError) {
      throw new Error(`Failed to save API key: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Fireflies connected successfully',
    }, { status: 200 })
  } catch (error) {
    console.error('Error connecting Fireflies:', error)
    return NextResponse.json(
      { error: 'Failed to connect Fireflies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/content-engine/integrations/fireflies/connect
 * Check if Fireflies is connected
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

    // Get user's org
    const orgs = await getUserOrgs(serviceClient, user.id)
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const org = orgs[0]
    const settings = (org as any).settings || {}
    const fireflies = settings.fireflies || null

    return NextResponse.json({
      connected: !!fireflies?.api_key,
      connected_at: fireflies?.connected_at || null,
    }, { status: 200 })
  } catch (error) {
    console.error('Error checking Fireflies connection:', error)
    return NextResponse.json(
      { error: 'Failed to check connection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
