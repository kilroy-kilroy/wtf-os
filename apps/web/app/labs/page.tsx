import { createAuthServerClient } from '@/lib/supabase-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSubscriptionStatus } from '@/lib/subscription';

interface Lab {
  name: string;
  description: string;
  href: string;
  tier: 'Free' | 'Pro';
  icon: string;
  color: string;
  product: 'call-lab' | 'discovery-lab';
}

const allLabs: Lab[] = [
  {
    name: 'Call Lab',
    description: 'Analyze your sales calls and get actionable coaching feedback.',
    href: '/call-lab',
    tier: 'Free',
    icon: '📞',
    color: '#E51B23',
    product: 'call-lab',
  },
  {
    name: 'Call Lab Pro',
    description: 'Deep-dive analysis with pattern recognition, coaching reports, and performance tracking.',
    href: '/call-lab/pro',
    tier: 'Pro',
    icon: '🎯',
    color: '#FFDE59',
    product: 'call-lab',
  },
  {
    name: 'Discovery Lab',
    description: 'Pre-call intelligence briefs with questions, hooks, and authority positioning.',
    href: '/discovery-lab',
    tier: 'Free',
    icon: '🔍',
    color: '#E51B23',
    product: 'discovery-lab',
  },
  {
    name: 'Discovery Lab Pro',
    description: 'Full research layer: market intel, company analysis, contact research, and conversation playbooks.',
    href: '/discovery-lab-pro/create',
    tier: 'Pro',
    icon: '🧠',
    color: '#FFDE59',
    product: 'discovery-lab',
  },
];

export default async function LabsPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get subscription status using centralized utility
  const subscriptionStatus = await getSubscriptionStatus(
    supabase as any,
    user.id,
    user.email || ''
  );

  const hasCallLabPro = subscriptionStatus.hasCallLabPro;
  const hasDiscoveryLabPro = subscriptionStatus.hasDiscoveryLabPro;

  // Filter labs based on subscription
  // If user has Pro for a product, show only the Pro version
  // If user doesn't have Pro, show only the Free version
  const filteredLabs = allLabs.filter((lab) => {
    if (lab.product === 'call-lab') {
      if (hasCallLabPro) {
        return lab.tier === 'Pro';
      } else {
        return lab.tier === 'Free';
      }
    }
    if (lab.product === 'discovery-lab') {
      if (hasDiscoveryLabPro) {
        return lab.tier === 'Pro';
      } else {
        return lab.tier === 'Free';
      }
    }
    return true;
  });

  // Determine upsell recommendation
  let upsellLab: Lab | null = null;
  if (hasCallLabPro && !hasDiscoveryLabPro) {
    upsellLab = allLabs.find(l => l.name === 'Discovery Lab Pro') || null;
  } else if (hasDiscoveryLabPro && !hasCallLabPro) {
    upsellLab = allLabs.find(l => l.name === 'Call Lab Pro') || null;
  }

  const userName =
    user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-black py-8 px-4 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border border-[#E51B23] rounded-lg px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-anton text-3xl tracking-wide uppercase">
                <span className="text-white">SALES</span>
                <span className="text-[#E51B23]">OS</span>
              </div>
              <div className="font-anton text-xs text-[#FFDE59] uppercase mt-1">
                YOUR LABS
              </div>
              <div className="mt-4">
                <div className="font-anton text-lg text-[#FFDE59] uppercase">
                  Welcome back, {userName}
                </div>
                <div className="text-sm text-[#B3B3B3]">{user.email}</div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Link
                href="/dashboard"
                className="font-anton text-xs uppercase border border-[#333] text-white px-3 py-1 rounded hover:border-[#E51B23] transition"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="font-anton text-xs uppercase border border-[#333] text-white px-3 py-1 rounded hover:border-[#E51B23] transition"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Your Labs Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Your Labs
            </h2>
            <div className="flex-1 border-t border-[#333]" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {filteredLabs.map((lab) => (
              <Link
                key={lab.name}
                href={lab.href}
                className="group border border-[#333] rounded-lg p-6 hover:border-[#E51B23] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{lab.icon}</span>
                  <span
                    className="font-anton text-xs uppercase px-2 py-1 rounded"
                    style={{
                      backgroundColor:
                        lab.tier === 'Pro' ? '#FFDE59' : 'transparent',
                      color: lab.tier === 'Pro' ? '#000' : '#666',
                      border:
                        lab.tier === 'Pro' ? 'none' : '1px solid #333',
                    }}
                  >
                    {lab.tier}
                  </span>
                </div>

                <h3
                  className="font-anton text-xl uppercase tracking-wide mb-2 group-hover:text-[#E51B23] transition"
                  style={{ color: lab.color }}
                >
                  {lab.name}
                </h3>

                <p className="text-sm text-[#B3B3B3] leading-relaxed">
                  {lab.description}
                </p>

                <div className="mt-4 flex items-center text-[#E51B23] font-anton text-sm uppercase">
                  Launch →
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recommended Section */}
        {upsellLab && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-anton text-lg text-[#666] uppercase tracking-wider">
                Recommended
              </h2>
              <div className="flex-1 border-t border-[#333]" />
            </div>

            <Link
              href={upsellLab.href.replace('/welcome', '')}
              className="group block border border-[#333] rounded-lg p-6 hover:border-[#FFDE59] transition-all duration-200 bg-[#FFDE59]/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{upsellLab.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-anton text-xl uppercase tracking-wide text-[#FFDE59] group-hover:text-white transition">
                        {upsellLab.name}
                      </h3>
                      <span className="font-anton text-xs uppercase px-2 py-1 rounded bg-[#FFDE59] text-black">
                        Pro
                      </span>
                    </div>
                    <p className="text-sm text-[#B3B3B3] leading-relaxed max-w-lg">
                      {upsellLab.description}
                    </p>
                  </div>
                </div>
                <span className="font-anton text-sm text-[#FFDE59] uppercase whitespace-nowrap">
                  Learn More →
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div className="border-t border-[#333] pt-6 flex justify-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-[#666] hover:text-white transition"
          >
            View Dashboard
          </Link>
          <Link
            href="/settings"
            className="text-sm text-[#666] hover:text-white transition"
          >
            Settings
          </Link>
          {!hasCallLabPro && !hasDiscoveryLabPro && (
            <Link
              href="/call-lab-pro/checkout"
              className="text-sm text-[#FFDE59] hover:text-white transition"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
