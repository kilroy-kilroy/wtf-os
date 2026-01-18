import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSubscriptionStatus } from '@/lib/subscription';
import ChangePasswordButton from '@/components/ChangePasswordButton';
import { FirefliesIntegration } from '@/components/FirefliesIntegration';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's profile info
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('first_name, last_name, full_name')
    .eq('id', user.id)
    .single();

  const firstName = userData?.first_name || userData?.full_name?.split(' ')[0] || '';
  const lastName = userData?.last_name || userData?.full_name?.split(' ').slice(1).join(' ') || '';

  // Get subscription status using centralized utility
  const subscriptionStatus = await getSubscriptionStatus(
    supabase as any,
    user.id,
    user.email || ''
  );

  // Build list of active products
  const activeProducts: string[] = [];
  if (subscriptionStatus.hasCallLabPro) activeProducts.push('Call Lab Pro');
  if (subscriptionStatus.hasDiscoveryLabPro) activeProducts.push('Discovery Lab Pro');

  const planName = activeProducts.length > 0 ? activeProducts.join(' + ') : 'Free';
  const isPro = subscriptionStatus.hasCallLabPro || subscriptionStatus.hasDiscoveryLabPro;

  return (
    <div className="min-h-screen bg-black py-8 px-4 text-white">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-anton text-2xl tracking-wide uppercase">
              <span className="text-white">SALES</span>
              <span className="text-[#E51B23]">OS</span>
            </div>
            <div className="font-anton text-xs text-[#FFDE59] uppercase mt-1">
              SETTINGS
            </div>
          </div>
          <Link
            href="/labs"
            className="font-anton text-xs uppercase border border-[#333] text-white px-3 py-1 rounded hover:border-[#E51B23] transition"
          >
            Back to Labs
          </Link>
        </div>

        {/* Account Section */}
        <div className="border border-[#333] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333] bg-[#111]">
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Account
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  defaultValue={firstName}
                  placeholder="Enter first name"
                  className="w-full bg-black border border-[#333] rounded px-4 py-2 text-white placeholder-[#666] focus:border-[#E51B23] focus:outline-none"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  defaultValue={lastName}
                  placeholder="Enter last name"
                  className="w-full bg-black border border-[#333] rounded px-4 py-2 text-white placeholder-[#666] focus:border-[#E51B23] focus:outline-none"
                  disabled
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email || ''}
                className="w-full bg-black border border-[#333] rounded px-4 py-2 text-[#B3B3B3] cursor-not-allowed"
                disabled
              />
              <p className="text-xs text-[#666] mt-1">
                Contact support to change your email address.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
                Password
              </label>
              <ChangePasswordButton email={user.email || ''} />
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="border border-[#333] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333] bg-[#111]">
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Subscription
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
                  Current Plan
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-anton text-xl text-white uppercase">
                    {planName}
                  </span>
                  {isPro && (
                    <span className="bg-[#FFDE59] text-black text-xs font-anton uppercase px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
              </div>
              {!isPro && (
                <Link
                  href="/call-lab-pro/checkout"
                  className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>

            {/* Billing Info (only show for Pro users) */}
            {isPro && (
              <>
                <div className="border-t border-[#333] pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
                        Billing Cycle
                      </label>
                      <span className="text-white">Monthly</span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
                        Next Renewal
                      </label>
                      <span className="text-white">--</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#333] pt-6">
                  <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
                    Payment Method
                  </label>
                  <a
                    href="https://billing.stripe.com/p/login/test" // Replace with actual Stripe portal URL
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[#333] rounded px-4 py-2 text-white hover:border-[#E51B23] transition text-sm"
                  >
                    Manage in Stripe
                    <span className="text-[#666]">→</span>
                  </a>
                  <p className="text-xs text-[#666] mt-1">
                    Update payment method, view invoices, or cancel subscription.
                  </p>
                </div>
              </>
            )}

            {/* Free tier CTA */}
            {!isPro && (
              <div className="border-t border-[#333] pt-6">
                <div className="bg-[#FFDE59]/5 border border-[#FFDE59]/20 rounded-lg p-4">
                  <h3 className="font-anton text-[#FFDE59] uppercase mb-2">
                    Unlock Call Lab Pro
                  </h3>
                  <p className="text-sm text-[#B3B3B3] mb-4">
                    Get pattern recognition, coaching reports, performance tracking, and more.
                  </p>
                  <Link
                    href="/call-lab-pro/checkout"
                    className="inline-block bg-[#FFDE59] text-black px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#FFE87A] transition-colors"
                  >
                    Upgrade Now
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integrations Section (Phase 2 Stub) */}
        <div className="border border-[#333] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333] bg-[#111]">
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Integrations
            </h2>
            <p className="text-xs text-[#666] mt-1">Connect your tools for automatic call imports</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Fireflies */}
            <FirefliesIntegration />

            {/* Zoom */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#111] border border-[#333] rounded flex items-center justify-center">
                  <span className="text-lg">📹</span>
                </div>
                <div>
                  <span className="text-white font-medium">Zoom</span>
                  <p className="text-xs text-[#666]">Import recordings directly</p>
                </div>
              </div>
              <button
                className="border border-[#333] rounded px-3 py-1.5 text-[#666] text-sm cursor-not-allowed"
                disabled
              >
                Coming Soon
              </button>
            </div>

            <p className="text-xs text-[#666] text-center pt-4">
              More integrations coming soon. Have a request?{' '}
              <a href="mailto:support@salesos.com" className="text-[#FFDE59] hover:underline">
                Let us know
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#333] pt-6 flex justify-center gap-6 text-sm text-[#666]">
          <Link href="/labs" className="hover:text-white transition">
            Your Labs
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-white transition">
            Dashboard
          </Link>
          <span>•</span>
          <a href="mailto:support@salesos.com" className="hover:text-white transition">
            Support
          </a>
        </div>
      </div>
    </div>
  );
}
