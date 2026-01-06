'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Org {
  id: string
  name: string
  slug: string
  billing_status: string
  role: string
}

interface Member {
  id: string
  user_id: string
  role: string
  accepted_at: string | null
}

interface Invite {
  id: string
  email: string
  role: string
  expires_at: string
}

export default function ContentHubSettings() {
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'distributor' | 'creator' | 'brand_official'>('distributor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Get org
      const orgsRes = await fetch('/api/content-engine/orgs')
      const orgsData = await orgsRes.json()
      if (orgsData.orgs?.length > 0) {
        const userOrg = orgsData.orgs[0]
        setOrg(userOrg)

        // Get org details including members
        const orgRes = await fetch(`/api/content-engine/orgs/${userOrg.slug}`)
        const orgData = await orgRes.json()
        setMembers(orgData.members || [])

        // Get invites
        const invitesRes = await fetch(`/api/content-engine/orgs/${userOrg.slug}/invite`)
        const invitesData = await invitesRes.json()
        setInvites(invitesData.invites || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email')
      return
    }

    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch(`/api/content-engine/orgs/${org?.slug}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      const data = await res.json()
      setInviteSuccess(`Invite sent! Share this link: ${data.inviteUrl}`)
      setInviteEmail('')
      fetchData() // Refresh invites list
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    brand_official: 'Brand Official',
    creator: 'Creator',
    distributor: 'Distributor',
  }

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-700',
    brand_official: 'bg-purple-100 text-purple-700',
    creator: 'bg-blue-100 text-blue-700',
    distributor: 'bg-gray-100 text-gray-700',
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[#e8e0d5] rounded w-1/4" />
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <div className="h-6 bg-[#e8e0d5] rounded w-1/2 mb-4" />
          <div className="h-4 bg-[#e8e0d5] rounded w-full mb-2" />
          <div className="h-4 bg-[#e8e0d5] rounded w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#2d2a26]">Settings</h1>
        <p className="text-[#8a8078] mt-1">Manage your organization and team</p>
      </div>

      {/* Organization Info */}
      <div className="bg-white rounded-xl border border-[#e8e0d5] p-6">
        <h2 className="text-lg font-medium text-[#2d2a26] mb-4">Organization</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-[#8a8078]">Name</Label>
            <p className="text-[#2d2a26] font-medium">{org?.name}</p>
          </div>
          <div>
            <Label className="text-[#8a8078]">Your Role</Label>
            <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${roleColors[org?.role || 'distributor']}`}>
              {roleLabels[org?.role || 'distributor']}
            </span>
          </div>
          <div>
            <Label className="text-[#8a8078]">Billing Status</Label>
            <p className="text-[#2d2a26] capitalize">{org?.billing_status || 'Trial'}</p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl border border-[#e8e0d5] p-6">
        <h2 className="text-lg font-medium text-[#2d2a26] mb-4">Team Members</h2>
        {members.length === 0 ? (
          <p className="text-[#8a8078]">No team members yet</p>
        ) : (
          <div className="divide-y divide-[#e8e0d5]">
            {members.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-[#2d2a26]">User {member.user_id.slice(0, 8)}...</p>
                  <p className="text-sm text-[#8a8078]">
                    {member.accepted_at ? 'Active' : 'Pending'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm font-medium ${roleColors[member.role]}`}>
                  {roleLabels[member.role]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Members */}
      {(org?.role === 'owner' || org?.role === 'brand_official') && (
        <div className="bg-white rounded-xl border border-[#e8e0d5] p-6">
          <h2 className="text-lg font-medium text-[#2d2a26] mb-4">Invite Team Members</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="inviteEmail">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inviteRole">Role</Label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="mt-1 h-10 px-3 border border-[#e8e0d5] rounded-md bg-white text-[#2d2a26]"
                >
                  <option value="distributor">Distributor</option>
                  <option value="creator">Creator</option>
                  <option value="brand_official">Brand Official</option>
                </select>
              </div>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}

            {inviteSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">{inviteSuccess}</p>
              </div>
            )}

            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="bg-[#c45a3b] hover:bg-[#b04a2d]"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#e8e0d5]">
              <h3 className="text-sm font-medium text-[#8a8078] mb-3">Pending Invites</h3>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between py-2 px-3 bg-[#faf8f5] rounded-lg">
                    <div>
                      <p className="text-sm text-[#2d2a26]">{invite.email}</p>
                      <p className="text-xs text-[#8a8078]">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[invite.role]}`}>
                      {roleLabels[invite.role]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
