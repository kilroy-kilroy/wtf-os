'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import OnboardingWizard from '@/components/client/onboarding/OnboardingWizard';

export default function ClientOnboardingPage() {
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkEnrollment() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/client/login');
        return;
      }

      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('id, onboarding_completed')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment) {
        router.push('/client/login');
        return;
      }

      if (enrollment.onboarding_completed) {
        router.push('/client/dashboard');
        return;
      }

      setEnrollmentId(enrollment.id);
      setLoading(false);
    }

    checkEnrollment();
  }, [router, supabase]);

  if (loading || !enrollmentId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return <OnboardingWizard enrollmentId={enrollmentId} />;
}
