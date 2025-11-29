'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  SalesOSHeader
} from '@/components/console';
import { createBrowserClient } from '@repo/db';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  plan: 'lite' | 'solo' | 'team' | null;
  company_name: string | null;
  created_at: string;
}

interface CallScore {
  id: string;
  overall_score: number | null;
  overall_grade: string | null;
  version: string | null;
  created_at: string;
  ingestion_item_id: string;
  diagnosis_summary: string | null;
}

interface IngestionItem {
  id: string;
  transcript_metadata: {
    prospect_company?: string;
    prospect_name?: string;
    prospect_role?: string;
    call_stage?: string;
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [recentCalls, setRecentCalls] = useState<(CallScore & { ingestion_item?: IngestionItem })[]>([]);
  const [stats, setStats] = useState({ callsThisMonth: 0, avgScore: 0, patternsToImprove: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient();

        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          // Not logged in - redirect to login
          router.push('/login');
          return;
        }

        // Fetch user profile
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !userData) {
          console.error('Error fetching user:', error);
          router.push('/login');
          return;
        }

        setUser(userData as UserProfile);

        // Fetch user's call scores
        const { data: callScores, error: callsError } = await supabase
          .from('call_scores')
          .select(`
            id,
            overall_score,
            overall_grade,
            version,
            created_at,
            ingestion_item_id,
            diagnosis_summary
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (callsError) {
          console.error('Error fetching calls:', callsError);
        } else if (callScores && callScores.length > 0) {
          // Fetch ingestion items for metadata
          const ingestionIds = callScores.map(c => c.ingestion_item_id).filter(Boolean);
          const { data: ingestionItems } = await supabase
            .from('ingestion_items')
            .select('id, transcript_metadata')
            .in('id', ingestionIds);

          // Map ingestion items to call scores
          const callsWithMetadata = callScores.map(call => ({
            ...call,
            ingestion_item: ingestionItems?.find(i => i.id === call.ingestion_item_id) as IngestionItem | undefined
          }));

          setRecentCalls(callsWithMetadata);

          // Calculate stats
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const callsThisMonth = callScores.filter(c => new Date(c.created_at) >= startOfMonth).length;

          const scoresWithValues = callScores.filter(c => c.overall_score !== null);
          const avgScore = scoresWithValues.length > 0
            ? scoresWithValues.reduce((sum, c) => sum + (c.overall_score || 0), 0) / scoresWithValues.length
            : 0;

          // Count patterns to improve (calls with score < 7)
          const patternsToImprove = callScores.filter(c => (c.overall_score || 0) < 7).length;

          setStats({ callsThisMonth, avgScore: Math.round(avgScore * 10) / 10, patternsToImprove });
        }
      } catch (err) {
        console.error('Auth error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <p className="text-[#666] font-mono tracking-wider">LOADING DASHBOARD...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const planLabel = {
    solo: 'Solo Plan',
    team: 'Team Plan',
    lite: 'Free Plan',
  }[user.plan || 'lite'];

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader systemStatus="READY" />

        {/* User Header */}
        <ConsolePanel className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <ConsoleHeading level={2} variant="yellow">
                {user.first_name ? `WELCOME BACK, ${user.first_name.toUpperCase()}` : 'WELCOME BACK'}
              </ConsoleHeading>
              <p className="text-[#B3B3B3] font-poppins mt-1">
                {user.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 border-2 font-anton tracking-wider text-sm ${
                user.plan === 'team'
                  ? 'border-[#FFDE59] bg-[#FFDE59]/10 text-[#FFDE59]'
                  : user.plan === 'solo'
                  ? 'border-[#FFDE59] bg-[#FFDE59]/10 text-[#FFDE59]'
                  : 'border-[#333] text-[#666]'
              }`}>
                {planLabel.toUpperCase()}
              </div>
              <ConsoleButton
                variant="secondary"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? '...' : 'LOGOUT'}
              </ConsoleButton>
            </div>
          </div>
        </ConsolePanel>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Call Lab */}
          <ConsolePanel>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <ConsoleHeading level={3} variant="yellow">
                    CALL LAB {user.plan === 'solo' || user.plan === 'team' ? 'PRO' : 'LITE'}
                  </ConsoleHeading>
                  <p className="text-[#B3B3B3] font-poppins text-sm mt-1">
                    {user.plan === 'solo' || user.plan === 'team'
                      ? 'Full pattern analysis with tactical rewrites'
                      : 'Quick diagnostic snapshot of your calls'}
                  </p>
                </div>
              </div>
              <Link href="/call-lab">
                <ConsoleButton fullWidth>
                  ▶ ANALYZE A CALL
                </ConsoleButton>
              </Link>
            </div>
          </ConsolePanel>

          {/* Account */}
          <ConsolePanel>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">👤</div>
                <div>
                  <ConsoleHeading level={3} variant="yellow">
                    ACCOUNT
                  </ConsoleHeading>
                  <p className="text-[#B3B3B3] font-poppins text-sm mt-1">
                    {user.company_name || 'Manage your subscription and team'}
                  </p>
                </div>
              </div>
              <ConsoleButton variant="secondary" fullWidth disabled>
                COMING SOON
              </ConsoleButton>
            </div>
          </ConsolePanel>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ConsolePanel>
            <div className="text-center py-4">
              <div className="text-[#666] text-xs font-mono tracking-wider mb-2">
                CALLS ANALYZED
              </div>
              <div className="font-anton text-4xl text-white">
                {stats.callsThisMonth || '--'}
              </div>
              <div className="text-[#666] text-xs font-poppins mt-1">
                this month
              </div>
            </div>
          </ConsolePanel>

          <ConsolePanel>
            <div className="text-center py-4">
              <div className="text-[#666] text-xs font-mono tracking-wider mb-2">
                AVERAGE SCORE
              </div>
              <div className="font-anton text-4xl text-[#FFDE59]">
                {stats.avgScore || '--'}
              </div>
              <div className="text-[#666] text-xs font-poppins mt-1">
                out of 10
              </div>
            </div>
          </ConsolePanel>

          <ConsolePanel>
            <div className="text-center py-4">
              <div className="text-[#666] text-xs font-mono tracking-wider mb-2">
                CALLS TO REVIEW
              </div>
              <div className="font-anton text-4xl text-[#E51B23]">
                {stats.patternsToImprove || '--'}
              </div>
              <div className="text-[#666] text-xs font-poppins mt-1">
                score {"<"} 7
              </div>
            </div>
          </ConsolePanel>
        </div>

        {/* Recent Calls */}
        <ConsolePanel>
          <ConsoleHeading level={3} variant="yellow" className="mb-4">
            RECENT CALLS
          </ConsoleHeading>
          {recentCalls.length > 0 ? (
            <div className="space-y-3">
              {recentCalls.map((call) => {
                const metadata = call.ingestion_item?.transcript_metadata;
                const prospectName = metadata?.prospect_name || metadata?.prospect_company || 'Unknown Prospect';
                const callDate = new Date(call.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const scoreColor = (call.overall_score || 0) >= 7
                  ? 'text-[#4ADE80]'
                  : (call.overall_score || 0) >= 5
                  ? 'text-[#FFDE59]'
                  : 'text-[#E51B23]';

                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border border-[#333] hover:border-[#FFDE59] transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/call-lab/result/${call.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-anton ${scoreColor}`}>
                        {call.overall_score ?? '--'}
                      </div>
                      <div>
                        <div className="text-white font-poppins font-medium">
                          {prospectName}
                        </div>
                        <div className="text-[#666] text-xs font-mono">
                          {metadata?.prospect_role && <span>{metadata.prospect_role} • </span>}
                          {callDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-mono tracking-wider ${
                        call.version === 'pro'
                          ? 'bg-[#FFDE59]/20 text-[#FFDE59] border border-[#FFDE59]'
                          : 'bg-[#333] text-[#666]'
                      }`}>
                        {(call.version || 'lite').toUpperCase()}
                      </span>
                      <span className="text-[#666]">→</span>
                    </div>
                  </div>
                );
              })}
              <Link href="/call-lab" className="block mt-4">
                <ConsoleButton fullWidth variant="secondary">
                  + ANALYZE ANOTHER CALL
                </ConsoleButton>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12 border border-[#333] border-dashed">
              <div className="text-4xl mb-4 opacity-30">📞</div>
              <p className="text-[#666] font-poppins mb-4">
                No calls analyzed yet. Start by analyzing your first call!
              </p>
              <Link href="/call-lab">
                <ConsoleButton>
                  ▶ ANALYZE YOUR FIRST CALL
                </ConsoleButton>
              </Link>
            </div>
          )}
        </ConsolePanel>

        {/* Upgrade CTA for non-pro users */}
        {(!user.plan || user.plan === 'lite') && (
          <ConsolePanel variant="red-highlight" className="mt-6">
            <div className="text-center space-y-4">
              <ConsoleHeading level={2} variant="yellow">
                UNLOCK CALL LAB PRO
              </ConsoleHeading>
              <p className="text-[#B3B3B3] font-poppins max-w-lg mx-auto">
                Get full pattern analysis, tactical rewrites, trust curve mapping, and 47 named sales patterns to level up your closing game.
              </p>
              <Link href="/call-lab-pro">
                <ConsoleButton>
                  [ UPGRADE TO PRO ]
                </ConsoleButton>
              </Link>
            </div>
          </ConsolePanel>
        )}
      </div>
    </div>
  );
}
