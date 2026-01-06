import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'
import {
  getOrgCallImports,
  getCallImportById,
  updateCallImport,
  getUserMembership,
  getUserOrgs,
} from '@repo/db/queries/content-engine'

/**
 * GET /api/content-engine/calls
 * List call imports for an org
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

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

    const calls = await getOrgCallImports(serviceClient, targetOrgId, limit)

    return NextResponse.json({ calls }, { status: 200 })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calls', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
