'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import Link from 'next/link';
import type { ClientEnrollment, ClientProgram } from '@/types/client';

interface DashboardData {
  enrollment: ClientEnrollment & { program: ClientProgram };
  company: { company_name: string; industry_niche: string | null } | null;
  hasFiveMinuteFriday: boolean;
  hasCallLabPro: boolean;
  pendingFriday: boolean;
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Get enrollment with program
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('*, program:client_programs(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment) { router.push('/client/login'); return; }
      if (!enrollment.onboarding_completed) { router.push('/client/onboarding'); return; }

      // Get company info
      const { data: company } = await supabase
        .from('client_companies')
        .select('company_name, industry_niche')
        .eq('enrollment_id', enrollment.id)
        .single();

      // Check if Friday submission exists for this week
      const now = new Date();
      const friday = new Date(now);
      friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
      if (friday < now) friday.setDate(friday.getDate() + 7);
      const fridayStr = friday.toISOString().split('T')[0];

      const { data: existingFriday } = await supabase
        .from('five_minute_fridays')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_of', fridayStr)
        .single();

      const program = enrollment.program as any;
      setData({
        enrollment: enrollment as any,
        company,
        hasFiveMinuteFriday: program?.has_five_minute_friday || false,
        hasCallLabPro: enrollment.leads_sales_calls || program?.has_call_lab_pro || false,
        pendingFriday: !existingFriday && program?.has_five_minute_friday,
      });
      setLoading(false);
    }
    loadDashboard();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/client/login');
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  const tools = [
    {
      name: 'Call Lab',
      description: 'Analyze your sales calls with AI-powered insights',
      href: '/call-lab',
      available: true,
      color: '#E51B23',
    },
    {
      name: 'Call Lab Pro',
      description: 'Advanced multi-layer call analysis with pattern detection',
      href: '/call-lab/pro',
      available: data.hasCallLabPro,
      color: '#E51B23',
      badge: 'PRO',
    },
    {
      name: 'Discovery Lab',
      description: 'Research prospects and competitors with AI',
      href: '/discovery-lab',
      available: true,
      color: '#FFDE59',
    },
    {
      name: 'Content Lab',
      description: 'Generate positioning and visibility content',
      href: '/visibility-lab',
      available: true,
      color: '#FFDE59',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Image src="/logos/trios-logo-sq-transparent.png" alt="TriOS" width={80} height={80} />
          </div>
          <button onClick={handleLogout}
            className="text-[#666666] hover:text-white text-sm border border-[#333333] px-4 py-2 transition-colors">
            Logout
          </button>
        </div>

        {/* Welcome */}
        <div className="mb-8 border-l-4 border-[#E51B23] pl-6">
          <h1 className="text-3xl md:text-4xl font-anton uppercase text-[#FFDE59] mb-1">
            {data.company?.company_name || 'Your Dashboard'}
          </h1>
          <p className="text-[#666666]">
            {data.enrollment.program?.name} &middot; {data.company?.industry_niche || 'Client Portal'}
          </p>
        </div>

        {/* 5-Minute Friday Alert */}
        {data.pendingFriday && (
          <Link href="/client/five-minute-friday"
            className="block mb-8 bg-[#E51B23] border-2 border-[#FFDE59] p-6 hover:bg-red-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-anton uppercase text-[#FFDE59]">5-Minute Friday</h3>
                <p className="text-white text-sm mt-1">Your weekly check-in is due. Takes less than 5 minutes.</p>
              </div>
              <span className="text-[#FFDE59] text-2xl font-anton">&rarr;</span>
            </div>
          </Link>
        )}

        {/* Tools Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-anton uppercase text-[#E51B23] mb-6">Your Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <div key={tool.name} className={`border ${tool.available ? 'border-[#333333] hover:border-[#E51B23]' : 'border-[#222222] opacity-50'} p-6 transition-colors ${tool.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                {tool.available ? (
                  <Link href={tool.href} className="block">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-anton text-lg uppercase" style={{ color: tool.color }}>
                          {tool.name}
                        </h3>
                        <p className="text-[#999999] text-sm mt-1">{tool.description}</p>
                      </div>
                      {tool.badge && (
                        <span className="bg-[#E51B23] text-white text-[10px] font-bold px-2 py-1 tracking-wider">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-anton text-lg uppercase text-[#555555]">{tool.name}</h3>
                        <p className="text-[#444444] text-sm mt-1">{tool.description}</p>
                      </div>
                      <span className="text-[#444444] text-[10px] font-bold px-2 py-1 border border-[#333333]">LOCKED</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {data.hasFiveMinuteFriday && (
            <Link href="/client/five-minute-friday/history"
              className="border border-[#333333] p-4 hover:border-[#FFDE59] transition-colors">
              <h3 className="font-anton text-sm uppercase text-[#FFDE59]">Friday Check-ins</h3>
              <p className="text-[#666666] text-xs mt-1">View your weekly submissions & feedback</p>
            </Link>
          )}
          <Link href="/client/content"
            className="border border-[#333333] p-4 hover:border-[#FFDE59] transition-colors">
            <h3 className="font-anton text-sm uppercase text-[#FFDE59]">Resource Library</h3>
            <p className="text-[#666666] text-xs mt-1">Videos, decks, and program materials</p>
          </Link>
          <Link href="/settings"
            className="border border-[#333333] p-4 hover:border-[#FFDE59] transition-colors">
            <h3 className="font-anton text-sm uppercase text-[#FFDE59]">Settings</h3>
            <p className="text-[#666666] text-xs mt-1">Account and preferences</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
