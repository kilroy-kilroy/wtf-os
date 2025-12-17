'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function UpgradeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Preparing your upgrade...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initiateCheckout = async () => {
      try {
        const coupon = searchParams.get('coupon');
        const plan = searchParams.get('plan') || 'solo';

        // Get user email if logged in
        const supabase = createClientComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        setStatus('Redirecting to checkout...');

        // Call checkout API
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceType: plan,
            email: user?.email,
            coupon: coupon || undefined,
          }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        setError('Something went wrong. Please try again.');
      }
    };

    initiateCheckout();
  }, [searchParams]);

  return (
    <div className="text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-bold text-[#E51B23] mb-4">Oops!</h1>
          <p className="text-[#B3B3B3] mb-6">{error}</p>
          <a
            href="/call-lab-pro"
            className="inline-block bg-[#E51B23] text-white px-6 py-3 rounded font-bold hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Try Again
          </a>
        </>
      ) : (
        <>
          <div className="animate-spin w-8 h-8 border-2 border-[#FFDE59] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#B3B3B3]">{status}</p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#FFDE59] border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-[#B3B3B3]">Loading...</p>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <Suspense fallback={<LoadingFallback />}>
        <UpgradeContent />
      </Suspense>
    </div>
  );
}
