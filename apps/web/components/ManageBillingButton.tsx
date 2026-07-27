'use client';

import { useState } from 'react';

/**
 * Opens the Stripe Billing Portal.
 *
 * The session has to be minted on click rather than baked into an href at
 * render time: portal session URLs are single-use and expire quickly, so a link
 * built during SSR would be dead by the time anyone clicked it.
 */
export default function ManageBillingButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Could not open the billing portal. Please try again.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Could not open the billing portal. Please try again.');
      setIsLoading(false);
    }
    // Deliberately no `finally`: on success the browser is navigating away, and
    // flipping back to "Manage in Stripe" mid-redirect just invites a second
    // click that burns another session.
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 border border-[#333] rounded px-4 py-2 text-white hover:border-[#E51B23] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Opening Stripe...' : 'Manage in Stripe'}
        {!isLoading && <span className="text-[#666]">→</span>}
      </button>
      <p className="text-xs text-[#666] mt-1">
        Update payment method, view invoices, or cancel subscription.
      </p>
      {error && <p className="text-xs mt-2 text-[#E51B23]">{error}</p>}
    </div>
  );
}
