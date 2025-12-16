'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Invite = {
  email: string;
  role: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
};

const ROLE_OPTIONS = [
  'Sales Manager',
  'Account Executive',
  'SDR / BDR',
  'RevOps',
  'Other'
];

export default function InviteTeamPage() {
  const [invites, setInvites] = useState<Invite[]>([
    { email: '', role: 'Account Executive', status: 'pending' }
  ]);
  const [orgName, setOrgName] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user's org
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, org_id')
          .eq('id', user.id)
          .single();

        if (userData?.full_name) {
          setInviterName(userData.full_name.split(' ')[0]);
        }

        if (userData?.org_id) {
          const { data: orgData } = await supabase
            .from('orgs')
            .select('name')
            .eq('id', userData.org_id)
            .single();

          if (orgData?.name) {
            setOrgName(orgData.name);
          }
        }
      }
    };
    init();
  }, [supabase]);

  const addInviteRow = () => {
    setInvites([...invites, { email: '', role: 'Account Executive', status: 'pending' }]);
  };

  const removeInviteRow = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const updateInvite = (index: number, field: 'email' | 'role', value: string) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessCount(0);

    const validInvites = invites.filter(inv => inv.email.trim() !== '');
    if (validInvites.length === 0) {
      setError('Please enter at least one email address');
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's org
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!userData?.org_id) throw new Error('No organization found');

      let sentCount = 0;

      for (let i = 0; i < invites.length; i++) {
        const invite = invites[i];
        if (!invite.email.trim()) continue;

        // Update status to sending
        const updated = [...invites];
        updated[i] = { ...updated[i], status: 'sending' };
        setInvites(updated);

        try {
          // Generate invite token
          const token = crypto.randomUUID();

          // Create invite record
          const { error: inviteError } = await supabase
            .from('invites')
            .insert({
              org_id: userData.org_id,
              inviter_user_id: user.id,
              email: invite.email.trim().toLowerCase(),
              role: invite.role,
              token: token,
              status: 'pending',
            });

          if (inviteError) throw inviteError;

          // TODO: Send email via API route
          // For now, just mark as sent

          const finalUpdated = [...invites];
          finalUpdated[i] = { ...finalUpdated[i], status: 'sent' };
          setInvites(finalUpdated);
          sentCount++;
        } catch (err) {
          const errorUpdated = [...invites];
          errorUpdated[i] = { ...errorUpdated[i], status: 'error' };
          setInvites(errorUpdated);
        }
      }

      setSuccessCount(sentCount);

      // Update org mode to team if invites were sent
      if (sentCount > 0) {
        await supabase
          .from('orgs')
          .update({ mode: 'team' })
          .eq('id', userData.org_id);
      }
    } catch (err: any) {
      console.error('Invite error:', err);
      setError(err.message || 'Failed to send invites');
    } finally {
      setIsLoading(false);
    }
  };

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/join`
    : '';

  return (
    <div className="min-h-screen bg-black text-white font-poppins py-12 px-4">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-anton text-[clamp(32px,5vw,48px)] tracking-[3px] mb-3 leading-none uppercase">
            INVITE YOUR <span className="text-[#FFDE59]">TEAM</span>
          </h1>
          <p className="text-[#B3B3B3] text-lg">
            Send invites so everyone can upload calls, get grades, and see the same scoreboard.
          </p>
        </div>

        {/* Invite Link Section */}
        <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded-lg mb-8">
          <h3 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wide mb-3">
            Share Invite Link
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-black border border-[#333333] text-[#777] px-4 py-3 text-sm rounded"
            />
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="bg-[#FFDE59] text-black px-4 py-3 font-anton text-sm uppercase tracking-wider rounded hover:bg-[#E5C640] transition"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-[#555] mt-2">
            Anyone with this link can join {orgName || 'your workspace'}.
          </p>
        </div>

        {/* Email Invites Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded-lg relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23] rounded-l-lg" />

            <h3 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wide mb-4">
              Or invite by email
            </h3>

            <div className="space-y-3">
              {invites.map((invite, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={invite.email}
                    onChange={(e) => updateInvite(index, 'email', e.target.value)}
                    disabled={invite.status === 'sending' || invite.status === 'sent'}
                    className="flex-1 bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded disabled:opacity-50"
                  />
                  <select
                    value={invite.role}
                    onChange={(e) => updateInvite(index, 'role', e.target.value)}
                    disabled={invite.status === 'sending' || invite.status === 'sent'}
                    className="bg-black border border-[#333333] text-white px-3 py-3 text-sm focus:border-[#E51B23] focus:outline-none rounded appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  {/* Status indicator */}
                  {invite.status === 'sent' && (
                    <span className="text-green-500 text-sm">✓</span>
                  )}
                  {invite.status === 'error' && (
                    <span className="text-red-500 text-sm">✗</span>
                  )}
                  {invite.status === 'sending' && (
                    <span className="text-yellow-500 text-sm animate-pulse">...</span>
                  )}

                  {invites.length > 1 && invite.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => removeInviteRow(index)}
                      className="text-[#777] hover:text-[#E51B23] transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addInviteRow}
              className="mt-4 text-[#FFDE59] text-sm hover:underline"
            >
              + Add another teammate
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-[#E51B23]/20 border border-[#E51B23] rounded p-4">
              <p className="text-[#E51B23] text-sm">{error}</p>
            </div>
          )}

          {successCount > 0 && (
            <div className="mt-4 bg-green-500/20 border border-green-500 rounded p-4">
              <p className="text-green-400 text-sm">
                {successCount} invite{successCount > 1 ? 's' : ''} sent successfully!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[#E51B23] text-white border-none py-4 px-6 font-anton text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              {isLoading ? '[ SENDING... ]' : '[ SEND INVITES ]'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/dashboard"
              className="text-[#777] text-sm hover:text-[#FFDE59] transition"
            >
              Skip for now → Go to Dashboard
            </Link>
          </div>
        </form>

        {/* Confirmation message */}
        {successCount > 0 && (
          <div className="mt-8 text-center">
            <p className="text-[#FFDE59] text-sm mb-4">
              You&apos;re now building your team workspace.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#FFDE59] text-black py-3 px-6 font-anton text-sm uppercase tracking-wider rounded hover:bg-[#E5C640] transition"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
