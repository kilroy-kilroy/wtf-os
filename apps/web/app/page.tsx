'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check for auth tokens in the URL hash (from Supabase email links)
    const handleAuthRedirect = async () => {
      const hash = window.location.hash;

      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');

        if (type === 'recovery') {
          // Password recovery - redirect to reset password page
          router.push(`/auth/reset-password${hash}`);
          return;
        }

        // Other auth types (signup confirmation, etc.)
        // Supabase client will handle setting the session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          router.push('/labs');
          return;
        }
      }

      setChecking(false);
    };

    handleAuthRedirect();
  }, [router, supabase.auth]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white font-anton text-xl tracking-wide">
          AUTHENTICATING...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-6 p-8">
        <div className="font-anton text-6xl tracking-wide uppercase">
          <span className="text-white">SALES</span>
          <span className="text-[#E51B23]">OS</span>
        </div>
        <p className="text-xl text-[#B3B3B3]">
          AI-Powered Sales Intelligence
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/labs"
            className="px-6 py-3 bg-[#E51B23] hover:bg-[#FFDE59] hover:text-black text-white font-anton tracking-wide rounded transition-colors"
          >
            ENTER LABS
          </a>
          <a
            href="/login"
            className="px-6 py-3 bg-transparent border border-[#333] hover:border-[#E51B23] text-white font-anton tracking-wide rounded transition-colors"
          >
            LOGIN
          </a>
        </div>
      </div>
    </main>
  );
}
